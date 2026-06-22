"""Vocaria Model Registry"""
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class ModelRegistry:
    def __init__(self):
        self._models: Dict[str, Any] = {}
        self._versions: Dict[str, str] = {}

    async def initialize(self):
        """Pre-warm key models."""
        try:
            # Pre-warm detection models
            from app.config import settings
            if settings.FEATURE_DETECTION:
                from app.ml.detection_pipeline import get_detection_pipeline
                pipeline = get_detection_pipeline()
                await pipeline.ensure_loaded()
                if pipeline.deepfake_classifier:
                    self._models['deepfake_classifier'] = pipeline.deepfake_classifier
                    self._versions['deepfake_classifier'] = "garystafford/wav2vec2-deepfake-voice-detector"
                if pipeline.squim_objective:
                    self._models['squim_objective'] = pipeline.squim_objective
                    self._versions['squim_objective'] = "torchaudio.SQUIM_OBJECTIVE"
                logger.info("Detection models pre-warmed")

            # Pre-warm TTS models
            from app.ml.tts_pipeline import get_tts_pipeline, get_chatterbox_pipeline, get_parler_pipeline
            tts = get_tts_pipeline()
            await tts.ensure_loaded()
            self._models['kokoro'] = tts._pipeline
            self._versions['kokoro'] = "hexgrad/Kokoro-82M"
            
            try:
                chatterbox = get_chatterbox_pipeline()
                await chatterbox.ensure_loaded()
                self._models['chatterbox'] = chatterbox._model
                self._versions['chatterbox'] = "chatterbox-turbo"
            except Exception as e:
                logger.warning(f"Failed to pre-warm chatterbox: {e}")

            try:
                parler = get_parler_pipeline()
                await parler.ensure_loaded()
                self._models['parler_tts'] = parler._model
                self._versions['parler_tts'] = "parler-tts/parler-tts-mini-v1"
            except Exception as e:
                logger.warning(f"Failed to pre-warm parler-tts: {e}")
                
            logger.info(f"Registered {len(self._models)} models total")
        except Exception as e:
            logger.warning(f"Model pre-warm failed: {e}")

    async def get_loaded_models(self) -> List[str]:
        return list(self._models.keys())

    def get_version(self, name: str) -> str:
        return self._versions.get(name, "unknown")
