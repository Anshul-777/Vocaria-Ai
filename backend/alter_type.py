import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TYPE jobstatus ADD VALUE IF NOT EXISTS 'QUEUED';"))
            print("Successfully added QUEUED to jobstatus enum")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(main())
