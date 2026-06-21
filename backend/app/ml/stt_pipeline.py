import os
import io
import logging
import asyncio
from typing import Optional
from groq import AsyncGroq
from app.config import settings

logger = logging.getLogger(__name__)

class STTPipeline:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        if not self.api_key:
            logger.warning("GROQ_API_KEY is not set. STT will fail.")
        
        # Async client for high throughput websocket streaming
        self.client = AsyncGroq(api_key=self.api_key)

    async def transcribe_audio_chunk(self, audio_bytes: bytes, sample_rate: int = 16000) -> str:
        """
        Sends an audio chunk to Groq's Whisper API.
        Assumes audio_bytes is WAV or raw PCM that can be packaged into WAV.
        """
        if not self.api_key:
            raise ValueError("Groq API key missing")

        # Groq Whisper requires a file-like object with a valid extension
        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = "chunk.wav"

        try:
            # We use whisper-large-v3-turbo for insane speed
            transcription = await self.client.audio.transcriptions.create(
                file=(file_obj.name, file_obj.read()),
                model="whisper-large-v3-turbo",
                response_format="json",
                language="en",
                temperature=0.0
            )
            return transcription.text.strip()
        except Exception as e:
            logger.error(f"Groq STT Error: {e}")
            return ""

_stt_pipeline: Optional[STTPipeline] = None

def get_stt_pipeline() -> STTPipeline:
    global _stt_pipeline
    if _stt_pipeline is None:
        _stt_pipeline = STTPipeline()
    return _stt_pipeline
