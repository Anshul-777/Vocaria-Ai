"""
Reset ALL fake/simulated data to real values only.
- Wipes all fake DetectionJobs and GenerationJobs that were seeded by populate scripts
- Resets all VoiceProfile likes_count, plays_count, clones_count, downloads_count to 0
- Removes is_hub_featured flag (no featured section, just a flat list)
- Ensures all VoiceModels have is_active=True so they show in search
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import (
    User, VoiceProfile, VoiceModel, DetectionJob, GenerationJob
)
from sqlalchemy import select, update, delete


async def main():
    async with SessionLocal() as db:
        # 1. Delete ALL fake analytics data
        det_count = (await db.execute(select(DetectionJob))).scalars().all()
        gen_count = (await db.execute(select(GenerationJob))).scalars().all()
        print(f"Deleting {len(det_count)} fake DetectionJobs...")
        print(f"Deleting {len(gen_count)} fake GenerationJobs...")
        await db.execute(delete(DetectionJob))
        await db.execute(delete(GenerationJob))

        # 2. Reset ALL VoiceProfile social stats to 0 (real = nobody has played/liked yet)
        await db.execute(
            update(VoiceProfile).values(
                likes_count=0,
                plays_count=0,
                clones_count=0,
                downloads_count=0,
                is_hub_featured=False,  # No featured section
            )
        )
        print("Reset all VoiceProfile stats to 0 (real values).")

        # 3. Ensure ALL VoiceModels are active so they show in search
        await db.execute(
            update(VoiceModel).values(is_active=True)
        )
        print("Set all VoiceModels to is_active=True.")

        await db.commit()

        # 4. Verify
        profiles = (await db.execute(select(VoiceProfile).where(VoiceProfile.visibility == "public"))).scalars().all()
        print(f"\nVerification: {len(profiles)} public voice profiles")
        for p in profiles:
            print(f"  - {p.name} | likes={p.likes_count} plays={p.plays_count} featured={p.is_hub_featured}")

        models = (await db.execute(select(VoiceModel).where(VoiceModel.is_active == True))).scalars().all()
        print(f"\n{len(models)} active VoiceModels")

    print("\nAll fake data wiped. Only real data remains.")


if __name__ == "__main__":
    asyncio.run(main())
