import asyncio
from app.database import engine
from sqlalchemy import text

async def alter_tables():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id VARCHAR UNIQUE;'))
            print("Added oauth_provider_id to users")
        except Exception as e:
            print(f"Error adding oauth_provider_id: {e}")
        try:
            await conn.execute(text('ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;'))
            print("Dropped NOT NULL from hashed_password")
        except Exception as e:
            print(f"Error dropping NOT NULL: {e}")
        print('Done altering tables.')

asyncio.run(alter_tables())
