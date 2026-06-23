"""
Vocaria TTS Pipeline
Kokoro-82M based text-to-speech — Apache 2.0 licensed, commercially safe.
Supports 50+ voice presets, multi-language, speed control, and streaming.
Runs efficiently on CPU (no GPU required).

Model: hexgrad/Kokoro-82M
License: Apache License 2.0
Output: 24kHz WAV/MP3/FLAC/OGG
"""

import asyncio
import io
import logging
import os
import tempfile
from pathlib import Path
from typing import AsyncIterator, Optional, Tuple, List, Dict
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Voice Preset Mapping ────────────────────────────────────────────────────
# Maps frontend parameters (gender, age, accent) to Kokoro voice preset codes.
# Prefix: a=American, b=British | f=Female, m=Male
# Full list: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md

VOICE_PRESETS: Dict[str, Dict[str, List[str]]] = {
    "female": {
        "american": ["af_heart", "af_alloy", "af_sky", "af_bella", "af_nicole", "af_sarah", "af_nova"],
        "british":  ["bf_alice", "bf_emma", "bf_isabella", "bf_lily"],
        "default":  ["af_heart", "af_sky", "af_bella"],
    },
    "male": {
        "american": ["am_adam", "am_michael", "am_fenrir", "am_echo", "am_liam", "am_onyx"],
        "british":  ["bm_george", "bm_daniel", "bm_fable", "bm_lewis"],
        "default":  ["am_adam", "am_michael", "am_echo"],
    },
    "non-binary": {
        "american": ["af_nova", "am_echo"],
        "british":  ["bf_emma", "bm_fable"],
        "default":  ["af_nova", "am_echo"],
    },
    "androgynous": {
        "american": ["af_nova", "am_echo"],
        "british":  ["bf_emma", "bm_fable"],
        "default":  ["af_nova", "am_echo"],
    },
}

# Emotion-to-preset bias: some voices sound more fitting for certain emotions
EMOTION_VOICE_BIAS: Dict[str, Dict[str, str]] = {
    "happy":      {"female": "af_sky",    "male": "am_michael"},
    "excited":    {"female": "af_sky",    "male": "am_fenrir"},
    "sad":        {"female": "af_bella",  "male": "am_adam"},
    "angry":      {"female": "af_nicole", "male": "am_fenrir"},
    "calm":       {"female": "af_heart",  "male": "am_adam"},
    "whispering": {"female": "af_heart",  "male": "am_echo"},
    "neutral":    {"female": "af_heart",  "male": "am_adam"},
}

# Supported languages in Kokoro (lang_code prefix)
SUPPORTED_LANGUAGES = {
    "en": ("a", "American English"),
    "en-us": ("a", "American English"),
    "en-gb": ("b", "British English"),
    "ja": ("j", "Japanese"),
    "zh": ("z", "Mandarin Chinese"),
    "es": ("e", "Spanish"),
    "fr": ("f", "French"),
    "hi": ("h", "Hindi"),
    "it": ("i", "Italian"),
    "pt": ("p", "Brazilian Portuguese"),
    "ko": ("k", "Korean"),
}


def select_voice_preset(
    gender: str = "female",
    accent: str = "american",
    emotion: str = "neutral",
    age: str = "young adult",
) -> str:
    """
    Select the best Kokoro voice preset based on frontend parameters.
    Returns a voice preset code like 'af_heart'.
    """
    gender_key = gender.lower().strip()
    accent_key = accent.lower().strip()
    emotion_key = emotion.lower().strip()

    # Normalize accent to american/british
    if accent_key in ("australian", "irish", "american", "french", "german", "spanish", "italian"):
        if accent_key == "british":
            accent_key = "british"
        else:
            accent_key = "american"  # Default non-British accents to American presets

    # Check emotion bias first for natural-sounding selection
    gender_simple = "female" if gender_key in ("female", "non-binary", "androgynous") else "male"
    if emotion_key in EMOTION_VOICE_BIAS:
        biased = EMOTION_VOICE_BIAS[emotion_key].get(gender_simple)
        if biased:
            return biased

    # Fall back to gender + accent lookup
    gender_presets = VOICE_PRESETS.get(gender_key, VOICE_PRESETS.get("female", {}))
    accent_presets = gender_presets.get(accent_key, gender_presets.get("default", ["af_heart"]))

    if not accent_presets:
        return "af_heart"

    # Age-based selection within the preset list
    # Child/Elderly → first preset (typically softer), Young Adult → varied
    if age.lower() in ("child", "elderly"):
        return accent_presets[0]
    elif len(accent_presets) > 1:
        return accent_presets[1]  # Second preset tends to be more dynamic
    return accent_presets[0]


