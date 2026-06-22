import asyncio
import asyncpg
import json

async def check():
    conn = await asyncpg.connect('REDACTED_DB_URL')
    rows = await conn.fetch('SELECT id, status, error_message, extra_metadata FROM generation_jobs ORDER BY created_at DESC LIMIT 3')
    for r in rows:
        print("ID:", r['id'])
        print("Status:", r['status'])
        print("Error:", r['error_message'])
        print("Metadata:", r['extra_metadata'])
        print("---")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
