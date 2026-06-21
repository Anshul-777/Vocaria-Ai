"""Check what audio files exist for hub voices and list their preview URLs."""
import asyncio, os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import VoiceProfile, VoiceModel
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(
            select(VoiceProfile.name, VoiceModel.preview_url, VoiceModel.training_status, VoiceModel.is_active)
            .join(VoiceModel, VoiceProfile.id == VoiceModel.voice_profile_id)
            .where(VoiceProfile.visibility == "public")
            .order_by(VoiceProfile.created_at)
        )
        rows = result.all()
        print(f"Total voice models with public profiles: {len(rows)}\n")
        for name, url, status, active in rows:
            print(f"  {name:25s} | status={status:6s} | active={active} | url={url}")

if __name__ == "__main__":
    asyncio.run(main())