class TTSPipeline:
    """
    Production TTS pipeline using Kokoro-82M.
    Apache 2.0 licensed — fully commercially safe.
    """

    def __init__(self):
        self._pipeline = None
        self.sample_rate = 24000  # Kokoro native output rate
        self._loading = False
        self._loaded = False

    async def ensure_loaded(self):
        """Lazy-load the Kokoro pipeline on first use."""
        if self._loaded:
            return
        if self._loading:
            while self._loading:
                await asyncio.sleep(0.1)
            return

        self._loading = True
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._load_model)
            self._loaded = True
            logger.info("✅ Kokoro-82M TTS pipeline loaded successfully")
        except Exception as e:
            logger.error(f"❌ Kokoro TTS model load failed: {e}")
            raise
        finally:
            self._loading = False

    def _load_model(self):
        """Load Kokoro pipeline (blocking, run in executor)."""
        try:
            from kokoro import KPipeline
        except ImportError:
            from kokoro.pipeline import KPipeline  # fallback

        # Default to American English
        lang_code = "a"
        self._pipeline = KPipeline(lang_code=lang_code)
        logger.info(f"Kokoro-82M loaded (lang={lang_code}, sample_rate={self.sample_rate})")

    def _get_pipeline_for_language(self, language: str):
        """Get or create a pipeline for a specific language."""
        lang_info = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES.get("en"))
        lang_code = lang_info[0] if lang_info else "a"

        # For non-English, we may need a different pipeline instance
        # For now, the main pipeline handles English; we reload for other languages
        if lang_code != "a" and self._pipeline is not None:
            try:
                from kokoro import KPipeline
                return KPipeline(lang_code=lang_code)
            except Exception as e:
                logger.warning(f"Failed to load pipeline for lang={lang_code}: {e}, falling back to English")
                return self._pipeline

        return self._pipeline

    async def synthesize(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speaker_wav: Optional[str] = None,
        language: str = "en",
        emotion: str = "neutral",
        speed: float = 1.0,
        temperature: float = 0.7,
        output_format: str = "wav",
        gender: str = "female",
        accent: str = "american",
        age: str = "young adult",
        **kwargs,
    ) -> Tuple[bytes, int]:
        """
        Generate speech from text using Kokoro-82M.
        Returns (audio_bytes, sample_rate).

        Parameters:
            text: The text to synthesize
            voice_id: Optional specific Kokoro voice preset (e.g., 'af_heart')
            speaker_wav: Not used by Kokoro (kept for API compat)
            language: Language code (en, ja, zh, es, fr, etc.)
            emotion: Emotion tag for voice preset selection
            speed: Speech speed multiplier (0.5-2.0)
            temperature: Not used by Kokoro (stored for DB logging)
            output_format: wav, mp3, flac, ogg
            gender: Male, Female, Non-Binary, Androgynous
            accent: American, British, etc.
            age: Child, Young Adult, Middle Aged, Elderly
        """
        await self.ensure_loaded()

        # Determine voice preset
        if voice_id and voice_id.startswith(("af_", "am_", "bf_", "bm_")):
            voice_preset = voice_id
        else:
            voice_preset = select_voice_preset(
                gender=gender, accent=accent, emotion=emotion, age=age
            )

        # Clamp speed to valid range
        speed = max(0.5, min(2.0, speed))

        logger.info(f"Generating speech: voice={voice_preset}, speed={speed}, lang={language}, len={len(text)}")

        # Get the appropriate pipeline
        pipeline = self._get_pipeline_for_language(language)

        # Generate audio
        loop = asyncio.get_event_loop()
        audio_np = await loop.run_in_executor(
            None,
            lambda: self._generate_audio(pipeline, text, voice_preset, speed)
        )

        if audio_np is None or len(audio_np) == 0:
            raise RuntimeError("Kokoro generated empty audio — check text input and voice preset")

        # Convert to requested format
        audio_bytes = self._numpy_to_bytes(audio_np, self.sample_rate, output_format)

        logger.info(f"Generated {len(audio_bytes)} bytes, {len(audio_np)/self.sample_rate:.1f}s audio")
        return audio_bytes, self.sample_rate

    def _generate_audio(self, pipeline, text: str, voice: str, speed: float) -> np.ndarray:
        """Generate audio from text using Kokoro (blocking)."""
        all_audio = []

        try:
            generator = pipeline(text, voice=voice, speed=speed)
            for graphemes, phonemes, audio_chunk in generator:
                if audio_chunk is not None and len(audio_chunk) > 0:
                    if isinstance(audio_chunk, np.ndarray):
                        all_audio.append(audio_chunk)
                    else:
                        # If it's a torch tensor, convert
                        all_audio.append(np.array(audio_chunk, dtype=np.float32))
        except Exception as e:
            logger.error(f"Kokoro generation error: {e}", exc_info=True)
            raise RuntimeError(f"Voice generation failed: {e}")

        if not all_audio:
            raise RuntimeError("Kokoro produced no audio chunks")

        # Concatenate all chunks
        combined = np.concatenate(all_audio)

        # Normalize audio to prevent clipping
        max_val = np.abs(combined).max()
        if max_val > 0:
            combined = combined / max_val * 0.95

        return combined.astype(np.float32)

    async def stream(
        self,
        text: str,
        voice_id: Optional[str] = None,
        language: str = "en",
        speed: float = 1.0,
        temperature: float = 0.7,
        chunk_size_chars: int = 200,
        gender: str = "female",
        accent: str = "american",
        emotion: str = "neutral",
        age: str = "young adult",
    ) -> AsyncIterator[Tuple[bytes, int]]:
        """
        Stream TTS output as audio chunks.
        Yields (audio_bytes, sample_rate) for each chunk.
        """
        await self.ensure_loaded()

        voice_preset = voice_id if voice_id else select_voice_preset(
            gender=gender, accent=accent, emotion=emotion, age=age
        )
        speed = max(0.5, min(2.0, speed))
        pipeline = self._get_pipeline_for_language(language)

        loop = asyncio.get_event_loop()

        def _stream_chunks():
            chunks = []
            try:
                generator = pipeline(text, voice=voice_preset, speed=speed)
                for graphemes, phonemes, audio_chunk in generator:
                    if audio_chunk is not None and len(audio_chunk) > 0:
                        audio_np = np.array(audio_chunk, dtype=np.float32) if not isinstance(audio_chunk, np.ndarray) else audio_chunk
                        chunks.append(audio_np)
            except Exception as e:
                logger.error(f"Streaming error: {e}")
            return chunks

        audio_chunks = await loop.run_in_executor(None, _stream_chunks)

        for chunk_np in audio_chunks:
            audio_bytes = self._numpy_to_bytes(chunk_np, self.sample_rate, "wav")
            yield audio_bytes, self.sample_rate
            await asyncio.sleep(0.01)

    def _numpy_to_bytes(self, audio: np.ndarray, sample_rate: int, fmt: str = "wav") -> bytes:
        """Convert numpy audio array to bytes in requested format."""
        import soundfile as sf
        buf = io.BytesIO()
        sf_format = fmt.upper()

        if sf_format == "MP3":
            try:
                from pydub import AudioSegment
                wav_buf = io.BytesIO()
                sf.write(wav_buf, audio, sample_rate, format="WAV")
                wav_buf.seek(0)
                seg = AudioSegment.from_wav(wav_buf)
                seg.export(buf, format="mp3")
            except Exception:
                sf.write(buf, audio, sample_rate, format="WAV")
        elif sf_format == "OGG":
            sf.write(buf, audio, sample_rate, format="OGG", subtype="VORBIS")
        elif sf_format == "FLAC":
            sf.write(buf, audio, sample_rate, format="FLAC")
        else:
            sf.write(buf, audio, sample_rate, format="WAV")

        buf.seek(0)
        return buf.read()

    def get_available_voices(self) -> List[Dict[str, str]]:
        """Return list of all available Kokoro voice presets with metadata."""
        voices = []
        for gender, accents in VOICE_PRESETS.items():
            for accent, presets in accents.items():
                if accent == "default":
                    continue
                for preset in presets:
                    voices.append({
                        "id": preset,
                        "gender": gender,
                        "accent": accent,
                        "label": f"{preset} ({gender.title()}, {accent.title()})",
                    })
        return voices

    def get_supported_parameters(self) -> Dict:
        """Return which parameters the current model actually supports."""
        return {
            "speed": {"supported": True, "min": 0.5, "max": 2.0, "default": 1.0},
            "pitch": {"supported": False, "note": "Not available with Kokoro-82M"},
            "temperature": {"supported": False, "note": "Not available with Kokoro-82M"},
            "emotion": {"supported": True, "note": "Mapped to voice preset selection"},
            "language": {"supported": True, "languages": list(SUPPORTED_LANGUAGES.keys())},
            "voice_presets": {"supported": True, "count": sum(
                len(p) for a in VOICE_PRESETS.values() for k, p in a.items() if k != "default"
            )},
            "model": "kokoro-82m",
            "license": "Apache-2.0",
            "sample_rate": 24000,
        }


