"""Vocaria Generation Router — Sync + Async endpoints"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid, logging

from app.database import get_db
from app.models import (
    User, VoiceProfile, GenerationJob, JobStatus,
    AuditLog, AuditAction, UsageRecord, Notification, NotificationType
)
from app.services.auth_service import get_current_user
from app.services.entitlement_service import check_generation_quota
from app.config import settings
from app.utils.storage import get_storage

router = APIRouter()
logger = logging.getLogger(__name__)


class GenerationRequest(BaseModel):
    text: str
    voice_profile_id: Optional[str] = None
    language: str = "en"
    emotion: str = "neutral"
    speaking_style: Optional[str] = None
    speed: float = 1.0
    pitch: float = 1.0
    temperature: float = 0.7
    output_format: str = "wav"
    use_ssml: bool = False
    # Extended fields for Kokoro voice preset selection
    gender: str = "Female"
    age: str = "Young Adult"
    accent: str = "American"
    voice_preset: Optional[str] = None  # Direct Kokoro preset override
    # Model selection: "kokoro-82m" (default) or "chatterbox-turbo"
    model: str = "kokoro-82m"
    # Chatterbox-specific parameters
    exaggeration: float = 0.5  # Emotion intensity (0.0-1.0)
    cfg_weight: float = 0.5    # Pacing/stability (0.0-1.0)


# ── Async endpoint (queues to Celery) ────────────────────────────────────────
@router.post("/", status_code=201)
async def generate_speech(
    body: GenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "text is required")
    if len(text) > settings.TTS_MAX_TEXT_LENGTH:
        raise HTTPException(400, f"Text too long (max {settings.TTS_MAX_TEXT_LENGTH} chars)")

    await check_generation_quota(current_user, len(text), db)

    voice_profile = None
    if body.voice_profile_id:
        result = await db.execute(select(VoiceProfile).where(VoiceProfile.id == body.voice_profile_id))
        voice_profile = result.scalar_one_or_none()
        if not voice_profile:
            raise HTTPException(404, "Voice profile not found")
        if voice_profile.owner_id != current_user.id and voice_profile.visibility == "private":
            raise HTTPException(403, "Cannot use private voice")

    job = GenerationJob(
        user_id=current_user.id, voice_profile_id=body.voice_profile_id,
        status=JobStatus.QUEUED, text=text, language=body.language,
        emotion=body.emotion, speaking_style=body.speaking_style,
        speed=body.speed, pitch=body.pitch, temperature=body.temperature,
        output_format=body.output_format, use_ssml=body.use_ssml,
        character_count=len(text),
        extra_metadata={
            "gender": body.gender, "age": body.age, "accent": body.accent,
            "voice_preset": body.voice_preset, "model": body.model,
            "exaggeration": body.exaggeration, "cfg_weight": body.cfg_weight,
        },
    )
    db.add(job)
    db.add(AuditLog(user_id=current_user.id, action=AuditAction.GENERATION_START,
                    resource_type="generation_job", details={"chars": len(text), "lang": body.language, "model": body.model}))
    await db.commit()
    await db.refresh(job)

    try:
        from app.workers.generation_tasks import run_generation_task
        task = run_generation_task.delay(job.id, current_user.id)
        job.celery_task_id = task.id
        await db.commit()
        return {"job_id": job.id, "status": "queued", "character_count": len(text)}
    except Exception as e:
        logger.warning(f"Celery task failed to queue ({e}), running sync generation")
        # Fall through to sync generation
        return await _run_sync_generation(job, current_user, body, db)


# ── Sync endpoint (generates immediately, no Celery needed) ──────────────────
@router.post("/sync", status_code=201)
async def generate_speech_sync(
    body: GenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Synchronous voice generation — generates audio inline and returns immediately.
    No Celery/Redis dependency. Ideal for development and low-latency use cases.
    """
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "text is required")
    if len(text) > settings.TTS_MAX_TEXT_LENGTH:
        raise HTTPException(400, f"Text too long (max {settings.TTS_MAX_TEXT_LENGTH} chars)")

    await check_generation_quota(current_user, len(text), db)

    voice_profile = None
    if body.voice_profile_id:
        result = await db.execute(select(VoiceProfile).where(VoiceProfile.id == body.voice_profile_id))
        voice_profile = result.scalar_one_or_none()
        if not voice_profile:
            raise HTTPException(404, "Voice profile not found")
        if voice_profile.owner_id != current_user.id and voice_profile.visibility == "private":
            raise HTTPException(403, "Cannot use private voice")

    job = GenerationJob(
        user_id=current_user.id, voice_profile_id=body.voice_profile_id,
        status=JobStatus.QUEUED, text=text, language=body.language,
        emotion=body.emotion, speaking_style=body.speaking_style,
        speed=body.speed, pitch=body.pitch, temperature=body.temperature,
        output_format=body.output_format, use_ssml=body.use_ssml,
        character_count=len(text),
        extra_metadata={
            "gender": body.gender, "age": body.age, "accent": body.accent,
            "voice_preset": body.voice_preset, "model": body.model,
            "exaggeration": body.exaggeration, "cfg_weight": body.cfg_weight,
        },
    )
    db.add(job)
    db.add(AuditLog(user_id=current_user.id, action=AuditAction.GENERATION_START,
                    resource_type="generation_job", details={"chars": len(text), "lang": body.language, "model": body.model}))
    await db.commit()
    await db.refresh(job)

    try:
        return await _run_sync_generation(job, current_user, body, db)
    except Exception as e:
        import traceback
        with open("crash.txt", "w") as f:
            traceback.print_exc(file=f)
        raise e


