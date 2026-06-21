import os
import uuid
import tempfile
import hashlib
import traceback
import io as _io
import soundfile as sf
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, VoiceProfile, VoiceSample
from app.routers.auth import get_current_user
from app.config import settings
from app.services.auth_service import get_supabase_client

studio_router = APIRouter(prefix="/studio", tags=["Studio"])

def _extract_audio_from_url(url: str, output_path: str):
    import yt_dlp
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'outtmpl': output_path.replace('.wav', ''),
        'quiet': True,
        'no_warnings': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    
    # yt-dlp appends .wav to the outtmpl when using FFmpegExtractAudio
    if not os.path.exists(output_path) and os.path.exists(output_path.replace('.wav', '') + '.wav'):
        # It's already correct since outtmpl has no .wav, yt-dlp adds it.
        pass

def _convert_to_wav(input_path: str, output_path: str):
    from pydub import AudioSegment
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(24000)
    audio.export(output_path, format="wav")

@studio_router.post("/auto-profile")
async def auto_create_profile(
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Voice Profile automatically by downloading/extracting audio
    from a URL or uploaded media file.
    """
    if not url and not file:
        raise HTTPException(400, "Provide either a URL or a file.")

    # 1. Create a dummy Voice Profile first
    new_profile = VoiceProfile(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        name=f"Auto-Voice-{str(uuid.uuid4())[:6]}",
        description="Auto-generated voice profile from Studio.",
        status="active",
        base_model="chatterbox-turbo"
    )
    db.add(new_profile)
    await db.commit()

    # 2. Extract media
    with tempfile.TemporaryDirectory() as tmpdir:
        final_wav_path = os.path.join(tmpdir, "final.wav")
        
        try:
            if url:
                # yt-dlp saves to tmpdir/final.wav because we use outtmpl=tmpdir/final
                _extract_audio_from_url(url, final_wav_path)
            elif file:
                raw_path = os.path.join(tmpdir, file.filename or "uploaded_media")
                with open(raw_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                _convert_to_wav(raw_path, final_wav_path)
                
            if not os.path.exists(final_wav_path):
                raise Exception("Audio extraction failed to produce a .wav file")
                
            # Read final audio
            with open(final_wav_path, "rb") as f:
                audio_bytes = f.read()
                
            audio_info = sf.info(_io.BytesIO(audio_bytes))
            duration = audio_info.duration
            
            if duration < settings.MIN_SAMPLE_DURATION_SEC:
                raise HTTPException(400, f"Extracted audio too short ({duration:.1f}s)")
                
            file_hash = hashlib.sha256(audio_bytes).hexdigest()
            storage_key = f"samples/{current_user.id}/{new_profile.id}/{uuid.uuid4()}.wav"
            
            # Upload to Supabase
            sb = get_supabase_client()
            sb.storage.from_(settings.STORAGE_BUCKET).upload(
                storage_key, audio_bytes, file_options={"content-type": "audio/wav"}
            )
            
            # Create Voice Sample
            sample = VoiceSample(
                id=str(uuid.uuid4()),
                voice_profile_id=new_profile.id,
                file_name="auto_extracted.wav",
                storage_key=storage_key,
                duration_sec=duration,
                file_size_bytes=len(audio_bytes),
                file_hash=file_hash,
                status="ready"
            )
            db.add(sample)
            await db.commit()
            
            return {
                "voice_profile_id": new_profile.id,
                "voice_profile_name": new_profile.name,
                "duration": duration,
                "message": "Auto-profile created successfully."
            }

        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(500, f"Error processing media: {e}")
