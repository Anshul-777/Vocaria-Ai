import asyncio
import logging
import io
import torch
import numpy as np
import librosa
from typing import Dict, List, Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)

class AudioDetectionPipeline:
    """
    Singleton Pipeline for Audio Detection (Deepfake, Quality, Diarization).
    Strictly manages VRAM (target: under 1.5GB total).
    """

    def __init__(self):
        self._loaded = False
        self._loading = False
        self._device = settings.DEVICE

        # Models
        self.diarization_pipeline = None
        self.deepfake_classifier = None
        self.squim_objective = None

        # Sample rates
        self.df_sample_rate = 16000

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
            await loop.run_in_executor(None, self._load_models)
            self._loaded = True
            logger.info(f"✅ Audio Detection Pipeline loaded successfully on {self._device}")
        except Exception as e:
            logger.error(f"❌ Audio Detection model load failed: {e}")
            raise
        finally:
            self._loading = False

    def _load_models(self):
        """Load the three models synchronously (run in executor)."""
        import torchaudio
        from transformers import pipeline

        # 1. Torchaudio SQUIM (Quality Assessment)
        logger.info("Loading SQUIM model...")
        self.squim_objective = torchaudio.pipelines.SQUIM_OBJECTIVE.get_model().to(self._device)

        # 2. Wav2Vec2 Deepfake Detector (garystafford/wav2vec2-deepfake-voice-detector)
        logger.info("Loading Wav2Vec2 Deepfake Detector...")
        self.deepfake_classifier = pipeline(
            "audio-classification", 
            model="garystafford/wav2vec2-deepfake-voice-detector",
            device=0 if self._device == "cuda" else -1
        )

        # 3. Pyannote Speaker Diarization
        logger.info("Loading Pyannote Speaker Diarization...")
        if settings.HF_TOKEN:
            from pyannote.audio import Pipeline as PyannotePipeline
            try:
                self.diarization_pipeline = PyannotePipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=settings.HF_TOKEN
                )
                self.diarization_pipeline.to(torch.device(self._device))
                logger.info("Pyannote loaded successfully.")
            except Exception as e:
                logger.warning(f"Could not load Pyannote (Token might be invalid or no access): {e}")
                self.diarization_pipeline = None
        else:
            logger.warning("No HF_TOKEN found in settings. Pyannote Speaker Diarization is disabled.")
            self.diarization_pipeline = None

    def _cleanup_vram(self):
        if self._device == "cuda":
            torch.cuda.empty_cache()

    def _get_deepfake_score(self, audio_np: np.ndarray, sr: int) -> Dict[str, float]:
        """Runs the deepfake detector on a specific audio segment."""
        # The transformers pipeline expects 16kHz
        if sr != self.df_sample_rate:
            audio_np = librosa.resample(audio_np, orig_sr=sr, target_sr=self.df_sample_rate)
        
        # Pass raw audio array to transformers pipeline
        results = self.deepfake_classifier(audio_np)
        
        # Results look like: [{'score': 0.99, 'label': 'FAKE'}, {'score': 0.01, 'label': 'REAL'}]
        probs = {"real": 0.0, "ai_generated": 0.0}
        for res in results:
            label = res['label'].upper()
            if label == 'REAL':
                probs["real"] = float(res['score'])
            elif label == 'FAKE':
                probs["ai_generated"] = float(res['score'])

        # Calculate a simple "edited" baseline (could be expanded)
        probs["edited"] = 0.0
        
        # Normalize just in case
        total = sum(probs.values())
        if total > 0:
            probs = {k: v / total for k, v in probs.items()}
            
        return probs

    def _get_quality_scores(self, audio_tensor: torch.Tensor) -> Dict[str, float]:
        """Runs SQUIM for audio quality metrics."""
        with torch.no_grad():
            stoi_hyp, pesq_hyp, si_sdr_hyp = self.squim_objective(audio_tensor)
        
        return {
            "pesq": float(pesq_hyp.item()),   # Perceptual Quality (-0.5 to 4.5)
            "stoi": float(stoi_hyp.item()),   # Intelligibility (0 to 1)
            "si_sdr": float(si_sdr_hyp.item()) # Noise/Distortion ratio
        }

    async def analyze_audio_chunk(self, audio_bytes: bytes) -> Dict[str, Any]:
        """
        Analyzes a small chunk of audio (e.g. from live stream).
        Assumes a single speaker for speed.
        """
        await self.ensure_loaded()
        
        loop = asyncio.get_event_loop()
        
        def _process():
            import soundfile as sf
            import torch
            import numpy as np
            
            # Load audio from bytes using soundfile
            audio_buffer = io.BytesIO(audio_bytes)
            waveform_np, sr = sf.read(audio_buffer)
            
            # Convert to (channels, samples)
            if len(waveform_np.shape) == 1:
                waveform_np = waveform_np[np.newaxis, :]
            else:
                waveform_np = waveform_np.T
                
            waveform = torch.from_numpy(waveform_np).float()
            
            # SQUIM expects 16kHz audio
            if sr != 16000:
                resampler = torchaudio.transforms.Resample(sr, 16000)
                waveform_16k = resampler(waveform)
            else:
                waveform_16k = waveform
                
            waveform_16k = waveform_16k.to(self._device)
            
            # 1. Get Quality Scores
            quality_scores = self._get_quality_scores(waveform_16k[0:1, :]) # Use first channel
            
            # 2. Get Deepfake Scores
            audio_np = waveform_16k.squeeze().cpu().numpy()
            deepfake_scores = self._get_deepfake_score(audio_np, 16000)
            
            self._cleanup_vram()
            
            return {
                "speaker": "Speaker 1 (Live)",
                "probabilities": deepfake_scores,
                "quality": quality_scores
            }
            
        return await loop.run_in_executor(None, _process)

    async def analyze_full_file(self, file_path: str) -> Dict[str, Any]:
        """
        Runs full Diarization -> Segmentation -> Deepfake Detection per speaker.
        """
        await self.ensure_loaded()
        
        loop = asyncio.get_event_loop()
        
        def _process():
            import librosa
            import torch
            import numpy as np
            
            # Use librosa to load from file (handles various formats better without torchcodec)
            waveform_np, sr = librosa.load(file_path, sr=None, mono=False)
            
            # Ensure shape is (channels, samples)
            if len(waveform_np.shape) == 1:
                waveform_np = waveform_np[np.newaxis, :]
                
            waveform = torch.from_numpy(waveform_np).float()
            
            # Fallback if pyannote is missing
            if self.diarization_pipeline is None:
                logger.warning("No Pyannote pipeline. Falling back to single-speaker analysis.")
                audio_np = waveform.squeeze().cpu().numpy()
                probs = self._get_deepfake_score(audio_np, sr)
                
                # Resample for SQUIM
                if sr != 16000:
                    resampler = torchaudio.transforms.Resample(sr, 16000)
                    wf_16k = resampler(waveform).to(self._device)
                else:
                    wf_16k = waveform.to(self._device)
                
                quality = self._get_quality_scores(wf_16k[0:1, :])
                self._cleanup_vram()
                
                return {
                    "overall_quality": quality,
                    "speakers": [
                        {
                            "id": "Unknown Speaker",
                            "probabilities": probs
                        }
                    ]
                }
            
            # 1. Run Diarization
            logger.info("Running diarization...")
            diarization = self.diarization_pipeline(file_path)
            
            # 2. Collect non-overlapping segments per speaker
            speaker_segments = {}
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                if speaker not in speaker_segments:
                    speaker_segments[speaker] = []
                speaker_segments[speaker].append((turn.start, turn.end))
            
            # Optional: Filter out overlaps here in the future
            
            results = []
            
            # 3. Analyze each speaker
            for speaker, segments in speaker_segments.items():
                logger.info(f"Analyzing {speaker}...")
                
                # Extract the longest clean segment for this speaker (for speed)
                # In production, we'd stitch them or average scores across all segments.
                longest_segment = max(segments, key=lambda x: x[1] - x[0])
                start_sample = int(longest_segment[0] * sr)
                end_sample = int(longest_segment[1] * sr)
                
                segment_waveform = waveform[:, start_sample:end_sample]
                
                # Get deepfake score
                audio_np = segment_waveform.squeeze().cpu().numpy()
                probs = self._get_deepfake_score(audio_np, sr)
                
                results.append({
                    "id": speaker,
                    "probabilities": probs,
                    "analyzed_duration_sec": longest_segment[1] - longest_segment[0]
                })
            
            # Overall file quality (using first 5 seconds to save time)
            if sr != 16000:
                resampler = torchaudio.transforms.Resample(sr, 16000)
                wf_16k = resampler(waveform[:, :sr*5]).to(self._device)
            else:
                wf_16k = waveform[:, :sr*5].to(self._device)
                
            quality = self._get_quality_scores(wf_16k[0:1, :])
            
            self._cleanup_vram()
            
            return {
                "overall_quality": quality,
                "speakers": results
            }
            
        return await loop.run_in_executor(None, _process)

# Singleton
_detection_pipeline: Optional[AudioDetectionPipeline] = None

def get_detection_pipeline() -> AudioDetectionPipeline:
    global _detection_pipeline
    if _detection_pipeline is None:
        _detection_pipeline = AudioDetectionPipeline()
    return _detection_pipeline
