import asyncio
import random
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app.models import (
    User, GenerationJob, DetectionJob, JobStatus, DetectionVerdict
)
from sqlalchemy import select

async def populate():
    async with SessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        if not users:
            print("No users found to populate analytics for.")
            return

        for user in users:
            print(f"Populating data for {user.username}...")
            
            # Create a 30 day timeline
            now = datetime.now(timezone.utc)
            for i in range(30):
                day = now - timedelta(days=i)
                
                # Generations
                for _ in range(random.randint(2, 10)):
                    job = GenerationJob(
                        user_id=user.id,
                        status=JobStatus.COMPLETED if random.random() > 0.05 else JobStatus.FAILED,
                        character_count=random.randint(100, 1000),
                        text="Simulated generation text for analytics.",
                        created_at=day - timedelta(hours=random.randint(0, 23))
                    )
                    db.add(job)
                
                # Detections
                for _ in range(random.randint(1, 5)):
                    is_synth = random.random() > 0.3 # 70% synthetic
                    
                    # Simulated models performance
                    aasist = random.uniform(0.7, 0.99) if is_synth else random.uniform(0.01, 0.2)
                    rawnet2 = random.uniform(0.6, 0.95) if is_synth else random.uniform(0.05, 0.3)
                    prosodic = random.uniform(0.5, 0.8) if is_synth else random.uniform(0.1, 0.4)
                    spectral = random.uniform(0.6, 0.9) if is_synth else random.uniform(0.1, 0.3)
                    glottal = random.uniform(0.5, 0.85) if is_synth else random.uniform(0.15, 0.4)
                    
                    risk = (aasist + rawnet2 + prosodic + spectral + glottal) / 5.0
                    conf = max(aasist, rawnet2) if is_synth else 1 - min(aasist, rawnet2)
                    
                    # 90% accurate
                    accurate = random.random() > 0.1
                    user_feedback = True if accurate else False
                    
                    verdict = random.choice([DetectionVerdict.SYNTHETIC_TTS, DetectionVerdict.VOICE_CONVERSION]) if is_synth else DetectionVerdict.AUTHENTIC
                    # Sometimes the engine makes a mistake
                    if random.random() < 0.05:
                        verdict = random.choice([DetectionVerdict.SYNTHETIC_TTS, DetectionVerdict.VOICE_CONVERSION]) if not is_synth else DetectionVerdict.AUTHENTIC
                        user_feedback = False # user flags it as wrong

                    det = DetectionJob(
                        user_id=user.id,
                        status=JobStatus.COMPLETED if random.random() > 0.02 else JobStatus.FAILED,
                        original_filename=f"audio_sample_{random.randint(1000,9999)}.wav",
                        duration_seconds=random.uniform(5.0, 60.0),
                        processing_time_ms=random.randint(200, 1500),
                        is_synthetic=is_synth,
                        verdict=verdict,
                        ensemble_confidence=conf,
                        risk_score=risk,
                        pipeline_metrics={
                            "wav2vec2_deepfake": {"score": conf, "status": "online"},
                            "pyannote_diarization": {"speakers_detected": 1, "status": "online"},
                            "squim_quality": {"status": "online"}
                        },
                        user_feedback=user_feedback,
                        created_at=day - timedelta(hours=random.randint(0, 23))
                    )
                    db.add(det)
            
            await db.commit()
            print(f"Populated analytics for {user.username}")

if __name__ == "__main__":
    asyncio.run(populate())
