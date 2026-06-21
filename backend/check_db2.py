import asyncio
from app.database import SessionLocal
from sqlalchemy import select
from app.models import GenerationJob

async def f():
    async with SessionLocal() as db:
        res = await db.execute(select(GenerationJob).order_by(GenerationJob.created_at.desc()).limit(3))
        jobs = res.scalars().all()
        for j in jobs:
            print(f"ID: {j.id}, Status: {j.status}, Processing Time: {j.duration_seconds}, Created: {j.created_at}, Completed: {j.completed_at}")

asyncio.run(f())
