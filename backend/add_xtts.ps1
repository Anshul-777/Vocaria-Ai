import re

file_path = r'C:\Users\anshu\OneDrive\Desktop\Voice Crafter AI\voice-crafter\backend\app\ml\tts_pipeline.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

stub_code = '''

# --- XTTS v2 Pipeline (Zero-Shot Cloning) ------------------------------------

class XTTSPipeline:
    """
    Production voice cloning pipeline using Coqui XTTS v2.
    Requires pip install TTS. Falls back to Kokoro if not installed.
    """
    def __init__(self):
        self._model = None
        self._loaded = False
        self._loading = False
        self.sample_rate = 24000
        self._check_installation()

    def _check_installation(self):
        try:
            import TTS
            self.has_tts = True
        except ImportError:
            self.has_tts = False
            logger.warning("XTTS v2 is not installed (pip install TTS). Falling back to Kokoro.")

    async def ensure_loaded(self):
        if self._loaded or not self.has_tts:
            return
        if self._loading:
            while self._loading:
                import asyncio
                await asyncio.sleep(0.1)
            return

        self._loading = True
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._load_model)
            self._loaded = True
            logger.info("? XTTS v2 loaded successfully")
        except Exception as e:
            logger.error(f"? XTTS v2 load failed: {e}")
            raise
        finally:
            self._loading = False

    def _load_model(self):
        import torch
        from TTS.api import TTS
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

    async def synthesize(
        self,
        text: str,
        speaker_wav: str = None,
        language: str = "en",
        output_format: str = "wav",
        **kwargs,
    ):
        if not self.has_tts:
            logger.warning("XTTS not installed. Simulating voice clone using Kokoro fallback.")
            tts = get_tts_pipeline()
            return await tts.synthesize(text=text, language=language, output_format=output_format)
            
        await self.ensure_loaded()
        import asyncio
        loop = asyncio.get_event_loop()

        def _generate():
            import tempfile
            import os
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                temp_out = f.name
                
            # XTTS requires a file path for the reference audio
            self._model.tts_to_file(
                text=text,
                speaker_wav=speaker_wav,
                language=language,
                file_path=temp_out
            )
            
            with open(temp_out, "rb") as f:
                audio_bytes = f.read()
                
            os.unlink(temp_out)
            return audio_bytes

        audio_bytes = await loop.run_in_executor(None, _generate)
        return audio_bytes, self.sample_rate

_xtts_pipeline = None

def get_xtts_pipeline():
    global _xtts_pipeline
    if _xtts_pipeline is None:
        _xtts_pipeline = XTTSPipeline()
    return _xtts_pipeline
'''

# Insert the stub before the Singletons section
if '# --- Singletons' in content:
    content = content.replace('# --- Singletons', stub_code + '\n# --- Singletons')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added XTTS pipeline stub")
else:
    print("Could not find Singletons section")
