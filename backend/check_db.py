import asyncio
from app.database import SessionLocal
from sqlalchemy import select
from app.models import GenerationJob

async def f():
    async with SessionLocal() as db:
        res = await db.execute(select(GenerationJob).order_by(GenerationJob.created_at.desc()).limit(3))
        print([(j.id, j.status.value if hasattr(j.status, 'value') else j.status, j.error_message) for j in res.scalars()])

asyncio.run(f())
