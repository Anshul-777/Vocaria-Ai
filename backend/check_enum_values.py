import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'jobstatus';"))
        rows = result.fetchall()
        print("Valid jobstatus values in DB:", [r[0] for r in rows])

        result2 = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'voicevisibility';"))
        rows2 = result2.fetchall()
        print("Valid voicevisibility values in DB:", [r[0] for r in rows2])

asyncio.run(main())
