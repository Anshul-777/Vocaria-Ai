"""
Vocaria Voice Tools – Celery Worker Tasks
==========================================
Production-grade audio processing tasks for all Voice Tools.

Libraries used (all MIT / ISC / permissive-licensed):
  - pydub        : Audio manipulation, format conversion, silence detection, ducking
  - librosa      : Key / BPM detection, audio analysis
  - noisereduce  : Spectral-gating noise reduction
  - soundfile    : Read/write WAV/FLAC
  - yt-dlp       : Extract audio from URLs (YouTube, etc.)
  - spleeter     : Vocal/stem separation (Deezer, MIT)
  - openai-whisper: Speech-to-text transcription (MIT)
"""

import asyncio
import io
import json
import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

# ── Shared helpers ────────────────────────────────────────────────────────────

def _save_to_storage_sync(data: bytes, filename: str, content_type: str = "audio/wav") -> str:
    """Synchronously upload processed audio to the storage backend and return a presigned URL."""
    from app.config import settings
    from app.utils.storage import StorageBackend

    storage = StorageBackend()
    bucket = settings.BUCKET_OUTPUTS
    key = f"tools/{uuid.uuid4().hex}/{filename}"

    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(storage.ensure_buckets())
        loop.run_until_complete(storage.upload(bucket, key, data, content_type))
        url = loop.run_until_complete(storage.presigned_url(bucket, key, expires_hours=24))
    finally:
        loop.close()
    return url


def _load_audio_pydub(content: bytes):
    """Load bytes into a pydub AudioSegment, auto-detecting format."""
    from pydub import AudioSegment
    return AudioSegment.from_file(io.BytesIO(content))


def _export_pydub(segment, fmt: str = "wav") -> bytes:
    """Export a pydub AudioSegment to bytes."""
    buf = io.BytesIO()
    segment.export(buf, format=fmt)
    return buf.getvalue()


def _read_upload(upload_key: str) -> bytes:
    """Download a file from the uploads bucket synchronously."""
    from app.config import settings
    from app.utils.storage import StorageBackend

    storage = StorageBackend()
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(storage.ensure_buckets())
        data = loop.run_until_complete(storage.download(settings.BUCKET_UPLOADS, upload_key))
    finally:
        loop.close()
    return data


