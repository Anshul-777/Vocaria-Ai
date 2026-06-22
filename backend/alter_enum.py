import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    actions = [
        "voice_create", "voice_delete", "generation_start", "generation_complete",
        "clone_start", "clone_complete", "detection_start", "detection_complete",
        "evidence_export", "plan_change", "api_key_create", "api_key_revoke",
        "profile_update"
    ]
    async with engine.connect() as conn:
        conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
        for action in actions:
            try:
                await conn.execute(text(f"ALTER TYPE auditaction ADD VALUE '{action}';"))
                print(f"Added {action}")
            except Exception as e:
                print(f"Skipped {action}: {e}")

asyncio.run(main())
