import asyncio
from app.database import engine, Base
from sqlalchemy import text

async def drop_schema_and_recreate():
    print("Dropping public schema...")
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        print("Schema recreated. Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("All tables recreated successfully!")

asyncio.run(drop_schema_and_recreate())
