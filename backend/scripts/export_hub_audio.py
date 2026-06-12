"""Copy hub audio files into a local hub/ folder with human-readable names for testing."""
import asyncio, os, sys, shutil
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import VoiceProfile, VoiceModel
from app.config import settings
from sqlalchemy import select

async def main():
    hub_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "hub_audio")
    os.makedirs(hub_dir, exist_ok=True)

    async with SessionLocal() as db:
        result = await db.execute(
            select(VoiceProfile.name, VoiceModel.preview_url)
            .join(VoiceModel, VoiceProfile.id == VoiceModel.voice_profile_id)
            .where(VoiceProfile.visibility == "public", VoiceModel.preview_url.isnot(None))
            .order_by(VoiceProfile.created_at)
        )
        rows = result.all()

        base = os.path.abspath(settings.LOCAL_STORAGE_PATH)
        
        for name, url in rows:
            # url = /api/v1/uploads/serve/vc-outputs/outputs/...
            rel = url.replace("/api/v1/uploads/serve/", "")
            src = os.path.join(base, rel)
            safe_name = name.lower().replace(" ", "_").replace("(", "").replace(")", "")
            dst = os.path.join(hub_dir, f"{safe_name}.wav")
            
            if os.path.exists(src):
                shutil.copy2(src, dst)
                size_kb = os.path.getsize(dst) // 1024
                print(f"  OK {name:25s} -> {safe_name}.wav ({size_kb} KB)")
            else:
                print(f"  MISS {name:25s} -- source not found: {src}")

    print(f"\nAll files copied to: {os.path.abspath(hub_dir)}")

if __name__ == "__main__":
    asyncio.run(main())
