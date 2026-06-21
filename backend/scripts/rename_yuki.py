import asyncio
import os
import sys
from sqlalchemy import select, update

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import VoiceProfile

async def rename_yuki():
    async with SessionLocal() as db:
        result = await db.execute(select(VoiceProfile).where(VoiceProfile.name == "Yuki (Vocaria Origin)"))
        yuki = result.scalar_one_or_none()
        if yuki:
            yuki.name = "Yuki"
            await db.commit()
            print("Successfully renamed Yuki.")
        else:
            print("Yuki not found or already renamed.")

if __name__ == "__main__":
    asyncio.run(rename_yuki())