async def _run_sync_generation(
    job: GenerationJob,
    current_user: User,
    body: GenerationRequest,
    db: AsyncSession,
) -> dict:
    """Execute generation synchronously and return the completed job."""
    import time
    start_time = time.time()

    try:
        # Update status
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        await db.commit()

        # Run TTS pipeline — route to correct engine based on model selection
        selected_model = (job.extra_metadata or {}).get("model", "kokoro-82m")

        if selected_model == "chatterbox-turbo":
            from app.ml.tts_pipeline import get_chatterbox_pipeline
            tts = get_chatterbox_pipeline()
            
            # Fetch the voice profile's reference audio if a voice is selected
            reference_audio_path = None
            if body.voice_preset:
                result = await db.execute(select(VoiceProfile).where(VoiceProfile.id == body.voice_preset))
                vp = result.scalar_one_or_none()
                if vp and vp.embedding_path:
                    # Download the reference audio to a temp file
                    storage = await get_storage()
                    try:
                        content = await storage.download(settings.BUCKET_SAMPLES, vp.embedding_path)
                        import tempfile
                        import os
                        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                            f.write(content)
                            reference_audio_path = f.name
                    except Exception as e:
                        logger.error(f"Failed to fetch reference audio for Chatterbox: {e}")

            try:
                audio_bytes, sr = await tts.synthesize(
                    text=job.text,
                    speaker_wav=reference_audio_path,
                    exaggeration=body.exaggeration,
                    cfg_weight=body.cfg_weight,
                    temperature=body.temperature or 0.8,
                    output_format=job.output_format or "wav",
                )
            finally:
                if reference_audio_path:
                    import os
                    try:
                        os.unlink(reference_audio_path)
                    except Exception:
                        pass
        else:
            from app.ml.tts_pipeline import get_tts_pipeline
            tts = get_tts_pipeline()
            audio_bytes, sr = await tts.synthesize(
                text=job.text,
                language=job.language or "en",
                emotion=job.emotion or "neutral",
                speed=job.speed or 1.0,
                temperature=job.temperature or 0.7,
                output_format=job.output_format or "wav",
                gender=body.gender,
                accent=body.accent,
                age=body.age,
                voice_id=body.voice_preset,
            )

        if not audio_bytes or len(audio_bytes) < 100:
            raise RuntimeError("Generated audio is empty or too small")

        # Get duration
        try:
            import soundfile as sf
            import io as _io
            info = sf.info(_io.BytesIO(audio_bytes))
            duration = info.duration
        except Exception:
            duration = len(job.text) * 0.06  # rough estimate

        # Store output
        storage = await get_storage()
        storage_key = f"outputs/{current_user.id}/{uuid.uuid4()}.{job.output_format or 'wav'}"
        await storage.upload(settings.BUCKET_OUTPUTS, storage_key, audio_bytes, f"audio/{job.output_format or 'wav'}")

        # Generate presigned URL
        output_url = await storage.presigned_url(settings.BUCKET_OUTPUTS, storage_key, expires_hours=24)

        # Update job as completed
        processing_time = time.time() - start_time
        job.status = JobStatus.COMPLETED
        job.progress = 1.0
        job.output_storage_key = storage_key
        job.output_url = output_url
        job.duration_seconds = round(duration, 3)
        job.file_size_bytes = len(audio_bytes)
        job.sample_rate = sr
        job.completed_at = datetime.now(timezone.utc)

        # Update usage record
        month_year = datetime.now().strftime("%Y-%m")
        existing = await db.execute(select(UsageRecord).where(
            UsageRecord.user_id == current_user.id,
            UsageRecord.month_year == month_year,
            UsageRecord.resource_type == "generation_chars"
        ))
        ur = existing.scalar_one_or_none()
        if ur:
            ur.quantity += len(job.text)
        else:
            db.add(UsageRecord(
                user_id=current_user.id, month_year=month_year,
                resource_type="generation_chars", quantity=len(job.text)
            ))

        # Audit log completion
        db.add(AuditLog(
            user_id=current_user.id, action=AuditAction.GENERATION_COMPLETE,
            resource_type="generation_job", resource_id=job.id,
            details={
                "duration_seconds": round(duration, 3),
                "processing_time_seconds": round(processing_time, 3),
                "file_size_bytes": len(audio_bytes),
                "model": selected_model,
                "voice_preset": body.voice_preset or "auto",
            }
        ))

        # Notification
        db.add(Notification(
            user_id=current_user.id, type=NotificationType.SUCCESS,
            title="Generation Complete 🔊",
            message=f"Your {duration:.1f}s audio is ready.",
            action_url=f"/history/generation/{job.id}"
        ))

        await db.commit()

        logger.info(f"✅ Sync generation {job.id} complete: {duration:.1f}s audio in {processing_time:.1f}s")

        return {
            "job_id": job.id,
            "id": job.id,
            "status": "completed",
            "progress": 1.0,
            "text": job.text[:200] + ("..." if len(job.text) > 200 else ""),
            "language": job.language,
            "emotion": job.emotion,
            "voice_profile_id": job.voice_profile_id,
            "duration_seconds": round(duration, 3),
            "character_count": job.character_count,
            "output_format": job.output_format,
            "output_url": output_url,
            "error_message": None,
            "created_at": str(job.created_at),
            "completed_at": str(job.completed_at),
        }

    except Exception as e:
        logger.error(f"❌ Sync generation failed: {e}", exc_info=True)
        job.status = JobStatus.FAILED
        job.error_message = str(e)[:500]
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()

        return {
            "job_id": job.id,
            "id": job.id,
            "status": "failed",
            "error_message": str(e)[:500],
            "created_at": str(job.created_at),
        }


