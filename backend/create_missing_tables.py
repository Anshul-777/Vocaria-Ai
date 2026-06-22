import asyncio
from app.database import engine, Base
from app.models import *

async def create_missing_tables():
    print("Creating all missing tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(create_missing_tables())
