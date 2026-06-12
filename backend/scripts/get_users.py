import asyncio
from app.database import SessionLocal
from app.models import User, VoiceProfile
from sqlalchemy import select

async def run():
    async with SessionLocal() as db:
        users = await db.execute(select(User))
        vps = await db.execute(select(VoiceProfile))
        print('Users:', [(u.id, u.username) for u in users.scalars().all()])
        print('Voices:', [(v.id, v.name) for v in vps.scalars().all()[:2]])

if __name__ == "__main__":
    asyncio.run(run())