# ── Job retrieval endpoints ──────────────────────────────────────────────────

@router.get("/{job_id}")
async def get_generation_job(job_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GenerationJob).where(GenerationJob.id == job_id, GenerationJob.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Generation job not found")
    output_url = None
    if job.output_storage_key and job.status == JobStatus.COMPLETED:
        try:
            storage = await get_storage()
            output_url = await storage.presigned_url(settings.BUCKET_OUTPUTS, job.output_storage_key, expires_hours=24)
        except Exception:
            pass
    return {
        "id": job.id, "status": job.status, "progress": job.progress,
        "text": job.text[:200] + ("..." if len(job.text) > 200 else ""),
        "speaking_style": job.speaking_style,
        "language": job.language, "emotion": job.emotion,
        "model": (job.extra_metadata or {}).get("model", "kokoro-82m"),
        "extra_metadata": job.extra_metadata,
        "voice_profile_id": job.voice_profile_id,
        "duration_seconds": job.duration_seconds,
        "character_count": job.character_count,
        "output_format": job.output_format,
        "output_url": output_url,
        "error_message": job.error_message,
        "created_at": job.created_at, "completed_at": job.completed_at,
    }


@router.get("/")
async def list_generation_jobs(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    q = select(GenerationJob, VoiceProfile.name).outerjoin(
        VoiceProfile, GenerationJob.voice_profile_id == VoiceProfile.id
    ).where(GenerationJob.user_id == current_user.id).order_by(desc(GenerationJob.created_at))
    
    total = (await db.execute(select(func.count()).select_from(GenerationJob).where(GenerationJob.user_id == current_user.id))).scalar()
    result = await db.execute(q.offset((page-1)*page_size).limit(page_size))
    
    return {"total": total, "jobs": [{
        "id": j.id, "status": j.status, "language": j.language,
        "text": j.text[:50] + ("..." if len(j.text) > 50 else ""),
        "model": (j.extra_metadata or {}).get("model", "kokoro-82m") if getattr(j, "extra_metadata", None) else "kokoro-82m",
        "emotion": j.emotion, "voice_profile_id": j.voice_profile_id,
        "voice_profile_name": p_name or "Unknown Profile",
        "speaking_style": j.speaking_style,
        "character_count": j.character_count, "duration_seconds": j.duration_seconds,
        "output_format": j.output_format, "created_at": j.created_at,
        "output_url": j.output_url
    } for j, p_name in result.all()]}


# ── Model capabilities endpoint ─────────────────────────────────────────────

@router.get("/capabilities/model")
async def get_model_capabilities(model: str = "kokoro-82m"):
    """Return a TTS model's supported parameters and voice presets."""
    if model == "chatterbox-turbo":
        from app.ml.tts_pipeline import get_chatterbox_pipeline
        cb = get_chatterbox_pipeline()
        return {
            "parameters": cb.get_supported_parameters(),
            "voices": [],
        }
    from app.ml.tts_pipeline import get_tts_pipeline
    tts = get_tts_pipeline()
    return {
        "parameters": tts.get_supported_parameters(),
        "voices": tts.get_available_voices(),
    }


@router.get("/capabilities/models")
async def list_available_models():
    """Return all available TTS models."""
    return {
        "models": [
            {
                "id": "kokoro-82m",
                "name": "Kokoro 82M",
                "license": "Apache 2.0",
                "description": "Ultra-fast, multi-language TTS. 50+ voice presets. Runs on CPU.",
                "supports_cloning": False,
                "supports_emotion": True,
                "supports_speed": True,
                "engine": "cpu",
            },
            {
                "id": "chatterbox-turbo",
                "name": "Chatterbox Turbo",
                "license": "MIT",
                "description": "Hyper-realistic voice generation with emotion control and zero-shot cloning. GPU accelerated.",
                "supports_cloning": True,
                "supports_emotion": True,
                "supports_speed": False,
                "engine": "gpu",
            },
        ]
    }


@router.delete("/{job_id}")
async def delete_generation_job(job_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GenerationJob).where(GenerationJob.id == job_id, GenerationJob.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()
    return {"status": "deleted"}
