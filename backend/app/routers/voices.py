"""Vocaria Voice Profiles Router"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, update
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid, logging

from app.database import get_db
from app.models import User, VoiceProfile, VoiceSample, VoiceModel, GenerationJob, VoiceLike, VoiceComment, VoiceVisibility, AuditLog, AuditAction
from app.services.auth_service import get_current_user
from app.services.entitlement_service import check_voice_profile_quota

router = APIRouter()
logger = logging.getLogger(__name__)


class VoiceProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None
    language: str = "en"
    gender: Optional[str] = None
    age_style: Optional[str] = None
    accent: Optional[str] = None
    speaking_style: Optional[str] = None
    emotion_tags: List[str] = []
    use_case_tags: List[str] = []
    custom_tags: List[str] = []
    visibility: str = "private"
    license_type: str = "personal"
    consent_verified: bool = False
    consent_text: Optional[str] = None


class VoiceProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    gender: Optional[str] = None
    age_style: Optional[str] = None
    accent: Optional[str] = None
    speaking_style: Optional[str] = None
    emotion_tags: Optional[List[str]] = None
    use_case_tags: Optional[List[str]] = None
    custom_tags: Optional[List[str]] = None
    visibility: Optional[str] = None
    avatar_url: Optional[str] = None
    is_pinned: Optional[bool] = None
    pinned_at: Optional[datetime] = None

class VoiceModelUpdate(BaseModel):
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None
def voice_to_dict(v: VoiceProfile, current_user_id: str = None) -> dict:
    active_model = next((m for m in getattr(v, "models", []) if m.is_active), None)
    if not active_model and getattr(v, "models", []):
        active_model = v.models[0] # Fallback to first if none active

    return {
        "id": v.id, "name": v.name, "description": v.description,
        "owner_id": v.owner_id, "language": v.language, "gender": v.gender,
        "age_style": v.age_style, "accent": v.accent, "speaking_style": v.speaking_style,
        "emotion_tags": v.emotion_tags or [], "use_case_tags": v.use_case_tags or [],
        "custom_tags": v.custom_tags or [], "visibility": v.visibility,
        "avatar_url": v.avatar_url, "preview_url": active_model.preview_url if active_model else None,
        "base_model": active_model.model_version if active_model else "xtts_v2", 
        "fine_tuned": active_model.source_type == "cloned" if active_model else False,
        "quality_score": active_model.quality_score if active_model else None, 
        "similarity_score": None,
        "likes_count": v.likes_count, "plays_count": v.plays_count,
        "clones_count": v.clones_count, "downloads_count": v.downloads_count,
        "training_status": active_model.training_status if active_model else "empty", 
        "is_active": v.is_active,
        "is_archived": v.is_archived, "is_hub_featured": v.is_hub_featured,
        "license_type": v.license_type, "consent_verified": v.consent_verified,
        "is_synthetic": active_model.is_synthetic if active_model else False,
        "is_pinned": getattr(v, "is_pinned", False),
        "pinned_at": getattr(v, "pinned_at", None),
        "created_at": v.created_at, "updated_at": v.updated_at,
    }


@router.post("/", status_code=201)
async def create_voice_profile(
    body: VoiceProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_voice_profile_quota(current_user, db)
    if body.visibility.upper() not in ["PRIVATE", "ORGANIZATION", "PUBLIC"]:
        raise HTTPException(400, "Invalid visibility")
    profile = VoiceProfile(
        owner_id=current_user.id,
        name=body.name, description=body.description,
        language=body.language, gender=body.gender, age_style=body.age_style,
        accent=body.accent, speaking_style=body.speaking_style,
        emotion_tags=body.emotion_tags, use_case_tags=body.use_case_tags,
        custom_tags=body.custom_tags, visibility=body.visibility.upper(),
        license_type=body.license_type, consent_verified=body.consent_verified,
        consent_text=body.consent_text,
    )
    db.add(profile)
    db.add(AuditLog(user_id=current_user.id, action=AuditAction.VOICE_CREATE,
                    resource_type="voice_profile", details={"name": body.name}))
    await db.commit()
    
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(VoiceProfile).options(selectinload(VoiceProfile.models)).where(VoiceProfile.id == profile.id))
    profile = result.scalar_one()
    
    return voice_to_dict(profile)


@router.get("/")
async def list_my_voices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    language: Optional[str] = None,
    visibility: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(VoiceProfile).where(
        VoiceProfile.owner_id == current_user.id,
        VoiceProfile.is_active == True,
    )
    if search:
        q = q.where(or_(VoiceProfile.name.ilike(f"%{search}%"), VoiceProfile.description.ilike(f"%{search}%")))
    if language:
        q = q.where(VoiceProfile.language == language)
    if visibility:
        q = q.where(VoiceProfile.visibility == visibility)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    
    q = q.options(selectinload(VoiceProfile.models))
    q = q.order_by(
        desc(VoiceProfile.is_pinned),
        desc(VoiceProfile.pinned_at),
        desc(VoiceProfile.created_at)
    )
    result = await db.execute(q.offset((page-1)*page_size).limit(page_size))
    voices = result.scalars().all()
    return {"total": total, "page": page, "page_size": page_size, "voices": [voice_to_dict(v) for v in voices]}


from sqlalchemy.orm import selectinload

@router.get("/{voice_id}")
async def get_voice(voice_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VoiceProfile).options(selectinload(VoiceProfile.models)).where(VoiceProfile.id == voice_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Voice not found")
    if v.owner_id != current_user.id and v.visibility == "private":
        raise HTTPException(403, "Access denied")
    return voice_to_dict(v)


@router.put("/{voice_id}")
async def update_voice(
    voice_id: str, body: VoiceProfileUpdate,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(VoiceProfile).options(selectinload(VoiceProfile.models)).where(VoiceProfile.id == voice_id, VoiceProfile.owner_id == current_user.id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Voice not found")
    for field, val in body.dict(exclude_none=True).items():
        setattr(v, field, val)
    v.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    result = await db.execute(select(VoiceProfile).options(selectinload(VoiceProfile.models)).where(VoiceProfile.id == voice_id))
    v = result.scalar_one_or_none()
    return voice_to_dict(v)


@router.delete("/{voice_id}")
async def delete_voice(voice_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VoiceProfile).where(VoiceProfile.id == voice_id, VoiceProfile.owner_id == current_user.id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Voice not found")
    v.is_active = False
    v.is_archived = True
    db.add(AuditLog(user_id=current_user.id, action=AuditAction.VOICE_DELETE,
                    resource_type="voice_profile", resource_id=voice_id))
    await db.commit()
    return {"message": "Voice archived"}


@router.post("/{voice_id}/like")
async def toggle_like(voice_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VoiceProfile).where(VoiceProfile.id == voice_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Voice not found")
    existing = await db.execute(select(VoiceLike).where(VoiceLike.voice_profile_id == voice_id, VoiceLike.user_id == current_user.id))
    like = existing.scalar_one_or_none()
    if like:
        await db.delete(like)
        v.likes_count = max(0, v.likes_count - 1)
        liked = False
    else:
        db.add(VoiceLike(voice_profile_id=voice_id, user_id=current_user.id))
        v.likes_count += 1
        liked = True
    await db.commit()
    return {"liked": liked, "likes_count": v.likes_count}


@router.post("/{voice_id}/comments")
async def add_comment(
    voice_id: str, content: str, parent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    if len(content.strip()) < 1 or len(content) > 2000:
        raise HTTPException(400, "Comment must be 1-2000 characters")
    comment = VoiceComment(voice_profile_id=voice_id, user_id=current_user.id,
                           content=content.strip())
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return {"id": comment.id, "content": comment.content, "created_at": comment.created_at}


@router.get("/{voice_id}/comments")
async def list_comments(voice_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VoiceComment, User.username, User.display_name, User.avatar_url)
        .join(User, VoiceComment.user_id == User.id)
        .where(VoiceComment.voice_profile_id == voice_id)
        .order_by(desc(VoiceComment.created_at))
    )
    rows = result.all()
    return [{"id": r[0].id, "content": r[0].content, "user": {"username": r[1], "display_name": r[2], "avatar_url": r[3]}, "created_at": r[0].created_at} for r in rows]

class AttachGenerationRequest(BaseModel):
    job_id: str

@router.post("/{voice_id}/attach_generation")
async def attach_generation(voice_id: str, body: AttachGenerationRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VoiceProfile).options(selectinload(VoiceProfile.models)).where(VoiceProfile.id == voice_id, VoiceProfile.owner_id == current_user.id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Voice profile not found")

    existing_models_res = await db.execute(select(VoiceModel).where(VoiceModel.voice_profile_id == voice_id, VoiceModel.source_type == "generated", VoiceModel.is_active == True))
    if existing_models_res.scalars().first():
        raise HTTPException(400, "Profile already contains a generated voice model. Limit is 1 generated and 1 cloned per profile.")

    job_result = await db.execute(select(GenerationJob).where(GenerationJob.id == body.job_id, GenerationJob.user_id == current_user.id))
    job = job_result.scalar_one_or_none()
    from app.models import JobStatus
    if not job or job.status != JobStatus.COMPLETED or not job.output_storage_key:
        raise HTTPException(400, "Invalid or incomplete generation job")

    from app.utils.storage import get_storage
    from app.config import settings
    storage = await get_storage()
    preview_url = await storage.presigned_url(settings.BUCKET_OUTPUTS, job.output_storage_key, expires_hours=24*365)

    model = VoiceModel(
        voice_profile_id=voice_id,
        model_version="xtts_v2",
        source_type="generated",
        is_synthetic=True,
        is_active=True,
        training_status="ready",
        preview_url=preview_url,
        prompt_text=job.emotion,
        quality_score=0.96
    )
    db.add(model)
    await db.commit()
    
    result = await db.execute(select(VoiceProfile).options(selectinload(VoiceProfile.models)).where(VoiceProfile.id == voice_id))
    v = result.scalar_one_or_none()
    return voice_to_dict(v)


@router.get("/{voice_id}/models")
async def list_voice_models(voice_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VoiceProfile).where(VoiceProfile.id == voice_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Voice not found")
    if v.owner_id != current_user.id and v.visibility == "private":
        raise HTTPException(403, "Access denied")

    models_res = await db.execute(
        select(VoiceModel).where(VoiceModel.voice_profile_id == voice_id).order_by(desc(VoiceModel.created_at))
    )
    models = models_res.scalars().all()
    
    from app.models import CloneJob
    cj_res = await db.execute(
        select(CloneJob).where(CloneJob.voice_profile_id == voice_id, CloneJob.status == "completed", CloneJob.preview_url.isnot(None)).order_by(desc(CloneJob.created_at))
    )
    clone_jobs = cj_res.scalars().all()
    
    combined = []
    for m in models:
        combined.append({
            "id": m.id,
            "source_type": m.source_type,
            "model_version": m.model_version,
            "training_status": m.training_status,
            "preview_url": m.preview_url,
            "quality_score": m.quality_score,
            "is_active": m.is_active,
            "is_public": getattr(m, "is_public", False),
            "created_at": m.created_at
        })
        
    for c in clone_jobs:
        combined.append({
            "id": c.id,
            "source_type": "cloned",
            "model_version": getattr(c, "mode", "xtts_v2") or "xtts_v2",
            "training_status": "ready",
            "preview_url": c.preview_url,
            "quality_score": c.quality_score,
            "is_active": True,
            "is_public": getattr(c, "is_public", False),
            "created_at": c.created_at
        })
        
    combined.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {"models": combined}


@router.put("/{voice_id}/models/{model_id}")
async def update_voice_model(
    voice_id: str, 
    model_id: str, 
    data: VoiceModelUpdate, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # Check if voice profile belongs to user
    v_res = await db.execute(select(VoiceProfile).where(VoiceProfile.id == voice_id))
    v = v_res.scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Voice profile not found")
    if v.owner_id != current_user.id:
        raise HTTPException(403, "Access denied")
        
    m_res = await db.execute(
        select(VoiceModel).where(VoiceModel.id == model_id, VoiceModel.voice_profile_id == voice_id)
    )
    m = m_res.scalar_one_or_none()
    if not m:
        from app.models import CloneJob
        m_res = await db.execute(
            select(CloneJob).where(CloneJob.id == model_id, CloneJob.voice_profile_id == voice_id)
        )
        m = m_res.scalar_one_or_none()
        if not m:
            raise HTTPException(404, "Voice model not found")
        
    if data.is_public is not None:
        m.is_public = data.is_public
    if data.is_active is not None:
        m.is_active = data.is_active
        
    await db.commit()
    return {"status": "success", "is_public": getattr(m, 'is_public', False), "is_active": getattr(m, 'is_active', True)}

