import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'auditaction'::regtype;"))
        print([r[0] for r in res])

asyncio.run(main())
