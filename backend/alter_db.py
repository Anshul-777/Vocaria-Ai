import asyncio
from app.database import engine
from sqlalchemy import text

async def alter_tables():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE generation_jobs ALTER COLUMN speaking_style TYPE text;'))
            print("Altered speaking_style")
        except Exception as e:
            print(e)
        try:
            await conn.execute(text('ALTER TABLE generation_jobs ALTER COLUMN emotion TYPE text;'))
            print("Altered emotion")
        except Exception as e:
            print(e)
        try:
            await conn.execute(text('ALTER TABLE voice_profiles ALTER COLUMN speaking_style TYPE text;'))
        except Exception as e:
            pass
        try:
            await conn.execute(text('ALTER TABLE voice_profiles ALTER COLUMN emotion_tags TYPE jsonb USING emotion_tags::jsonb;'))
        except Exception as e:
            pass
        print('Done altering tables.')

asyncio.run(alter_tables())
