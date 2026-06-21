import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def run():
    engine = create_async_engine(os.environ.get('DATABASE_URL'))
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE detection_jobs ADD COLUMN IF NOT EXISTS pipeline_metrics JSON;'))
    print('Column added')

asyncio.run(run())
