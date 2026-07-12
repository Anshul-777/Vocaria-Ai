"""
Vocaria Voice Tools – FastAPI Router
=====================================
REST endpoints for all Voice Tools.
Each tool accepts a file upload or URL, dispatches a Celery task,
and returns a task_id for polling.
"""

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import logging
import uuid

from app.config import settings
from app.utils.storage import get_storage
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _upload_file_to_storage(file: UploadFile) -> str:
    """Upload an incoming file to the uploads bucket, return the storage key."""
    storage = await get_storage()
    content = await file.read()
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin"
    key = f"tools/{uuid.uuid4().hex}/input.{ext}"
    await storage.upload(settings.BUCKET_UPLOADS, key, content, file.content_type or "application/octet-stream")
    return key


# ── Task Status Polling ──────────────────────────────────────────────────────

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Poll for the result of a tool processing task."""
    result = celery_app.AsyncResult(task_id)
    if result.state == "PENDING":
        return {"task_id": task_id, "status": "pending"}
    elif result.state == "PROCESSING":
        return {"task_id": task_id, "status": "processing", "meta": result.info}
    elif result.state == "SUCCESS":
        return {"task_id": task_id, "status": "completed", "result": result.result}
    elif result.state == "FAILURE":
        return {"task_id": task_id, "status": "failed", "error": str(result.result)}
    else:
        return {"task_id": task_id, "status": result.state.lower()}


# ══════════════════════════════════════════════════════════════════════════════
# Voice Extractor
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/extract-audio")
async def extract_audio(
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """Extract audio from a URL (YouTube, etc.) or an uploaded video file."""
    if url:
        from app.workers.tools_tasks import extract_audio_task
        task = extract_audio_task.delay("url", url)
        return {"task_id": task.id, "tool": "extract-audio", "source": "url"}
    elif file:
        key = await _upload_file_to_storage(file)
        from app.workers.tools_tasks import extract_audio_task
        task = extract_audio_task.delay("file", key)
        return {"task_id": task.id, "tool": "extract-audio", "source": "file"}
    else:
        raise HTTPException(status_code=400, detail="Provide either a URL or a file.")


# ══════════════════════════════════════════════════════════════════════════════
# Vocal Remover
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/vocal-remover")
async def vocal_remover(
    file: UploadFile = File(...),
    mode: str = Form("vocals"),  # 'vocals' or 'accompaniment'
):
    """Separate vocals from accompaniment. Returns either isolated vocals or instrumental."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import vocal_remover_task
    task = vocal_remover_task.delay(key, mode)
    return {"task_id": task.id, "tool": "vocal-remover", "mode": mode}


# ══════════════════════════════════════════════════════════════════════════════
# Stem Splitter
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/stem-splitter")
async def stem_splitter(file: UploadFile = File(...)):
    """Split audio into 4 stems: vocals, drums, bass, other."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import stem_splitter_task
    task = stem_splitter_task.delay(key)
    return {"task_id": task.id, "tool": "stem-splitter"}


# ══════════════════════════════════════════════════════════════════════════════
# Noise Reduction / Audio Enhancer
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/noise-reduction")
async def noise_reduction(
    file: UploadFile = File(...),
    strength: float = Form(1.0),
):
    """Reduce background noise using spectral gating."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import noise_reduction_task
    task = noise_reduction_task.delay(key, strength)
    return {"task_id": task.id, "tool": "noise-reduction", "strength": strength}


@router.post("/audio-enhancer")
async def audio_enhancer(
    file: UploadFile = File(...),
    strength: float = Form(1.2),
):
    """Enhance audio clarity (same engine as noise reduction with tuned params)."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import noise_reduction_task
    task = noise_reduction_task.delay(key, strength)
    return {"task_id": task.id, "tool": "audio-enhancer", "strength": strength}


# ══════════════════════════════════════════════════════════════════════════════
# Echo Remover
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/echo-remover")
async def echo_remover(file: UploadFile = File(...)):
    """Remove room echo and reverb from recordings."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import echo_remover_task
    task = echo_remover_task.delay(key)
    return {"task_id": task.id, "tool": "echo-remover"}


# ══════════════════════════════════════════════════════════════════════════════
# Speech to Text
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/speech-to-text")
async def speech_to_text(
    file: UploadFile = File(...),
    model_size: str = Form("base"),
):
    """Transcribe audio to text using Whisper."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import speech_to_text_task
    task = speech_to_text_task.delay(key, model_size)
    return {"task_id": task.id, "tool": "speech-to-text", "model": model_size}


# ══════════════════════════════════════════════════════════════════════════════
# Key & BPM Finder
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/key-bpm-finder")
async def key_bpm_finder(file: UploadFile = File(...)):
    """Analyze audio for musical key and tempo (BPM)."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import key_bpm_finder_task
    task = key_bpm_finder_task.delay(key)
    return {"task_id": task.id, "tool": "key-bpm-finder"}


# ══════════════════════════════════════════════════════════════════════════════
# Silence Detection & Removal
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/silence-detection")
async def silence_detection(
    file: UploadFile = File(...),
    min_silence_ms: int = Form(500),
    silence_thresh_db: int = Form(-40),
):
    """Detect and remove silent segments from audio."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import silence_detection_task
    task = silence_detection_task.delay(key, min_silence_ms, silence_thresh_db)
    return {"task_id": task.id, "tool": "silence-detection"}


# ══════════════════════════════════════════════════════════════════════════════
# Audio Converter
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/audio-converter")
async def audio_converter(
    file: UploadFile = File(...),
    target_format: str = Form("mp3"),
    bitrate: str = Form("192k"),
):
    """Convert audio to a different format (mp3, wav, flac, ogg, aac)."""
    allowed = {"mp3", "wav", "flac", "ogg", "aac"}
    if target_format not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Choose from: {allowed}")
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import audio_converter_task
    task = audio_converter_task.delay(key, target_format, bitrate)
    return {"task_id": task.id, "tool": "audio-converter", "target_format": target_format}


# ══════════════════════════════════════════════════════════════════════════════
# Audio Ducking
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/audio-ducking")
async def audio_ducking(
    file: UploadFile = File(...),
    duck_amount_db: int = Form(-12),
):
    """Lower background music during speech segments."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import audio_ducking_task
    task = audio_ducking_task.delay(key, duck_amount_db)
    return {"task_id": task.id, "tool": "audio-ducking"}


# ══════════════════════════════════════════════════════════════════════════════
# Audio Stretch
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/audio-stretch")
async def audio_stretch(
    file: UploadFile = File(...),
    speed_factor: float = Form(1.5),
):
    """Change audio speed without altering pitch."""
    if speed_factor <= 0 or speed_factor > 10:
        raise HTTPException(status_code=400, detail="speed_factor must be between 0.1 and 10.0")
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import audio_stretch_task
    task = audio_stretch_task.delay(key, speed_factor)
    return {"task_id": task.id, "tool": "audio-stretch", "speed_factor": speed_factor}


# ══════════════════════════════════════════════════════════════════════════════
# Audio Visualizer
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/audio-visualizer")
async def audio_visualizer(file: UploadFile = File(...)):
    """Generate a waveform + spectrogram visualization as a PNG image."""
    key = await _upload_file_to_storage(file)
    from app.workers.tools_tasks import audio_visualizer_task
    task = audio_visualizer_task.delay(key)
    return {"task_id": task.id, "tool": "audio-visualizer"}
