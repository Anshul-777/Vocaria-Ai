import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    verdicts = [
        "authentic", "synthetic", "synthetic_tts", "suspicious", "inconclusive"
    ]
    async with engine.connect() as conn:
        conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
        for verdict in verdicts:
            try:
                await conn.execute(text(f"ALTER TYPE detectionverdict ADD VALUE '{verdict}';"))
                print(f"Added {verdict}")
            except Exception as e:
                print(f"Skipped {verdict}: {e}")

asyncio.run(main())
