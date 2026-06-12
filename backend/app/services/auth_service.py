"""
Vocaria Auth Service
JWT creation/validation, password hashing, current user dependency.
"""

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, or_
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from typing import Optional, Union
import httpx
import hashlib
import logging

from app.database import get_db
from app.config import settings

logger = logging.getLogger(__name__)

# Global httpx client to prevent WinError 10055 socket exhaustion
# We must reuse the same client for all Supabase API calls.
_supabase_client = httpx.AsyncClient(
    limits=httpx.Limits(max_keepalive_connections=50, max_connections=100),
    timeout=10.0
)

def get_supabase_client():
    return _supabase_client

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    api_key: Optional[str] = Security(api_key_header),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user from JWT or API key."""
    from app.models import User, APIKey
    import logging
    from fastapi import Request

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = None
    email = None
    full_name = None

    # Try JWT first (via Supabase)
    if token:
        print(f"\n[AUTH DEBUG] Received token! Length: {len(token)}, Starts with: {token[:10]}...")
        # We verify the token by fetching the user profile from Supabase API
        headers = {
            "apikey": settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {token}"
        }
        try:
            resp = await _supabase_client.get(f"{settings.SUPABASE_URL}/auth/v1/user", headers=headers)
            if resp.status_code == 200:
                user_data = resp.json()
                user_id = user_data.get("id")
                email = user_data.get("email")
                full_name = user_data.get("user_metadata", {}).get("full_name", "")
            else:
                logger.error(f"Supabase auth failed: {resp.status_code} {resp.text}")
                credentials_exception.detail = f"Supabase auth failed: {resp.status_code} {resp.text}"
        except Exception as e:
            logger.error(f"Failed to verify Supabase token: {e}")
            credentials_exception.detail = f"Failed to verify Supabase token: {str(e)}"
    else:
        print("\n[AUTH DEBUG] No token provided in Authorization header!\n")

    # Try API key
    if not user_id and api_key:
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        result = await db.execute(
            select(APIKey).where(
                APIKey.key_hash == key_hash,
                APIKey.is_active == True,
                APIKey.revoked_at.is_(None),
            )
        )
        api_key_record = result.scalar_one_or_none()
        if api_key_record:
            if api_key_record.expires_at and api_key_record.expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="API key expired")

            # Update last used
            api_key_record.last_used_at = datetime.now(timezone.utc)
            api_key_record.usage_count += 1
            await db.commit()

            user_id = api_key_record.user_id

    if not user_id:
        logger.error(f"user_id is None! token was: {token[:10] if token else 'None'}, email was: {email if 'email' in locals() else 'Unknown'}")
        raise credentials_exception

    # First check by Supabase ID (either as primary ID or oauth_provider_id)
    result = await db.execute(select(User).where(
        or_(User.id == user_id, User.oauth_provider_id == user_id)
    ))
    user = result.scalar_one_or_none()

    # If not found by ID, try to find by email (for users created before Supabase migration)
    if not user and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            # Link their old account to their new Supabase ID
            user.oauth_provider_id = user_id
            try:
                await db.commit()
                await db.refresh(user)
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to link Supabase ID to existing user: {e}")

    if not user:
        if token and email:
            import re
            base_username = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0])
            if not base_username:
                base_username = "user"
            
            # Auto-create user from Supabase
            user = User(
                id=user_id,
                email=email,
                username=f"{base_username}_{user_id[:6]}",
                display_name=full_name or base_username,
            )
            db.add(user)
            try:
                await db.commit()
                await db.refresh(user)
            except Exception as e:
                await db.rollback()
                if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
                    # Race condition: another request just created the user
                    result = await db.execute(select(User).where(User.id == user_id))
                    user = result.scalar_one_or_none()
                    if not user:
                        credentials_exception.detail = "Race condition auto-creating user, but user still not found"
                        raise credentials_exception
                else:
                    logger.error(f"Failed to auto-create user: {e}")
                    credentials_exception.detail = f"Database error auto-creating user: {str(e)}"
                    raise credentials_exception
        else:
            credentials_exception.detail = f"User {user_id} not in DB, and email missing from token response. Email: {email}"
    if user is None:
        logger.error(f"Failed to find or create user for email: {email}, user_id: {user_id}")
        raise credentials_exception
        
    return user


async def get_current_active_user(current_user=Depends(get_current_user)):
    """Require active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Inactive account")
    return current_user


async def get_superuser(current_user=Depends(get_current_user)):
    """Require superuser."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser access required")
    return current_user


def require_plan(*tiers):
    """Dependency factory: require user to be on one of the given plan tiers."""
    async def checker(current_user=Depends(get_current_user)):
        if current_user.plan_tier not in tiers:
            raise HTTPException(
                status_code=402,
                detail=f"This feature requires a {' or '.join(t.value for t in tiers)} plan",
            )
        return current_user
    return checker