# ─── Chatterbox TTS Turbo Pipeline (Engine B) ────────────────────────────────
# MIT Licensed — Zero-shot voice cloning, emotion exaggeration, paralinguistic tags
# Runs on GPU (fp16) for hyper-realistic voice generation

class ChatterboxPipeline:
    """
    Production voice generation pipeline using Chatterbox TTS Turbo.
    MIT licensed — fully commercially safe.
    Supports zero-shot voice cloning via reference audio.
    """

    def __init__(self):
        self._model = None
        self.sample_rate = 24000
        self._loading = False
        self._loaded = False
        self._device = "cuda" if self._check_cuda() else "cpu"

    @staticmethod
    def _check_cuda() -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except Exception:
            return False

    async def ensure_loaded(self):
        """Lazy-load Chatterbox Turbo on first use."""
        if self._loaded:
            return
        if self._loading:
            while self._loading:
                await asyncio.sleep(0.1)
            return

        self._loading = True
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._load_model)
            self._loaded = True
            logger.info(f"✅ Chatterbox Turbo loaded on {self._device}")
        except Exception as e:
            logger.error(f"❌ Chatterbox load failed: {e}")
            raise
        finally:
            self._loading = False

    def _load_model(self):
        """Load Chatterbox Turbo model (blocking, run in executor)."""
        import torch

        # Determine device and dtype
        if self._device == "cuda":
            dtype = torch.float16
        else:
            dtype = torch.float32

        try:
            # Try Turbo first (0.1.7+), fallback to original (0.1.5, 0.1.6)
            try:
                from chatterbox.tts_turbo import ChatterboxTurboTTS as ChatterboxTTS
            except ImportError:
                from chatterbox.tts import ChatterboxTTS
            self._model = ChatterboxTTS.from_pretrained(device=self._device)
            self.sample_rate = self._model.sr
            logger.info(f"Chatterbox Turbo loaded (device={self._device}, sr={self.sample_rate})")
        except Exception as e:
            logger.error(f"Chatterbox model load error: {e}", exc_info=True)
            raise RuntimeError(f"Failed to load Chatterbox TTS: {e}")

    async def synthesize(
        self,
        text: str,
        speaker_wav: Optional[str] = None,
        exaggeration: float = 0.5,
        cfg_weight: float = 0.5,
        temperature: float = 0.8,
        output_format: str = "wav",
        **kwargs,
    ) -> Tuple[bytes, int]:
        """
        Generate speech using Chatterbox Turbo.
        Returns (audio_bytes, sample_rate).

        Parameters:
            text: The text to synthesize. Supports paralinguistic tags like [laugh], [sigh].
            speaker_wav: Path to reference audio for zero-shot voice cloning.
            exaggeration: Emotion intensity (0.0 = monotone, 1.0 = dramatic). Default 0.5.
            cfg_weight: Classifier-free guidance weight for pacing/stability. Default 0.5.
            temperature: Sampling temperature. Default 0.8.
            output_format: wav, mp3, flac, ogg
        """
        await self.ensure_loaded()

        import torch

        logger.info(f"Chatterbox generating: exag={exaggeration}, cfg={cfg_weight}, temp={temperature}, ref={'yes' if speaker_wav else 'no'}, len={len(text)}")

        loop = asyncio.get_event_loop()

        def _generate():
            with torch.inference_mode():
                try:
                    # Handle both ChatterboxTTS and ChatterboxTurboTTS APIs
                    try:
                        wav = self._model.generate(
                            text,
                            audio_prompt_path=speaker_wav,
                            exaggeration=exaggeration,
                            cfg_weight=cfg_weight,
                            temperature=temperature,
                        )
                    except TypeError:
                        # Original API (0.1.5, 0.1.6) - fewer params
                        gen_kwargs = {}
                        if speaker_wav:
                            gen_kwargs["audio_prompt_path"] = speaker_wav
                        wav = self._model.generate(text, **gen_kwargs)
                    audio_np = wav.squeeze().cpu().numpy().astype(np.float32)
                    return audio_np
                finally:
                    # Aggressive VRAM cleanup for 4GB constraint
                    if self._device == "cuda":
                        torch.cuda.empty_cache()

        audio_np = await loop.run_in_executor(None, _generate)

        if audio_np is None or audio_np.size == 0:
            raise RuntimeError("Chatterbox generated empty audio")

        # Normalize
        max_val = np.abs(audio_np).max()
        if max_val > 0:
            audio_np = audio_np / max_val * 0.95

        # Convert to bytes
        audio_bytes = self._numpy_to_bytes(audio_np, self.sample_rate, output_format)

        logger.info(f"Chatterbox generated {len(audio_bytes)} bytes, {len(audio_np)/self.sample_rate:.1f}s audio")
        return audio_bytes, self.sample_rate

    def _numpy_to_bytes(self, audio: np.ndarray, sample_rate: int, fmt: str = "wav") -> bytes:
        """Convert numpy audio array to bytes in requested format."""
        import soundfile as sf
        buf = io.BytesIO()
        sf_format = fmt.upper()

        if sf_format == "MP3":
            try:
                from pydub import AudioSegment
                wav_buf = io.BytesIO()
                sf.write(wav_buf, audio, sample_rate, format="WAV")
                wav_buf.seek(0)
                seg = AudioSegment.from_wav(wav_buf)
                seg.export(buf, format="mp3")
            except Exception:
                sf.write(buf, audio, sample_rate, format="WAV")
        elif sf_format == "OGG":
            sf.write(buf, audio, sample_rate, format="OGG", subtype="VORBIS")
        elif sf_format == "FLAC":
            sf.write(buf, audio, sample_rate, format="FLAC")
        else:
            sf.write(buf, audio, sample_rate, format="WAV")

        buf.seek(0)
        return buf.read()

    def get_supported_parameters(self) -> Dict:
        """Return which parameters the Chatterbox model supports."""
        return {
            "speed": {"supported": False, "note": "Not directly supported by Chatterbox"},
            "pitch": {"supported": False, "note": "Not available with Chatterbox"},
            "temperature": {"supported": True, "min": 0.1, "max": 1.5, "default": 0.8},
            "exaggeration": {"supported": True, "min": 0.0, "max": 1.0, "default": 0.5, "note": "Emotion intensity"},
            "cfg_weight": {"supported": True, "min": 0.0, "max": 1.0, "default": 0.5, "note": "Pacing/stability control"},
            "emotion": {"supported": True, "note": "Controlled via exaggeration parameter"},
            "language": {"supported": False, "note": "English only for Turbo variant"},
            "voice_cloning": {"supported": True, "note": "Zero-shot cloning from 5s reference audio"},
            "paralinguistic_tags": {"supported": True, "tags": ["[laugh]", "[sigh]", "[cough]", "[chuckle]"]},
            "model": "chatterbox-turbo",
            "license": "MIT",
            "sample_rate": self.sample_rate,
        }


