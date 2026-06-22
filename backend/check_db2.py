import asyncio
from app.database import engine
from sqlalchemy import text

async def check_db():
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'generation_jobs';
        """))
        cols = result.fetchall()
        print("generation_jobs:")
        for c in cols:
            print("  ", c[0], c[1])

        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'voice_profiles';
        """))
        cols = result.fetchall()
        print("voice_profiles:")
        for c in cols:
            print("  ", c[0], c[1])

if __name__ == "__main__":
    asyncio.run(check_db())
