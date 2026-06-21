import asyncio
from app.database import SessionLocal
from app.models import VoiceProfile, User, GenerationJob
from sqlalchemy import select

async def run():
    async with SessionLocal() as db:
        users = await db.execute(select(User))
        print('Users:', users.scalars().all())
        vps = await db.execute(select(VoiceProfile))
        print('VoiceProfiles:', len(vps.scalars().all()))
        jobs = await db.execute(select(GenerationJob))
        print('GenerationJobs:', len(jobs.scalars().all()))

if __name__ == "__main__":
    asyncio.run(run())
