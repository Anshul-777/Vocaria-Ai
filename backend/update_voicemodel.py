import asyncio
from app.database import engine, Base
from sqlalchemy import text

async def update_db():
    async with engine.begin() as conn:
        # Drop voice_models table to recreate it with the new schema
        await conn.execute(text("DROP TABLE IF EXISTS voice_models CASCADE"))
    
    # Recreate missing tables (which includes the new voice_models schema)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(update_db())
