from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, JSON, Enum as SQLEnum, Text, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base
import uuid

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

# ─── Enums ─────────────────────────────────────────────────────────────
class AuditAction(str, enum.Enum):
    REGISTER = "register"
    LOGIN = "login"
    LOGOUT = "logout"
    UPDATE_PROFILE = "update_profile"
    CREATE_VOICE = "create_voice"
    DELETE_VOICE = "delete_voice"
    GENERATE_AUDIO = "generate_audio"
    CLONE_VOICE = "clone_voice"
    DETECT_AUDIO = "detect_audio"

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class NotificationType(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ERROR = "error"
    SYSTEM_ALERT = "system_alert"
    PLAN_CHANGED = "plan_changed"
    QUOTA_WARNING = "quota_warning"

class DetectionVerdict(str, enum.Enum):
    REAL = "real"
    FAKE = "fake"
    UNCERTAIN = "uncertain"

class PlanTier(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class VoiceVisibility(str, enum.Enum):
    PRIVATE = "private"
    UNLISTED = "unlisted"
    PUBLIC = "public"

# ─── Association Tables ────────────────────────────────────────────────
user_followers = Table(
    'user_followers',
    Base.metadata,
    Column('follower_id', String, ForeignKey('users.id'), primary_key=True),
    Column('followed_id', String, ForeignKey('users.id'), primary_key=True)
)

# ─── Models ────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)
    oauth_provider_id = Column(String, unique=True, nullable=True)
    
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    website = Column(String, nullable=True)
    location = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    
    plan_tier = Column(SQLEnum(PlanTier), default=PlanTier.FREE)
    plan_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    preferred_language = Column(String, default="en")
    timezone = Column(String, default="UTC")
    email_notifications = Column(Boolean, default=True)
    
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    voices_count = Column(Integer, default=0)
    plays_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    device_info = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class EmailVerification(Base):
    __tablename__ = "email_verifications"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

class PasswordReset(Base):
    __tablename__ = "password_resets"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(SQLEnum(AuditAction), nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    status = Column(String, default="success")
    created_at = Column(DateTime(timezone=True), default=utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False) # e.g. system_alert
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class VoiceProfile(Base):
    __tablename__ = "voice_profiles"
    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    visibility = Column(SQLEnum(VoiceVisibility), default=VoiceVisibility.PRIVATE)
    is_cloned = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_archived = Column(Boolean, default=False)
    model_id = Column(String, nullable=True)
    language = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    age_style = Column(String, nullable=True)
    accent = Column(String, nullable=True)
    speaking_style = Column(String, nullable=True)
    emotion_tags = Column(JSON, nullable=True)
    use_case_tags = Column(JSON, nullable=True)
    custom_tags = Column(JSON, nullable=True)
    avatar_url = Column(String, nullable=True)
    likes_count = Column(Integer, default=0)
    plays_count = Column(Integer, default=0)
    clones_count = Column(Integer, default=0)
    downloads_count = Column(Integer, default=0)
    is_hub_featured = Column(Boolean, default=False)
    license_type = Column(String, nullable=True)
    consent_verified = Column(Boolean, default=False)
    embedding_path = Column(String, nullable=True)
    preview_url = Column(String, nullable=True)
    training_status = Column(String, nullable=True)
    is_pinned = Column(Boolean, default=False)
    consent_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    models = relationship("VoiceModel", back_populates="voice_profile", cascade="all, delete-orphan")
    samples = relationship("VoiceSample", back_populates="voice_profile", cascade="all, delete-orphan")


class VoiceSample(Base):
    __tablename__ = "voice_samples"
    id = Column(String, primary_key=True, default=generate_uuid)
    voice_profile_id = Column(String, ForeignKey("voice_profiles.id", ondelete="CASCADE"), nullable=False)
    storage_key = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    format = Column(String, nullable=True)
    sha256_hash = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    voice_profile = relationship("VoiceProfile", back_populates="samples")


class GenerationJob(Base):
    __tablename__ = "generation_jobs"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    voice_profile_id = Column(String, ForeignKey("voice_profiles.id", ondelete="CASCADE"), nullable=True)
    celery_task_id = Column(String, nullable=True)
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING)
    progress = Column(Float, default=0.0)
    text = Column(Text, nullable=False)
    language = Column(String, nullable=True)
    emotion = Column(String, nullable=True)
    speaking_style = Column(String, nullable=True)
    speed = Column(Float, default=1.0)
    pitch = Column(Float, default=1.0)
    temperature = Column(Float, default=0.7)
    output_format = Column(String, nullable=True)
    use_ssml = Column(Boolean, default=False)
    output_url = Column(String, nullable=True)
    output_storage_key = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    character_count = Column(Integer, default=0)
    file_size_bytes = Column(Integer, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    is_streaming = Column(Boolean, default=False)
    extra_metadata = Column(JSON, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class CloneJob(Base):
    __tablename__ = "clone_jobs"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    voice_profile_id = Column(String, ForeignKey("voice_profiles.id", ondelete="CASCADE"), nullable=False)
    celery_task_id = Column(String, nullable=True)
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING)
    mode = Column(String, nullable=True)
    fine_tune_steps = Column(Integer, nullable=True)
    progress = Column(Float, default=0.0)
    progress_message = Column(String, nullable=True)
    quality_score = Column(Float, nullable=True)
    similarity_score = Column(Float, nullable=True)
    preview_url = Column(String, nullable=True)
    is_public = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    extra_metadata = Column(JSON, nullable=True)
    queued_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class DetectionJob(Base):
    __tablename__ = "detection_jobs"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    file_path = Column(String, nullable=False)
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING)
    verdict = Column(SQLEnum(DetectionVerdict), nullable=True)
    confidence = Column(Float, nullable=True)
    is_synthetic = Column(Boolean, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class UsageRecord(Base):
    __tablename__ = "usage_records"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    month_year = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    quantity = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_tier = Column(SQLEnum(PlanTier), default=PlanTier.FREE)
    billing_cycle = Column(String, nullable=False, default="monthly")
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class VoiceModel(Base):
    __tablename__ = "voice_models"
    id = Column(String, primary_key=True, default=generate_uuid)
    voice_profile_id = Column(String, ForeignKey("voice_profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    model_version = Column(String, nullable=False, default="xtts_v2")
    source_type = Column(String, nullable=False, default="cloned")
    is_synthetic = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    training_status = Column(String, nullable=False, default="pending")
    preview_url = Column(String, nullable=True)
    prompt_text = Column(Text, nullable=True)
    quality_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    voice_profile = relationship("VoiceProfile", back_populates="models")


class VoiceLike(Base):
    __tablename__ = "voice_likes"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    voice_profile_id = Column(String, ForeignKey("voice_profiles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class SavedVoice(Base):
    __tablename__ = "saved_voices"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    voice_profile_id = Column(String, ForeignKey("voice_profiles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class VoiceComment(Base):
    __tablename__ = "voice_comments"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    voice_profile_id = Column(String, ForeignKey("voice_profiles.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class UserFollow(Base):
    __tablename__ = "user_follows_record"
    id = Column(String, primary_key=True, default=generate_uuid)
    follower_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    followed_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    storage_key = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    sha256_hash = Column(String, nullable=True)
    purpose = Column(String, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), default=utcnow)

class QualityAnalysis(Base):
    __tablename__ = "quality_analyses"
    id = Column(String, primary_key=True, default=generate_uuid)
    file_id = Column(String, ForeignKey("uploaded_files.id", ondelete="CASCADE"), nullable=False)
    quality_score = Column(Float, nullable=False)
    snr = Column(Float, nullable=True)
    clipping_ratio = Column(Float, nullable=True)
    background_noise_level = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class StreamSession(Base):
    __tablename__ = "stream_sessions"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_type = Column(String, nullable=False) # audio, video
    status = Column(String, default="active")
    duration_seconds = Column(Integer, nullable=True)
    current_verdict = Column(String, nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
