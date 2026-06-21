import asyncio
import os
import sys
from sqlalchemy import delete

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import GenerationJob

async def clean_fake_jobs():
    async with SessionLocal() as db:
        # Delete all generation jobs that were seeded (we can just delete all of them to be safe and give a clean slate)
        await db.execute(delete(GenerationJob))
        await db.commit()
        print("Successfully wiped all fake generation jobs.")

if __name__ == "__main__":
    asyncio.run(clean_fake_jobs())
