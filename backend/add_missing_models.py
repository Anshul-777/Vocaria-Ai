import asyncio
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.sql import func
from app.database import engine, Base
from app.models import UploadedFile

class QualityAnalysis(Base):
    __tablename__ = "quality_analyses"

    id = Column(String, primary_key=True, index=True)
    file_id = Column(String, ForeignKey("uploaded_files.id"), nullable=False)
    quality_score = Column(Float, nullable=False)
    snr = Column(Float, nullable=True)
    clipping_ratio = Column(Float, nullable=True)
    background_noise_level = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StreamSession(Base):
    __tablename__ = "stream_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    session_type = Column(String, nullable=False) # audio, video
    status = Column(String, default="active")
    duration_seconds = Column(Integer, nullable=True)
    current_verdict = Column(String, nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

async def add_missing_models():
    print("Creating missing models...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(add_missing_models())
