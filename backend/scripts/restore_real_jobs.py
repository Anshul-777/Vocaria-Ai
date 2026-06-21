import asyncio
import os
from pathlib import Path
from datetime import datetime

from app.database import SessionLocal
from app.models import GenerationJob, JobStatus, VoiceProfile
from sqlalchemy import select

async def restore_real_jobs():
    async with SessionLocal() as db:
        # Get one valid voice profile id to attach to jobs
        vps = await db.execute(select(VoiceProfile))
        first_vp = vps.scalars().first()
        default_vp_id = first_vp.id if first_vp else None

        base_dir = Path("C:/Users/anshu/OneDrive/Desktop/Voice Crafter AI/voice-crafter/backend/storage/vc-outputs/outputs")
        if not base_dir.exists():
            print("Base dir not found.")
            return

        added = 0
        for user_dir in base_dir.iterdir():
            if not user_dir.is_dir():
                continue
            user_id = user_dir.name
            for file_path in user_dir.glob("*.wav"):
                job_id = file_path.stem
                if job_id == 'yuki_featured':
                    continue

                # Create GenerationJob record
                job = GenerationJob(
                    id=job_id,
                    user_id=user_id,
                    voice_profile_id=default_vp_id,
                    status=JobStatus.COMPLETED,
                    text="Restored audio generation.",
                    language="en",
                    output_format="wav",
                    output_url=f"/storage/outputs/{user_id}/{file_path.name}",
                    created_at=datetime.fromtimestamp(file_path.stat().st_mtime),
                    started_at=datetime.fromtimestamp(file_path.stat().st_mtime),
                    completed_at=datetime.fromtimestamp(file_path.stat().st_mtime),
                    character_count=100,
                    duration_seconds=5.0
                )
                db.add(job)
                added += 1

        await db.commit()
        print(f"Restored {added} GenerationJobs from output files.")

if __name__ == "__main__":
    asyncio.run(restore_real_jobs())