class ParlerTTSPipeline:
    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._loaded = False
        self._loading = False
        self._device = "cuda" if self._check_cuda() else "cpu"
        self.sample_rate = 44100  # Default for mini-v1

    @staticmethod
    def _check_cuda() -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except Exception:
            return False

    async def ensure_loaded(self):
        if self._loaded:
            return
        if self._loading:
            while self._loading:
                await asyncio.sleep(0.1)
            return

        self._loading = True
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._load_model)
            self._loaded = True
            logger.info(f"✅ Parler-TTS loaded on {self._device}")
        except Exception as e:
            logger.error(f"❌ Parler-TTS load failed: {e}")
            raise
        finally:
            self._loading = False

    def _load_model(self):
        try:
            import torch
            from parler_tts import ParlerTTSForConditionalGeneration
            from transformers import AutoTokenizer

            # Use mini-v1 for speed, or let user configure
            model_id = "parler-tts/parler-tts-mini-v1"
            if self._device == "cuda":
                self._model = ParlerTTSForConditionalGeneration.from_pretrained(
                    model_id,
                    torch_dtype=torch.float16
                ).to(self._device)
            else:
                self._model = ParlerTTSForConditionalGeneration.from_pretrained(model_id).to(self._device)
            
            self._tokenizer = AutoTokenizer.from_pretrained(model_id)
            self.sample_rate = self._model.config.sampling_rate
            logger.info(f"Parler-TTS ({model_id}) loaded (device={self._device}, sr={self.sample_rate})")
        except Exception as e:
            logger.error(f"Parler-TTS load error: {e}", exc_info=True)
            raise RuntimeError(f"Failed to load Parler-TTS: {e}")

    async def synthesize(
        self,
        text: str,
        voice_prompt: str = "A female speaker delivers a clear and articulate speech with moderate pacing.",
        output_format: str = "wav",
        **kwargs,
    ) -> Tuple[bytes, int]:
        """
        Generate speech using Parler-TTS.
        Returns (audio_bytes, sample_rate).
        """
        await self.ensure_loaded()
        import torch

        logger.info(f"Parler-TTS generating: prompt='{voice_prompt}', len={len(text)}")

        loop = asyncio.get_event_loop()

        def _generate():
            with torch.inference_mode():
                try:
                    # Parler-TTS prompt mapping:
                    # prompt -> input_ids
                    # text -> prompt_input_ids
                    tokenized_prompt = self._tokenizer(voice_prompt, return_tensors="pt")
                    input_ids = tokenized_prompt.input_ids.to(self._device)
                    attention_mask = tokenized_prompt.attention_mask.to(self._device)

                    tokenized_text = self._tokenizer(text, return_tensors="pt")
                    prompt_input_ids = tokenized_text.input_ids.to(self._device)
                    prompt_attention_mask = tokenized_text.attention_mask.to(self._device)

                    generation = self._model.generate(
                        input_ids=input_ids,
                        attention_mask=attention_mask,
                        prompt_input_ids=prompt_input_ids,
                        prompt_attention_mask=prompt_attention_mask
                    )
                    audio_np = generation.cpu().numpy().squeeze().astype(np.float32)
                    return audio_np
                finally:
                    if self._device == "cuda":
                        torch.cuda.empty_cache()

        audio_np = await loop.run_in_executor(None, _generate)

        if audio_np is None or audio_np.size == 0:
            raise RuntimeError("Parler-TTS generated empty audio")

        # Normalize
        max_val = np.abs(audio_np).max()
        if max_val > 0:
            audio_np = audio_np / max_val * 0.95

        audio_bytes = self._numpy_to_bytes(audio_np, self.sample_rate, output_format)
        return audio_bytes, self.sample_rate

    def _numpy_to_bytes(self, audio: np.ndarray, sample_rate: int, fmt: str = "wav") -> bytes:
        import soundfile as sf
        buf = io.BytesIO()
        sf_format = fmt.upper()
        if sf_format == "MP3":
            try:
                from pydub import AudioSegment
                wav_buf = io.BytesIO()
                sf.write(wav_buf, audio, sample_rate, format="WAV")
                wav_buf.seek(0)
                seg = AudioSegment.from_wav(wav_buf)
                seg.export(buf, format="mp3")
            except Exception:
                sf.write(buf, audio, sample_rate, format="WAV")
        else:
            sf.write(buf, audio, sample_rate, format=sf_format if sf_format in ["WAV", "FLAC", "OGG"] else "WAV")
        buf.seek(0)
        return buf.read()

    def get_supported_parameters(self) -> Dict:
        return {
            "prompt": {"supported": True, "note": "Detailed text description of voice/environment"},
            "voice_cloning": {"supported": False, "note": "Use Chatterbox for zero-shot cloning"},
            "model": "parler-tts-mini-v1",
            "license": "Apache 2.0",
            "sample_rate": self.sample_rate,
        }

# ─── Singletons ───────────────────────────────────────────────────────────────

_tts_pipeline: Optional[TTSPipeline] = None
_chatterbox_pipeline: Optional[ChatterboxPipeline] = None
_parler_pipeline: Optional[ParlerTTSPipeline] = None


def get_tts_pipeline() -> TTSPipeline:
    global _tts_pipeline
    if _tts_pipeline is None:
        _tts_pipeline = TTSPipeline()
    return _tts_pipeline


def get_chatterbox_pipeline() -> ChatterboxPipeline:
    global _chatterbox_pipeline
    if _chatterbox_pipeline is None:
        _chatterbox_pipeline = ChatterboxPipeline()
    return _chatterbox_pipeline


def get_parler_pipeline() -> ParlerTTSPipeline:
    global _parler_pipeline
    if _parler_pipeline is None:
        _parler_pipeline = ParlerTTSPipeline()
    return _parler_pipeline


def get_pipeline(model_name: str = "kokoro-82m"):
    if model_name.startswith("chatterbox"):
        return get_chatterbox_pipeline()
    elif model_name.startswith("parler-tts"):
        return get_parler_pipeline()
    return get_tts_pipeline()
