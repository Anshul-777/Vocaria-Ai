import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS storage_key VARCHAR;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS duration_seconds FLOAT;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS sample_rate INTEGER;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS channels INTEGER;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS format VARCHAR;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS snr_db FLOAT;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS rms_db FLOAT;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS peak_db FLOAT;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS speech_ratio FLOAT;"))
        await conn.execute(text("ALTER TABLE quality_analyses ADD COLUMN IF NOT EXISTS issues JSON;"))
        print("Schema altered successfully")

asyncio.run(main())
