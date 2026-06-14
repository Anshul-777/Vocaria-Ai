import sys
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class DetectionVerdict(str, Enum):
    AUTHENTIC = "authentic"
    SYNTHETIC_TTS = "synthetic_tts"
    VOICE_CONVERSION = "voice_conversion"

class DetectionResultResponse(BaseModel):
    job_id: str
    status: str
    verdict: Optional[str]

try:
    response = DetectionResultResponse(
        job_id="123",
        status="completed",
        verdict=DetectionVerdict.AUTHENTIC,
    )
    print("SUCCESS:", response.model_dump())
except Exception as e:
    print("ERROR:", e)
