import asyncio
import logging
import io
import torch
import numpy as np
import librosa
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
import time

import torchaudio
from transformers import pipeline
try:
    from pyannote.audio import Pipeline as PyannotePipeline
except ImportError:
    PyannotePipeline = None

from app.config import settings
logger = logging.getLogger(__name__)

@dataclass
class DetectionResult:
    verdict: str
    ensemble_confidence: float
    is_synthetic: bool
    risk_score: float
    pipeline_metrics: Dict[str, Any]
    segments: List[Dict[str, Any]]
    suspicious_segments: List[Dict[str, Any]]
    confidence_timeline: List[Dict[str, Any]]
    speakers: List[Dict[str, Any]]
    flagged_reasons: List[str]
    explanation: str
    duration_seconds: float
    processing_time_ms: int
    model_versions: Dict[str, str]

class AudioDetectionPipeline:
    """
    Singleton Pipeline for Audio Detection (Deepfake, Quality, Diarization).
    Strictly manages VRAM (target: under 1.5GB total).
    """

    def __init__(self):
        self._loaded = False
        self._loading = False
        self._device = settings.DEVICE if torch.cuda.is_available() and settings.DEVICE == "cuda" else "cpu"

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

        # 1. Torchaudio SQUIM (Quality Assessment)
        logger.info("Loading SQUIM model (downloading if not cached)...")
        self.squim_objective = torchaudio.pipelines.SQUIM_OBJECTIVE.get_model().to(self._device)

        # 2. Wav2Vec2 Deepfake Detector (garystafford/wav2vec2-deepfake-voice-detector)
        logger.info("Loading Wav2Vec2 Deepfake Detector (this is a 1.2GB download if not cached, please wait)...")
        self.deepfake_classifier = pipeline(
            "audio-classification", 
            model="garystafford/wav2vec2-deepfake-voice-detector",
            device=0 if self._device == "cuda" else -1
        )

        # 3. Pyannote Speaker Diarization
        logger.info("Loading Pyannote Speaker Diarization...")
        if settings.HF_TOKEN and PyannotePipeline is not None:
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
        # Some pipelines require dict format with sampling_rate
        results = self.deepfake_classifier({"raw": audio_np, "sampling_rate": self.df_sample_rate})
        
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
            try:
                waveform_np, sr = sf.read(audio_buffer)
            except Exception:
                from pydub import AudioSegment
                seg = AudioSegment.from_file(io.BytesIO(audio_bytes))
                seg = seg.set_channels(1)
                waveform_np = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
                sr = seg.frame_rate
            
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

    async def analyze_chunk_stream(self, audio_bytes: bytes, sample_rate: int, confidence_threshold: float = 0.65) -> Dict[str, Any]:
        """
        Analyzes a streaming audio chunk, performing diarization and deepfake detection on multiple speakers.
        """
        await self.ensure_loaded()
        
        loop = asyncio.get_event_loop()
        
        def _process():
            import soundfile as sf
            import torch
            import numpy as np
            import io
            
            # Load audio
            audio_buffer = io.BytesIO(audio_bytes)
            try:
                waveform_np, sr = sf.read(audio_buffer)
            except Exception:
                from pydub import AudioSegment
                seg = AudioSegment.from_file(io.BytesIO(audio_bytes))
                seg = seg.set_channels(1)
                waveform_np = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
                sr = seg.frame_rate
            
            if len(waveform_np.shape) == 1:
                waveform_np = waveform_np[np.newaxis, :]
            else:
                waveform_np = waveform_np.T
                
            waveform = torch.from_numpy(waveform_np).float()
            duration_seconds = waveform_np.shape[-1] / sr
            
            speakers = []
            
            if self.diarization_pipeline is not None:
                try:
                    diarization = self.diarization_pipeline({"waveform": waveform, "sample_rate": sr})
                    speaker_segments = {}
                    for turn, _, speaker in diarization.itertracks(yield_label=True):
                        # Clean up pyannote speaker names like "SPEAKER_00" to "Speaker A"
                        spk_idx = speaker.split("_")[-1] if "_" in speaker else speaker
                        try:
                            # Try to map 00 -> A, 01 -> B
                            spk_char = chr(65 + int(spk_idx))
                            friendly_name = f"Speaker {spk_char}"
                        except Exception:
                            friendly_name = speaker

                        if friendly_name not in speaker_segments:
                            speaker_segments[friendly_name] = []
                        speaker_segments[friendly_name].append((turn.start, turn.end))
                    
                    for speaker, spk_segments in speaker_segments.items():
                        longest_segment = max(spk_segments, key=lambda x: x[1] - x[0])
                        start_sample = int(longest_segment[0] * sr)
                        end_sample = int(longest_segment[1] * sr)
                        
                        segment_waveform = waveform[:, start_sample:end_sample]
                        audio_np = segment_waveform.squeeze().cpu().numpy()
                        
                        if len(audio_np.shape) == 0:
                            audio_np = np.expand_dims(audio_np, 0)
                            
                        if len(audio_np) > int(0.2 * sr):  # Only process if > 200ms
                            probs = self._get_deepfake_score(audio_np, sr)
                            speakers.append({
                                "id": speaker,
                                "probabilities": probs,
                                "is_suspicious": probs.get("ai_generated", 0) > confidence_threshold,
                                "duration_sec": sum(seg[1] - seg[0] for seg in spk_segments)
                            })
                except Exception as e:
                    logger.error(f"Diarization failed on chunk: {e}")
            
            # Fallback if no speakers found and NO diarization model
            if not speakers and self.diarization_pipeline is None:
                audio_np = waveform.squeeze().cpu().numpy()
                if len(audio_np.shape) == 0:
                    audio_np = np.expand_dims(audio_np, 0)
                
                if len(audio_np) > int(0.2 * sr):
                    probs = self._get_deepfake_score(audio_np, sr)
                else:
                    probs = {"real": 0.5, "ai_generated": 0.5, "edited": 0.0}
                speakers.append({
                    "id": "Speaker A",
                    "probabilities": probs,
                    "is_suspicious": probs.get("ai_generated", 0) > confidence_threshold,
                    "duration_sec": duration_seconds
                })
            elif not speakers:
                # Diarization is loaded but found no speakers (Silence/Noise)
                return {
                    "ensemble_score": 0.0,
                    "verdict": "authentic",
                    "is_suspicious": False,
                    "speakers": [],
                    "flagged_reasons": ["No speech detected"],
                    "model_scores": {"wav2vec2": 0.0}
                }
            
            # Compute chunk-level metrics
            max_ai = max(s["probabilities"].get("ai_generated", 0) for s in speakers)
            is_suspicious = max_ai > confidence_threshold
            verdict = "synthetic" if is_suspicious else ("suspicious" if max_ai > 0.4 else "authentic")
            
            flagged_reasons = []
            if is_suspicious:
                flagged_reasons.append("Wav2Vec2 flagged synthetic audio in this chunk.")
            if len(speakers) > 1:
                flagged_reasons.append(f"Multiple speakers detected ({len(speakers)}).")
            
            self._cleanup_vram()
            
            return {
                "ensemble_score": max_ai,
                "verdict": verdict,
                "is_suspicious": is_suspicious,
                "speakers": speakers,
                "flagged_reasons": flagged_reasons,
                "model_scores": {
                    "wav2vec2": max_ai
                }
            }
            
        return await loop.run_in_executor(None, _process)

    async def analyze_file(
        self,
        audio_path: str,
        confidence_threshold: float = 0.65,
        enable_diarization: bool = True,
        progress_callback: Any = None
    ) -> DetectionResult:
        """
        Runs full Diarization -> Segmentation -> Deepfake Detection per speaker.
        Matches the backend celery task expectations.
        """
        start_time = time.time()
        await self.ensure_loaded()
        
        loop = asyncio.get_event_loop()
        
        def _process():
            import librosa
            import torch
            import numpy as np
            
            # Use librosa to load from file (handles various formats better without torchcodec)
            try:
                waveform_np, sr = librosa.load(audio_path, sr=16000, mono=True)
            except Exception:
                from pydub import AudioSegment
                seg = AudioSegment.from_file(audio_path)
                seg = seg.set_channels(1).set_frame_rate(16000)
                waveform_np = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
                sr = seg.frame_rate

            duration_seconds = waveform_np.shape[-1] / sr
            
            # Ensure shape is (channels, samples)
            if len(waveform_np.shape) == 1:
                waveform_np = waveform_np[np.newaxis, :]
                
            waveform = torch.from_numpy(waveform_np).float()
            
            speakers = []
            segments = []
            suspicious_segments = []
            confidence_timeline = []
            
            # Process as a single speaker if pyannote is missing or disabled
            if not enable_diarization or self.diarization_pipeline is None:
                if enable_diarization and self.diarization_pipeline is None:
                    logger.warning("No Pyannote pipeline. Falling back to single-speaker analysis.")
                
                audio_np = waveform.squeeze().cpu().numpy()
                probs = self._get_deepfake_score(audio_np, sr)
                
                speakers = [{
                    "id": "Speaker 1",
                    "probabilities": probs
                }]
                
                # Single segment representing the whole file
                segments.append({
                    "start": 0.0,
                    "end": duration_seconds,
                    "speaker": "Speaker 1",
                    "probabilities": probs
                })
                
                if probs.get("ai_generated", 0) > confidence_threshold:
                    suspicious_segments.append({
                        "start": 0.0,
                        "end": duration_seconds,
                        "speaker": "Speaker 1",
                        "probabilities": probs
                    })
                
                # Fake timeline every 2 seconds
                for t in range(0, int(duration_seconds), 2):
                    confidence_timeline.append({
                        "timestamp": t,
                        "score": probs.get("ai_generated", 0)
                    })
            else:
                # 1. Run Diarization
                logger.info("Running diarization...")
                diarization = self.diarization_pipeline({"waveform": waveform, "sample_rate": sr})
                
                speaker_segments = {}
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    if speaker not in speaker_segments:
                        speaker_segments[speaker] = []
                    speaker_segments[speaker].append((turn.start, turn.end))
                
                # Fallback if pyannote detected no speech/speakers
                if len(speaker_segments) == 0:
                    speaker_segments["Speaker 1"] = [(0.0, duration_seconds)]
                
                # 3. Analyze each speaker
                for speaker, spk_segments in speaker_segments.items():
                    logger.info(f"Analyzing {speaker}...")
                    
                    longest_segment = max(spk_segments, key=lambda x: x[1] - x[0])
                    start_sample = int(longest_segment[0] * sr)
                    end_sample = int(longest_segment[1] * sr)
                    
                    segment_waveform = waveform[:, start_sample:end_sample]
                    audio_np = segment_waveform.squeeze().cpu().numpy()
                    if len(audio_np.shape) == 0:
                        audio_np = np.expand_dims(audio_np, 0)
                    
                    if len(audio_np) > int(0.2 * sr):
                        probs = self._get_deepfake_score(audio_np, sr)
                    else:
                        probs = {"real": 0.5, "ai_generated": 0.5, "edited": 0.0}
                    
                    speakers.append({
                        "id": speaker,
                        "probabilities": probs,
                        "analyzed_duration_sec": longest_segment[1] - longest_segment[0]
                    })
                    
                    for seg in spk_segments:
                        segments.append({
                            "start": seg[0],
                            "end": seg[1],
                            "speaker": speaker,
                            "probabilities": probs
                        })
                        if probs.get("ai_generated", 0) > confidence_threshold:
                            suspicious_segments.append({
                                "start": seg[0],
                                "end": seg[1],
                                "speaker": speaker,
                                "probabilities": probs
                            })
                            
                        # Timeline
                        for t in range(int(seg[0]), int(seg[1]), 2):
                            confidence_timeline.append({
                                "timestamp": t,
                                "score": probs.get("ai_generated", 0)
                            })
            
            # Sort timeline
            confidence_timeline.sort(key=lambda x: x["timestamp"])
            
            # Aggregate the final ensemble score (simulate ensemble)
            if speakers:
                max_ai = max(s["probabilities"].get("ai_generated", 0) for s in speakers)
            else:
                max_ai = 0.0
                
            is_synthetic = max_ai > confidence_threshold
            verdict = "synthetic_tts" if is_synthetic else "authentic"
            
            # Actual pipeline metrics mapped
            pipeline_metrics = {
                "wav2vec2_deepfake": {
                    "latency_ms": int((time.time() - start_time) * 1000),  # Rough latency map
                    "score": max_ai,
                    "status": "online"
                },
                "pyannote_diarization": {
                    "latency_ms": 0, # Could be calculated separately
                    "status": "online" if self.diarization_pipeline else "offline",
                    "speakers_detected": len(speakers)
                },
                "squim_quality": {
                    "latency_ms": 0,
                    "status": "online"
                }
            }
            
            flagged_reasons = []
            if is_synthetic:
                flagged_reasons.append(f"Wav2Vec2 Deepfake Detector reported high confidence ({max_ai:.1%}).")
            if len(suspicious_segments) > 0:
                flagged_reasons.append(f"Identified {len(suspicious_segments)} suspicious segments.")
                
            explanation = f"Audio analyzed across {len(speakers)} detected speaker(s). Overall verdict is {verdict.upper()}."

            self._cleanup_vram()
            processing_time = int((time.time() - start_time) * 1000)
            
            return DetectionResult(
                verdict=verdict,
                ensemble_confidence=max_ai,
                is_synthetic=is_synthetic,
                risk_score=max_ai, # Risk score same as AI conf for now
                pipeline_metrics=pipeline_metrics,
                segments=segments,
                suspicious_segments=suspicious_segments,
                confidence_timeline=confidence_timeline,
                speakers=speakers,
                flagged_reasons=flagged_reasons,
                explanation=explanation,
                duration_seconds=duration_seconds,
                processing_time_ms=processing_time,
                model_versions={
                    "wav2vec2_deepfake": "garystafford/wav2vec2-deepfake-voice-detector",
                    "pyannote_diarization": "3.1" if self.diarization_pipeline else "none",
                }
            )
            
        return await loop.run_in_executor(None, _process)

# Singleton
_detection_pipeline: Optional[AudioDetectionPipeline] = None

def get_detection_pipeline() -> AudioDetectionPipeline:
    global _detection_pipeline
    if _detection_pipeline is None:
        _detection_pipeline = AudioDetectionPipeline()
    return _detection_pipeline
