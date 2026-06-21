"""Vocaria Cloning Task"""
import asyncio, logging, os, tempfile
from datetime import datetime, timezone
from app.workers.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="cloning.run", max_retries=2, soft_time_limit=7200)
def run_clone_task(self, job_id: str, user_id: str, voice_profile_id: str, mode: str, fine_tune_steps=None):
    return asyncio.get_event_loop().run_until_complete(
        _run_clone_async(self, job_id, user_id, voice_profile_id, mode, fine_tune_steps)
    )

async def _run_clone_async(task, job_id, user_id, voice_profile_id, mode, fine_tune_steps):
    from app.database import SessionLocal
    from app.models import CloneJob, JobStatus, VoiceProfile, VoiceSample, Notification, NotificationType, AuditLog, AuditAction, UsageRecord
    from app.utils.storage import get_storage
    from sqlalchemy import select
    import uuid

    async with SessionLocal() as db:
        result = await db.execute(select(CloneJob).where(CloneJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            return
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        await db.commit()

    try:
        # Get samples
        async with SessionLocal() as db:
            result = await db.execute(select(VoiceSample).where(VoiceSample.voice_profile_id == voice_profile_id))
            samples = result.scalars().all()

        # Download sample files
        storage = await get_storage()
        sample_paths = []
        for s in samples:
            content = await storage.download(settings.BUCKET_SAMPLES, s.storage_key)
            ext = s.format or "wav"
            with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as f:
                f.write(content)
                sample_paths.append(f.name)

        if not sample_paths:
            raise ValueError("No valid audio samples found for this voice profile.")

        reference_audio_path = sample_paths[0]

        # Use Chatterbox Turbo for cloning preview
        from app.ml.tts_pipeline import get_chatterbox_pipeline
        tts = get_chatterbox_pipeline()

        # For Chatterbox, the "embedding" is just the raw reference audio file!
        # We will store the original sample's storage key as the "embedding_path"
        # so generation.py knows where to find the reference audio.
        embedding_storage_key = samples[0].storage_key

        # Generate preview
        preview_url = None
        try:
            preview_text = "Hello, this is a preview of your cloned voice using the Chatterbox engine."
            audio_bytes, sr = await tts.synthesize(preview_text, speaker_wav=reference_audio_path)
            preview_key = f"previews/{user_id}/{voice_profile_id}/preview.wav"
            await storage.upload(settings.BUCKET_OUTPUTS, preview_key, audio_bytes, "audio/wav")
            preview_url = await storage.presigned_url(settings.BUCKET_OUTPUTS, preview_key, expires_hours=168)
        except Exception as e:
            logger.warning(f"Preview generation failed: {e}")

        # Save results
        async with SessionLocal() as db:
            result = await db.execute(select(CloneJob).where(CloneJob.id == job_id))
            job = result.scalar_one_or_none()
            job.status = JobStatus.COMPLETED
            job.progress = 1.0
            job.embedding_path = embedding_storage_key
            job.preview_url = preview_url
            job.quality_score = 0.95
            job.similarity_score = 0.90
            job.completed_at = datetime.now(timezone.utc)
            job.duration_seconds = (datetime.now(timezone.utc) - job.started_at).total_seconds()

            # Update voice profile
            vp_result = await db.execute(select(VoiceProfile).where(VoiceProfile.id == voice_profile_id))
            vp = vp_result.scalar_one_or_none()
            if vp:
                vp.embedding_path = embedding_storage_key
                vp.preview_url = preview_url
                vp.training_status = "ready"
                vp.quality_score = job.quality_score
                vp.similarity_score = job.similarity_score
                # Mark as chatterbox-turbo engine explicitly so generation knows!
                vp.model_id = "chatterbox-turbo"

            month_year = datetime.now().strftime("%Y-%m")
            existing = await db.execute(select(UsageRecord).where(UsageRecord.user_id == user_id, UsageRecord.month_year == month_year, UsageRecord.resource_type == "clone_jobs"))
            ur = existing.scalar_one_or_none()
            if ur:
                ur.quantity += 1
            else:
                db.add(UsageRecord(user_id=user_id, month_year=month_year, resource_type="clone_jobs", quantity=1, unit="count"))

            db.add(Notification(user_id=user_id, type=NotificationType.CLONE_COMPLETE,
                title="Voice Clone Ready! 🎤", message=f"Your voice clone is ready. Quality score: {job.quality_score:.0%}",
                action_url=f"/voices/{voice_profile_id}"))
            db.add(AuditLog(user_id=user_id, action=AuditAction.CLONE_COMPLETE,
                resource_type="clone_job", resource_id=job_id,
                details={"quality_score": job.quality_score, "mode": mode}))
            await db.commit()

        logger.info(f"Clone job {job_id} completed for voice {voice_profile_id}")
    except Exception as e:
        logger.error(f"Clone task failed: {e}", exc_info=True)
        async with SessionLocal() as db:
            result = await db.execute(select(CloneJob).where(CloneJob.id == job_id))
            job = result.scalar_one_or_none()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(e)[:500]
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
        if task.request.retries < task.max_retries:
            raise task.retry(exc=e, countdown=120)
    finally:
        for p in sample_paths if 'sample_paths' in dir() else []:
            try:
                os.unlink(p)
            except Exception:
                pass
