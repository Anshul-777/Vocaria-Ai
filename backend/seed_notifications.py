import asyncio
import sys
import os

# Add backend to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app.models import User, Notification
from sqlalchemy import select

async def seed():
    async with SessionLocal() as db:
        # Get all users to ensure the current logged-in user gets them
        result = await db.execute(select(User))
        users = result.scalars().all()
        if not users:
            print("No users found")
            return
            
        now = datetime.now(timezone.utc)
        total_inserted = 0
        
        for user in users:
            notifs = [
                Notification(
                    user_id=user.id,
                    type="system_alert",
                title="👋 Welcome to Vocaria AI!",
                message="Your creative workspace is ready. Start by creating a voice profile or cloning your first voice.",
                created_at=now - timedelta(minutes=5)
            ),
            Notification(
                user_id=user.id,
                type="plan_changed",
                title="🎁 Welcome Bonus: 25% Off Pro Plan",
                message="As a new user, enjoy a 25% discount on your first premium purchase! Use code: WELCOME25 at checkout.",
                action_url="/billing",
                created_at=now - timedelta(minutes=4)
            ),
            Notification(
                user_id=user.id,
                type="quota_warning",
                title="✨ Free Credits Allocated",
                message="Your monthly free allowance has been added: 3 Voice Profiles, 10 Generation Minutes.",
                created_at=now - timedelta(minutes=3)
            ),
            Notification(
                user_id=user.id,
                type="generation_complete",
                title="🎙️ Voice Generation Complete",
                message="Your text-to-speech generation 'Welcome Message' is ready for download.",
                created_at=now - timedelta(minutes=2)
            ),
            Notification(
                user_id=user.id,
                type="system_alert",
                title="⏳ Premium Plan Expiring Soon",
                message="Just a heads-up: If you were on a Premium plan, it would renew in 3 days. Check your billing.",
                action_url="/billing",
                created_at=now - timedelta(minutes=1)
            ),
            Notification(
                user_id=user.id,
                type="quota_exceeded",
                title="⚠️ Free Credits Ended",
                message="You have used all your free generation minutes for this month. Upgrade to Pro to continue.",
                action_url="/billing",
                created_at=now
            )
            ]
            db.add_all(notifs)
            total_inserted += len(notifs)
            
        await db.commit()
        print(f"Successfully injected {total_inserted} real notifications across {len(users)} users.")

if __name__ == "__main__":
    asyncio.run(seed())
