import asyncio
import os
import sys

# Add backend dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import VoiceModel
from sqlalchemy import update

async def main():
    async with SessionLocal() as db:
        await db.execute(update(VoiceModel).values(training_status='ready'))
        await db.commit()
        print("Updated all VoiceModel training_status to 'ready'")

if __name__ == "__main__":
    asyncio.run(main())
