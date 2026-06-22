import asyncio
from app.database import engine, Base
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import SessionLocal
from app.models import User, Subscription
from datetime import datetime, timezone, timedelta

async def make_enterprise():
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "yuki.007690@gmail.com"))
        user = result.scalar_one_or_none()
        if not user:
            print("User yuki.007690@gmail.com not found. Creating user...")
            from app.services.auth_service import hash_password
            user = User(
                email="yuki.007690@gmail.com",
                username="yuki",
                display_name="Yuki",
                hashed_password=hash_password("REDACTED_PASSWORD"),
                plan_tier="enterprise"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            user.plan_tier = "enterprise"
            await db.commit()
            
        print("Ensuring subscription exists...")
        result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
        sub = result.scalar_one_or_none()
        if not sub:
            sub = Subscription(
                user_id=user.id,
                plan_tier="enterprise",
                status="active"
            )
            db.add(sub)
        else:
            sub.plan_tier = "enterprise"
            sub.status = "active"
        
        await db.commit()
        print("User yuki.007690@gmail.com is now ENTERPRISE!")

if __name__ == "__main__":
    asyncio.run(make_enterprise())
