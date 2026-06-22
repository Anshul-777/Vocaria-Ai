import asyncio
from app.database import engine
from sqlalchemy import text

async def alter_tables():
    try:
        async with engine.begin() as conn:
            await conn.execute(text('ALTER TABLE voice_profiles ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE NULL;'))
            print("Added pinned_at")
    except Exception as e:
        print("pinned_at:", e)
    
    try:
        async with engine.begin() as conn:
            await conn.execute(text('ALTER TABLE voice_profiles ADD COLUMN consent_text TEXT NULL;'))
            print("Added consent_text")
    except Exception as e:
        print("consent_text:", e)
        
    print('Done altering tables.')

if __name__ == "__main__":
    asyncio.run(alter_tables())
