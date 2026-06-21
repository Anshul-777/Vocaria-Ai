"""Script to seed GenerationJobs for existing voices to make analytics real."""
import asyncio, os, sys, random
from datetime import timedelta, datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import VoiceProfile, VoiceModel, GenerationJob, JobStatus
from sqlalchemy import select
import uuid

def new_uuid():
    return str(uuid.uuid4())

async def main():
    async with SessionLocal() as db:
        # Get all active voices
        result = await db.execute(
            select(VoiceModel, VoiceProfile).join(VoiceProfile, VoiceProfile.id == VoiceModel.voice_profile_id)
            .where(VoiceProfile.is_active == True)
        )
        models = result.all()

        if not models:
            print("No active voice models found.")
            return

        # Let's seed 1-3 GenerationJobs per voice model
        jobs_to_add = []
        now = datetime.utcnow()
        total_credits = 0

        for vm, vp in models:
            num_generations = random.randint(1, 4)
            for i in range(num_generations):
                # Distribute the generation jobs over the last 14 days
                days_ago = random.randint(0, 14)
                gen_date = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
                
                # Character count affects credits
                char_count = random.randint(50, 400)
                total_credits += char_count
                
                job = GenerationJob(
                    id=new_uuid(),
                    user_id=vp.owner_id,
                    voice_profile_id=vp.id,
                    status=JobStatus.COMPLETED,
                    text="Sample text generated for voice preview.",
                    language=vp.language or "en",
                    output_format="wav",
                    output_url=vm.preview_url,
                    output_storage_key=None,
                    duration_seconds=random.uniform(2.5, 15.0),
                    character_count=char_count,
                    created_at=gen_date,
                    started_at=gen_date + timedelta(seconds=1),
                    completed_at=gen_date + timedelta(seconds=int(random.uniform(2, 10))),
                )
                jobs_to_add.append(job)

        db.add_all(jobs_to_add)
        await db.commit()
        
        print(f"Successfully seeded {len(jobs_to_add)} GenerationJobs.")
        print(f"Total credits (character_count) represented: {total_credits}")

if __name__ == "__main__":
    asyncio.run(main())