# ══════════════════════════════════════════════════════════════════════════════
# TASK 1: Voice Extractor – Extract audio from URL or video file
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.extract_audio", max_retries=2, soft_time_limit=300)
def extract_audio_task(self, source_type: str, source: str) -> Dict[str, Any]:
    """
    source_type: 'url' | 'file'
    source: a URL string  OR  an upload storage key
    """
    try:
        self.update_state(state="PROCESSING", meta={"step": "starting"})
        tmp_dir = tempfile.mkdtemp(prefix="vocaria_extract_")

        if source_type == "url":
            # Use yt-dlp to download best audio
            output_path = os.path.join(tmp_dir, "extracted.%(ext)s")
            cmd = [
                "yt-dlp",
                "--no-playlist",
                "-x",                        # extract audio only
                "--audio-format", "wav",      # convert to wav
                "--audio-quality", "0",       # best quality
                "-o", output_path,
                source,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
            if result.returncode != 0:
                raise RuntimeError(f"yt-dlp error: {result.stderr[:500]}")

            # Find the extracted file
            files = list(Path(tmp_dir).glob("extracted.*"))
            if not files:
                raise FileNotFoundError("yt-dlp produced no output file")
            audio_bytes = files[0].read_bytes()

        else:
            # source is a storage key – download and extract audio track with ffmpeg
            raw_bytes = _read_upload(source)
            input_path = os.path.join(tmp_dir, "input_video")
            output_path = os.path.join(tmp_dir, "extracted.wav")
            with open(input_path, "wb") as f:
                f.write(raw_bytes)

            cmd = [
                "ffmpeg", "-i", input_path,
                "-vn",                       # no video
                "-acodec", "pcm_s16le",
                "-ar", "44100",
                "-ac", "2",
                output_path,
                "-y",
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg error: {result.stderr[:500]}")
            audio_bytes = Path(output_path).read_bytes()

        url = _save_to_storage_sync(audio_bytes, "extracted_audio.wav", "audio/wav")
        shutil.rmtree(tmp_dir, ignore_errors=True)

        return {"status": "completed", "output_url": url, "filename": "extracted_audio.wav"}

    except Exception as exc:
        logger.error(f"extract_audio_task failed: {exc}", exc_info=True)
        shutil.rmtree(tmp_dir, ignore_errors=True) if 'tmp_dir' in dir() else None
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 2: Vocal Remover – Separate vocals from accompaniment
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.vocal_remover", max_retries=1, soft_time_limit=600)
def vocal_remover_task(self, upload_key: str, mode: str = "vocals") -> Dict[str, Any]:
    """
    mode: 'vocals' = return isolated vocals,  'accompaniment' = return instrumental
    Uses Spleeter 2-stems (MIT license, commercial OK).
    """
    try:
        self.update_state(state="PROCESSING", meta={"step": "downloading"})
        raw = _read_upload(upload_key)
        tmp_dir = tempfile.mkdtemp(prefix="vocaria_stems_")
        input_path = os.path.join(tmp_dir, "input.wav")

        # Convert to WAV first for Spleeter compatibility
        seg = _load_audio_pydub(raw)
        seg = seg.set_frame_rate(44100).set_channels(2)
        with open(input_path, "wb") as f:
            seg.export(f, format="wav")

        self.update_state(state="PROCESSING", meta={"step": "separating_stems"})

        # Run spleeter via CLI (more reliable than Python API in Celery workers)
        cmd = [
            "python", "-m", "spleeter", "separate",
            "-p", "spleeter:2stems",
            "-o", tmp_dir,
            input_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise RuntimeError(f"Spleeter error: {result.stderr[:500]}")

        # Spleeter outputs to <tmp_dir>/input/<vocals|accompaniment>.wav
        stem_dir = os.path.join(tmp_dir, "input")
        if mode == "vocals":
            stem_path = os.path.join(stem_dir, "vocals.wav")
            fname = "isolated_vocals.wav"
        else:
            stem_path = os.path.join(stem_dir, "accompaniment.wav")
            fname = "accompaniment.wav"

        if not os.path.exists(stem_path):
            raise FileNotFoundError(f"Spleeter did not produce {mode} stem")

        audio_bytes = Path(stem_path).read_bytes()
        url = _save_to_storage_sync(audio_bytes, fname, "audio/wav")
        shutil.rmtree(tmp_dir, ignore_errors=True)

        return {"status": "completed", "output_url": url, "filename": fname}

    except Exception as exc:
        logger.error(f"vocal_remover_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 3: Stem Splitter – 4-stem separation (vocals, drums, bass, other)
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.stem_splitter", max_retries=1, soft_time_limit=900)
def stem_splitter_task(self, upload_key: str) -> Dict[str, Any]:
    """Separate audio into 4 stems using Spleeter 4stems."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "downloading"})
        raw = _read_upload(upload_key)
        tmp_dir = tempfile.mkdtemp(prefix="vocaria_4stems_")
        input_path = os.path.join(tmp_dir, "input.wav")

        seg = _load_audio_pydub(raw)
        seg = seg.set_frame_rate(44100).set_channels(2)
        with open(input_path, "wb") as f:
            seg.export(f, format="wav")

        self.update_state(state="PROCESSING", meta={"step": "splitting_stems"})

        cmd = [
            "python", "-m", "spleeter", "separate",
            "-p", "spleeter:4stems",
            "-o", tmp_dir,
            input_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            raise RuntimeError(f"Spleeter 4stems error: {result.stderr[:500]}")

        stem_dir = os.path.join(tmp_dir, "input")
        outputs = {}
        for stem_name in ["vocals", "drums", "bass", "other"]:
            stem_path = os.path.join(stem_dir, f"{stem_name}.wav")
            if os.path.exists(stem_path):
                data = Path(stem_path).read_bytes()
                url = _save_to_storage_sync(data, f"{stem_name}.wav", "audio/wav")
                outputs[stem_name] = url

        shutil.rmtree(tmp_dir, ignore_errors=True)
        return {"status": "completed", "stems": outputs}

    except Exception as exc:
        logger.error(f"stem_splitter_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 4: Noise Reduction / Audio Enhancer
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.noise_reduction", soft_time_limit=180)
def noise_reduction_task(self, upload_key: str, strength: float = 1.0) -> Dict[str, Any]:
    """
    Uses `noisereduce` library (MIT) for spectral-gating noise reduction.
    strength: 0.0 (gentle) to 2.0 (aggressive)
    """
    try:
        self.update_state(state="PROCESSING", meta={"step": "downloading"})
        raw = _read_upload(upload_key)
        import soundfile as sf
        import noisereduce as nr

        seg = _load_audio_pydub(raw).set_channels(1)
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
        sr = seg.frame_rate

        self.update_state(state="PROCESSING", meta={"step": "reducing_noise"})
        reduced = nr.reduce_noise(
            y=samples,
            sr=sr,
            prop_decrease=min(1.0, strength * 0.8),
            stationary=False,
        )

        buf = io.BytesIO()
        sf.write(buf, reduced, sr, format="WAV", subtype="PCM_16")
        url = _save_to_storage_sync(buf.getvalue(), "enhanced_audio.wav", "audio/wav")

        return {"status": "completed", "output_url": url, "filename": "enhanced_audio.wav"}

    except Exception as exc:
        logger.error(f"noise_reduction_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 5: Echo Remover
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.echo_remover", soft_time_limit=180)
def echo_remover_task(self, upload_key: str) -> Dict[str, Any]:
    """
    Remove echo/reverb using spectral subtraction with noisereduce.
    Aggressive stationary noise reduction targets reverb tails effectively.
    """
    try:
        self.update_state(state="PROCESSING", meta={"step": "downloading"})
        raw = _read_upload(upload_key)
        import soundfile as sf
        import noisereduce as nr

        seg = _load_audio_pydub(raw).set_channels(1)
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
        sr = seg.frame_rate

        self.update_state(state="PROCESSING", meta={"step": "removing_echo"})
        # Stationary reduction with higher prop_decrease targets reverb tails
        cleaned = nr.reduce_noise(
            y=samples,
            sr=sr,
            prop_decrease=0.9,
            stationary=True,
            n_fft=2048,
            win_length=2048,
            hop_length=512,
        )

        buf = io.BytesIO()
        sf.write(buf, cleaned, sr, format="WAV", subtype="PCM_16")
        url = _save_to_storage_sync(buf.getvalue(), "echo_removed.wav", "audio/wav")

        return {"status": "completed", "output_url": url, "filename": "echo_removed.wav"}

    except Exception as exc:
        logger.error(f"echo_remover_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 6: Speech to Text (Whisper, MIT)
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.speech_to_text", soft_time_limit=300)
def speech_to_text_task(self, upload_key: str, model_size: str = "base") -> Dict[str, Any]:
    """Transcribe audio to text using OpenAI Whisper (MIT license)."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "downloading"})
        raw = _read_upload(upload_key)
        tmp_dir = tempfile.mkdtemp(prefix="vocaria_stt_")
        input_path = os.path.join(tmp_dir, "input.wav")

        seg = _load_audio_pydub(raw).set_channels(1).set_frame_rate(16000)
        with open(input_path, "wb") as f:
            seg.export(f, format="wav")

        self.update_state(state="PROCESSING", meta={"step": "transcribing"})
        import whisper
        model = whisper.load_model(model_size)
        result = model.transcribe(input_path, fp16=False)

        transcript_text = result.get("text", "").strip()
        segments = [
            {"start": s["start"], "end": s["end"], "text": s["text"]}
            for s in result.get("segments", [])
        ]

        # Save transcript as text file too
        transcript_bytes = transcript_text.encode("utf-8")
        url = _save_to_storage_sync(transcript_bytes, "transcript.txt", "text/plain")

        shutil.rmtree(tmp_dir, ignore_errors=True)
        return {
            "status": "completed",
            "transcript": transcript_text,
            "segments": segments,
            "language": result.get("language", "unknown"),
            "output_url": url,
            "filename": "transcript.txt",
        }

    except Exception as exc:
        logger.error(f"speech_to_text_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 7: Key & BPM Finder (librosa, ISC license)
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.key_bpm_finder", soft_time_limit=120)
def key_bpm_finder_task(self, upload_key: str) -> Dict[str, Any]:
    """Analyze audio for musical key (using chroma features) and BPM."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "analyzing"})
        raw = _read_upload(upload_key)
        import librosa

        seg = _load_audio_pydub(raw).set_channels(1)
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
        sr = seg.frame_rate

        # BPM detection
        tempo, _ = librosa.beat.beat_track(y=samples, sr=sr)
        bpm = float(tempo) if np.isscalar(tempo) else float(tempo[0])

        # Key detection via chroma
        chroma = librosa.feature.chroma_cqt(y=samples, sr=sr)
        chroma_mean = chroma.mean(axis=1)
        key_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        key_idx = int(np.argmax(chroma_mean))
        detected_key = key_names[key_idx]

        # Major/Minor detection
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        shifted_chroma = np.roll(chroma_mean, -key_idx)
        major_corr = float(np.corrcoef(shifted_chroma, major_profile)[0, 1])
        minor_corr = float(np.corrcoef(shifted_chroma, minor_profile)[0, 1])
        scale = "Major" if major_corr > minor_corr else "Minor"

        # Duration
        duration_sec = float(len(samples) / sr)

        return {
            "status": "completed",
            "key": f"{detected_key} {scale}",
            "bpm": round(bpm, 1),
            "duration_seconds": round(duration_sec, 2),
            "chroma_distribution": {key_names[i]: round(float(chroma_mean[i]), 3) for i in range(12)},
        }

    except Exception as exc:
        logger.error(f"key_bpm_finder_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 8: Silence Detection & Removal
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.silence_detection", soft_time_limit=120)
def silence_detection_task(self, upload_key: str, min_silence_ms: int = 500, silence_thresh_db: int = -40) -> Dict[str, Any]:
    """Detect and remove silent segments from audio."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "detecting_silence"})
        raw = _read_upload(upload_key)
        from pydub import AudioSegment
        from pydub.silence import detect_nonsilent

        seg = _load_audio_pydub(raw)
        original_duration = len(seg)

        nonsilent_ranges = detect_nonsilent(
            seg,
            min_silence_len=min_silence_ms,
            silence_thresh=silence_thresh_db,
        )

        if not nonsilent_ranges:
            return {"status": "completed", "output_url": None, "message": "Audio is entirely silent."}

        # Combine non-silent segments with small crossfade
        output = AudioSegment.empty()
        for start, end in nonsilent_ranges:
            chunk = seg[start:end]
            if len(output) > 0 and len(chunk) > 50:
                output = output.append(chunk, crossfade=min(50, len(chunk) // 2))
            else:
                output += chunk

        new_duration = len(output)
        removed_ms = original_duration - new_duration

        audio_bytes = _export_pydub(output)
        url = _save_to_storage_sync(audio_bytes, "silence_removed.wav", "audio/wav")

        return {
            "status": "completed",
            "output_url": url,
            "filename": "silence_removed.wav",
            "original_duration_ms": original_duration,
            "new_duration_ms": new_duration,
            "silence_removed_ms": removed_ms,
            "segments_found": len(nonsilent_ranges),
        }

    except Exception as exc:
        logger.error(f"silence_detection_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 9: Audio Converter
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.audio_converter", soft_time_limit=120)
def audio_converter_task(self, upload_key: str, target_format: str = "mp3", bitrate: str = "192k") -> Dict[str, Any]:
    """Convert audio to target format (mp3, wav, flac, ogg, aac)."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "converting"})
        raw = _read_upload(upload_key)

        seg = _load_audio_pydub(raw)
        buf = io.BytesIO()

        export_params = {}
        if target_format == "mp3":
            export_params["bitrate"] = bitrate
            content_type = "audio/mpeg"
        elif target_format == "flac":
            content_type = "audio/flac"
        elif target_format == "ogg":
            export_params["codec"] = "libvorbis"
            content_type = "audio/ogg"
        elif target_format == "aac":
            target_format = "adts"
            content_type = "audio/aac"
        else:
            content_type = "audio/wav"

        seg.export(buf, format=target_format, **export_params)
        ext = target_format if target_format != "adts" else "aac"
        fname = f"converted.{ext}"
        url = _save_to_storage_sync(buf.getvalue(), fname, content_type)

        return {"status": "completed", "output_url": url, "filename": fname, "format": ext}

    except Exception as exc:
        logger.error(f"audio_converter_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 10: Audio Ducking
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.audio_ducking", soft_time_limit=180)
def audio_ducking_task(self, upload_key: str, duck_amount_db: int = -12) -> Dict[str, Any]:
    """
    Lower background music during speech segments.
    Detects speech (non-silent segments) and applies volume reduction to quiet parts.
    """
    try:
        self.update_state(state="PROCESSING", meta={"step": "analyzing_speech"})
        raw = _read_upload(upload_key)
        from pydub import AudioSegment
        from pydub.silence import detect_nonsilent

        seg = _load_audio_pydub(raw)
        speech_ranges = detect_nonsilent(seg, min_silence_len=300, silence_thresh=-35)

        if not speech_ranges:
            return {"status": "completed", "output_url": None, "message": "No speech detected for ducking."}

        self.update_state(state="PROCESSING", meta={"step": "applying_ducking"})
        output = AudioSegment.silent(duration=len(seg))
        pos = 0
        for start, end in speech_ranges:
            # Before speech: duck
            if pos < start:
                ducked_chunk = seg[pos:start] + duck_amount_db
                output = output.overlay(ducked_chunk, position=pos)
            # During speech: keep original
            output = output.overlay(seg[start:end], position=start)
            pos = end
        # After last speech
        if pos < len(seg):
            ducked_chunk = seg[pos:] + duck_amount_db
            output = output.overlay(ducked_chunk, position=pos)

        audio_bytes = _export_pydub(output)
        url = _save_to_storage_sync(audio_bytes, "ducked_audio.wav", "audio/wav")

        return {"status": "completed", "output_url": url, "filename": "ducked_audio.wav"}

    except Exception as exc:
        logger.error(f"audio_ducking_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 11: Audio Stretch (change duration without pitch shift)
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.audio_stretch", soft_time_limit=180)
def audio_stretch_task(self, upload_key: str, speed_factor: float = 1.5) -> Dict[str, Any]:
    """
    Change audio speed without altering pitch using ffmpeg's atempo filter.
    speed_factor: 0.5 = half speed (2x duration), 2.0 = double speed (0.5x duration)
    """
    try:
        self.update_state(state="PROCESSING", meta={"step": "stretching"})
        raw = _read_upload(upload_key)
        tmp_dir = tempfile.mkdtemp(prefix="vocaria_stretch_")
        input_path = os.path.join(tmp_dir, "input.wav")
        output_path = os.path.join(tmp_dir, "stretched.wav")

        with open(input_path, "wb") as f:
            f.write(raw)

        # ffmpeg atempo filter range is 0.5-100.0; chain multiple for extremes
        factor = max(0.5, min(100.0, speed_factor))
        atempo_chain = []
        remaining = factor
        while remaining > 2.0:
            atempo_chain.append("atempo=2.0")
            remaining /= 2.0
        while remaining < 0.5:
            atempo_chain.append("atempo=0.5")
            remaining /= 0.5
        atempo_chain.append(f"atempo={remaining}")

        filter_str = ",".join(atempo_chain)
        cmd = [
            "ffmpeg", "-i", input_path,
            "-filter:a", filter_str,
            output_path,
            "-y",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg stretch error: {result.stderr[:500]}")

        audio_bytes = Path(output_path).read_bytes()
        url = _save_to_storage_sync(audio_bytes, "stretched_audio.wav", "audio/wav")
        shutil.rmtree(tmp_dir, ignore_errors=True)

        return {"status": "completed", "output_url": url, "filename": "stretched_audio.wav", "speed_factor": speed_factor}

    except Exception as exc:
        logger.error(f"audio_stretch_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 12: Audio Visualizer (generate waveform image)
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tools.audio_visualizer", soft_time_limit=60)
def audio_visualizer_task(self, upload_key: str) -> Dict[str, Any]:
    """Generate a waveform visualization as a PNG image."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "generating_waveform"})
        raw = _read_upload(upload_key)
        import librosa
        import librosa.display

        seg = _load_audio_pydub(raw).set_channels(1)
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
        sr = seg.frame_rate

        # Generate waveform plot with matplotlib (non-interactive backend)
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, axes = plt.subplots(2, 1, figsize=(14, 6), dpi=100)

        # Waveform
        librosa.display.waveshow(samples, sr=sr, ax=axes[0], color="#1a2b3c")
        axes[0].set_title("Waveform", fontsize=12, fontweight="bold")
        axes[0].set_xlabel("")

        # Spectrogram
        S = librosa.feature.melspectrogram(y=samples, sr=sr, n_mels=128)
        S_dB = librosa.power_to_db(S, ref=np.max)
        librosa.display.specshow(S_dB, sr=sr, x_axis="time", y_axis="mel", ax=axes[1], cmap="magma")
        axes[1].set_title("Mel Spectrogram", fontsize=12, fontweight="bold")

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", facecolor="white")
        plt.close(fig)

        url = _save_to_storage_sync(buf.getvalue(), "waveform.png", "image/png")

        return {"status": "completed", "output_url": url, "filename": "waveform.png"}

    except Exception as exc:
        logger.error(f"audio_visualizer_task failed: {exc}", exc_info=True)
        return {"status": "failed", "error": str(exc)}
