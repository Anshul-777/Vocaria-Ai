"""
Vocaria WebSocket Router
Live detection streaming and real-time generation.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.websockets import WebSocketState
import json, asyncio, time, logging, hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from app.config import settings
from app.services.auth_service import decode_token

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections per user."""

    def __init__(self):
        # user_id -> List[WebSocket]
        self.active: Dict[str, list] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active:
            self.active[user_id] = []
        if len(self.active[user_id]) >= settings.WS_MAX_CONNECTIONS_PER_USER:
            await websocket.close(code=4029, reason="Too many connections")
            return False
        self.active[user_id].append(websocket)
        return True

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active:
            try:
                self.active[user_id].remove(websocket)
            except ValueError:
                pass
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: str, data: dict):
        if user_id in self.active:
            dead = []
            for ws in self.active[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws, user_id)

    @property
    def total_connections(self) -> int:
        return sum(len(v) for v in self.active.values())


manager = ConnectionManager()


async def authenticate_ws(token: Optional[str]) -> Optional[str]:
    """Authenticate WebSocket connection via JWT."""
    if not token or token == "null" or token == "undefined":
        return None
    from jose import jwt
    try:
        payload = jwt.get_unverified_claims(token)
        return payload.get("sub")
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
    return None


@router.websocket("/detect/stream")
async def detection_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
    session_id: Optional[str] = Query(default=None),
    confidence_threshold: float = Query(default=0.65, ge=0.0, le=1.0),
    sample_rate: int = Query(default=16000),
):
    """
    Real-time audio deepfake detection stream.

    Protocol:
      Client -> Server: Binary audio chunks (PCM float32 or encoded audio)
      Server -> Client: JSON detection results per chunk

    Message format (Server -> Client):
    {
        "type": "chunk_result",
        "chunk_idx": 42,
        "timestamp_ms": 1234567890,
        "ensemble_score": 0.83,
        "verdict": "suspicious",
        "is_suspicious": true,
        "model_scores": {"aasist": 0.91, "rawnet2": 0.85, ...},
        "flagged_reasons": ["unnaturally_stable_pitch"],
        "session_stats": {
            "total_chunks": 42,
            "suspicious_count": 3,
            "avg_score": 0.45,
            "session_verdict": "inconclusive"
        }
    }
    """
    user_id = await authenticate_ws(token)
    if not user_id:
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Unauthorized"})
        await websocket.close(code=4001)
        return

    connected = await manager.connect(websocket, user_id)
    if not connected:
        return

    # Lazy import to avoid heavy ML imports at module import time
    from app.ml.detection_pipeline import get_detection_pipeline
    pipeline = get_detection_pipeline()
    session_start = time.time()
    chunk_idx = 0
    total_score = 0.0
    suspicious_count = 0
    max_score = 0.0
    score_history = []
    confidence_timeline = []
    speaker_accumulators = {}
    audio_chunks = []

    logger.info(f"Detection stream started: user={user_id} session={session_id}")

    # Send welcome
    await websocket.send_json({
        "type": "session_start",
        "session_id": session_id,
        "message": "Detection stream ready",
        "config": {
            "confidence_threshold": confidence_threshold,
            "sample_rate": sample_rate,
            "chunk_ms": settings.DETECTION_CHUNK_DURATION_MS,
        },
    })

    try:
        while True:
            # Receive audio chunk
            try:
                data = await asyncio.wait_for(
                    websocket.receive(),
                    timeout=settings.WS_HEARTBEAT_INTERVAL,
                )
            except asyncio.TimeoutError:
                # Send heartbeat
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json({"type": "heartbeat", "ts": time.time()})
                continue

            # Handle text control messages
            if "text" in data:
                try:
                    msg = json.loads(data["text"])
                    if msg.get("type") == "ping":
                        await websocket.send_json({"type": "pong", "ts": time.time()})
                    elif msg.get("type") == "end_stream":
                        break
                    elif msg.get("type") == "get_summary":
                        await _send_summary(websocket, chunk_idx, suspicious_count, score_history, session_start)
                except json.JSONDecodeError:
                    pass
                continue

            # Binary audio data
            if "bytes" not in data:
                continue

            audio_bytes = data["bytes"]
            if len(audio_bytes) < 100:
                continue  # too small, skip

            audio_chunks.append(audio_bytes)

            # Run detection
            chunk_start = time.perf_counter()
            try:
                result = await pipeline.analyze_chunk_stream(
                    audio_bytes, sample_rate, confidence_threshold
                )
            except Exception as e:
                logger.error(f"Chunk analysis error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "chunk_idx": chunk_idx,
                    "message": f"Analysis error: {str(e)[:100]}",
                })
                chunk_idx += 1
                continue

            chunk_latency_ms = (time.perf_counter() - chunk_start) * 1000

            # Update session stats
            score = result["ensemble_score"]
            score_history.append(score)
            total_score += score
            if result["is_suspicious"]:
                suspicious_count += 1
            max_score = max(max_score, score)
            chunk_idx += 1

            # Accumulate timeline
            confidence_timeline.append({
                "time_ms": int((time.time() - session_start) * 1000),
                "score": result["ensemble_score"]
            })
            
            # Accumulate speakers
            for spk in result.get("speakers", []):
                sid = spk["id"]
                if sid not in speaker_accumulators:
                    speaker_accumulators[sid] = spk
                else:
                    speaker_accumulators[sid]["duration_sec"] += spk.get("duration_sec", 0)
                    speaker_accumulators[sid]["probabilities"] = spk.get("probabilities", speaker_accumulators[sid]["probabilities"])
                    if spk.get("is_suspicious"):
                        speaker_accumulators[sid]["is_suspicious"] = True

            # Session-level verdict
            avg_score = total_score / chunk_idx
            if avg_score >= confidence_threshold:
                session_verdict = "synthetic"
            elif avg_score >= 0.4:
                session_verdict = "suspicious"
            else:
                session_verdict = "authentic"

            await websocket.send_json({
                "type": "chunk_result",
                "chunk_idx": chunk_idx,
                "timestamp_ms": int(time.time() * 1000),
                "ensemble_score": result["ensemble_score"],
                "verdict": result["verdict"],
                "is_suspicious": result["is_suspicious"],
                "model_scores": result["model_scores"],
                "speakers": result.get("speakers", []),
                "flagged_reasons": result["flagged_reasons"],
                "latency_ms": round(chunk_latency_ms, 1),
                "session_stats": {
                    "total_chunks": chunk_idx,
                    "suspicious_count": suspicious_count,
                    "avg_score": round(avg_score, 4),
                    "max_score": round(max_score, 4),
                    "session_verdict": session_verdict,
                    "elapsed_seconds": round(time.time() - session_start, 1),
                },
            })

    except WebSocketDisconnect:
        logger.info(f"Detection stream disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"Detection stream error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)[:200]})
        except Exception:
            pass
    finally:
        manager.disconnect(websocket, user_id)
        job_id = await _send_summary_log(
            user_id, session_id, chunk_idx, suspicious_count, score_history, session_start,
            confidence_timeline, list(speaker_accumulators.values()),
            confidence_threshold, audio_chunks
        )
        if job_id:
            try:
                await websocket.send_json({
                    "type": "session_summary",
                    "job_id": job_id,
                    "total_chunks": chunk_idx,
                    "suspicious_count": suspicious_count,
                    "avg_score": round((sum(score_history)/len(score_history)) if score_history else 0, 4),
                    "max_score": round(max(score_history) if score_history else 0, 4),
                    "elapsed_seconds": round(time.time() - session_start, 1)
                })
            except Exception:
                pass
        logger.info(f"Detection stream ended: user={user_id} chunks={chunk_idx}")


async def _send_summary(
    websocket: WebSocket,
    total_chunks: int,
    suspicious_count: int,
    score_history: list,
    session_start: float,
):
    avg_score = sum(score_history) / len(score_history) if score_history else 0.0
    await websocket.send_json({
        "type": "session_summary",
        "total_chunks": total_chunks,
        "suspicious_count": suspicious_count,
        "avg_score": round(avg_score, 4),
        "max_score": round(max(score_history) if score_history else 0, 4),
        "elapsed_seconds": round(time.time() - session_start, 1),
        "score_history": [round(s, 4) for s in score_history[-100:]],
    })


async def _send_summary_log(
    user_id: str,
    session_id: Optional[str],
    total_chunks: int,
    suspicious_count: int,
    score_history: list,
    session_start: float,
    confidence_timeline: list,
    speakers: list,
    confidence_threshold: float,
    audio_chunks: list = None
) -> Optional[str]:
    elapsed = time.time() - session_start
    avg_score = sum(score_history) / len(score_history) if score_history else 0.0
    
    logger.info(
        f"Session summary user={user_id} session={session_id} "
        f"chunks={total_chunks} suspicious={suspicious_count} "
        f"avg_score={avg_score:.3f} elapsed={elapsed:.1f}s"
    )
    
    # Save the DetectionJob to the database
    if total_chunks > 0:
        try:
            from app.database import SessionLocal
            from app.models import DetectionJob, JobStatus, DetectionVerdict
            from app.core.storage import get_storage
            from app.core.config import settings
            import uuid
            import io
            import torchaudio
            import torch
            
            job_id = str(uuid.uuid4())
            session_verdict = "synthetic" if avg_score >= confidence_threshold else ("suspicious" if avg_score >= 0.4 else "authentic")
            
            storage_key = None
            if audio_chunks:
                try:
                    waveforms = []
                    for chunk in audio_chunks:
                        try:
                            wav, sr = torchaudio.load(io.BytesIO(chunk))
                            waveforms.append(wav)
                        except Exception as e:
                            logger.error(f"Failed to load chunk for stitching: {e}")
                    
                    if waveforms:
                        full_wav = torch.cat(waveforms, dim=1)
                        wav_io = io.BytesIO()
                        torchaudio.save(wav_io, full_wav, sample_rate=16000, format="wav")
                        wav_bytes = wav_io.getvalue()
                        
                        storage = await get_storage()
                        storage_key = f"detection/{user_id}/live_{job_id}.wav"
                        await storage.upload(settings.BUCKET_UPLOADS, storage_key, wav_bytes, content_type="audio/wav")
                        logger.info(f"Uploaded stitched live session audio to {storage_key}")
                except Exception as e:
                    logger.error(f"Failed to stitch or upload audio: {e}")
            
            async with SessionLocal() as db:
                job = DetectionJob(
                    id=job_id,
                    user_id=user_id,
                    status=JobStatus.COMPLETED,
                    mode="stream",
                    verdict=DetectionVerdict.SYNTHETIC if session_verdict == "synthetic" else (DetectionVerdict.SUSPICIOUS if session_verdict == "suspicious" else DetectionVerdict.AUTHENTIC),
                    ensemble_confidence=avg_score,
                    is_synthetic=(session_verdict == "synthetic"),
                    risk_score=max(score_history) if score_history else 0.0,
                    confidence_timeline=confidence_timeline,
                    speakers=speakers,
                    started_at=datetime.fromtimestamp(session_start, tz=timezone.utc),
                    completed_at=datetime.utcnow(),
                    duration_seconds=elapsed,
                    processing_time_ms=int(elapsed * 1000),
                    input_storage_key=storage_key,
                    original_filename="Live Session"
                )
                db.add(job)
                await db.commit()
            return job_id
        except Exception as e:
            logger.error(f"Failed to save detection job: {e}")
    
    return None


@router.websocket("/generate/stream")
async def generation_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
    job_id: Optional[str] = Query(default=None),
):
    """
    Real-time TTS generation streaming.
    Server streams audio chunks as they are generated.

    Protocol:
      Client sends: {"type": "start", "text": "...", "voice_id": "...", "language": "en"}
      Server streams: binary audio chunks with metadata headers
    """
    user_id = await authenticate_ws(token)
    if not user_id:
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Unauthorized"})
        await websocket.close(code=4001)
        return

    connected = await manager.connect(websocket, user_id)
    if not connected:
        return

    logger.info(f"Generation stream started: user={user_id} job={job_id}")

    await websocket.send_json({
        "type": "ready",
        "message": "Generation stream connected. Send start message to begin.",
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start":
                text = data.get("text", "").strip()
                voice_id = data.get("voice_id")
                language = data.get("language", "en")
                speed = float(data.get("speed", 1.0))
                temperature = float(data.get("temperature", 0.7))

                if not text:
                    await websocket.send_json({"type": "error", "message": "text is required"})
                    continue

                if len(text) > settings.TTS_MAX_TEXT_LENGTH:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Text exceeds maximum length of {settings.TTS_MAX_TEXT_LENGTH} characters"
                    })
                    continue

                await websocket.send_json({
                    "type": "generation_start",
                    "text_length": len(text),
                    "language": language,
                })

                # Stream TTS audio
                async for chunk_data in _stream_tts(text, voice_id, language, speed, temperature):
                    if chunk_data["type"] == "audio":
                        # Send metadata
                        await websocket.send_json({
                            "type": "audio_chunk",
                            "chunk_idx": chunk_data["chunk_idx"],
                            "sample_rate": chunk_data["sample_rate"],
                            "is_last": chunk_data.get("is_last", False),
                        })
                        # Send audio bytes
                        await websocket.send_bytes(chunk_data["audio"])
                    elif chunk_data["type"] == "complete":
                        await websocket.send_json({
                            "type": "generation_complete",
                            "duration_seconds": chunk_data.get("duration_seconds", 0),
                            "total_chunks": chunk_data.get("total_chunks", 0),
                        })
                    elif chunk_data["type"] == "error":
                        await websocket.send_json({
                            "type": "error",
                            "message": chunk_data["message"],
                        })

            elif msg_type == "stop":
                await websocket.send_json({"type": "stopped"})
                break

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "ts": time.time()})

    except WebSocketDisconnect:
        logger.info(f"Generation stream disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"Generation stream error: {e}", exc_info=True)
    finally:
        manager.disconnect(websocket, user_id)


async def _stream_tts(
    text: str,
    voice_id: Optional[str],
    language: str,
    speed: float,
    temperature: float,
):
    """Stream TTS audio chunks. Uses XTTS-v2 or TTS library."""
    try:
        from app.ml.tts_pipeline import get_tts_pipeline
        tts = get_tts_pipeline()

        chunk_idx = 0
        async for audio_chunk, sr in tts.stream(
            text=text,
            voice_id=voice_id,
            language=language,
            speed=speed,
            temperature=temperature,
        ):
            yield {
                "type": "audio",
                "chunk_idx": chunk_idx,
                "audio": audio_chunk,
                "sample_rate": sr,
                "is_last": False,
            }
            chunk_idx += 1

        yield {
            "type": "complete",
            "total_chunks": chunk_idx,
        }

    except Exception as e:
        logger.error(f"TTS streaming error: {e}")
        yield {"type": "error", "message": str(e)[:200]}


@router.websocket("/agent/stream")
async def conversational_agent_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
    voice_id: Optional[str] = Query(default=None),
    language: str = Query(default="en")
):
    """
    Live Conversational Voice Agent Stream.
    Client streams audio bytes, then sends {"type": "audio_end"}.
    Server runs STT -> LLM -> TTS and streams audio back.
    """
    user_id = await authenticate_ws(token)
    if not user_id:
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Unauthorized"})
        await websocket.close(code=4001)
        return

    connected = await manager.connect(websocket, user_id)
    if not connected:
        return

    logger.info(f"Agent stream started: user={user_id} voice={voice_id}")

    await websocket.send_json({
        "type": "ready",
        "message": "Agent stream connected. Send audio bytes, then {'type': 'audio_end'}.",
    })

    try:
        from app.ml.stt_pipeline import get_stt_pipeline
        from app.ml.llm_engine import get_llm_engine
        
        stt = get_stt_pipeline()
        llm = get_llm_engine()
        chat_session = llm.create_chat_session()
        
        audio_buffer = bytearray()

        while True:
            data = await websocket.receive()
            
            if "bytes" in data:
                audio_buffer.extend(data["bytes"])
                
            elif "text" in data:
                try:
                    msg = json.loads(data["text"])
                except json.JSONDecodeError:
                    continue
                    
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "ts": time.time()})
                    
                elif msg.get("type") == "stop":
                    break
                    
                elif msg.get("type") in ["audio_end", "text"]:
                    transcript = ""
                    if msg.get("type") == "audio_end":
                        if len(audio_buffer) < 100:
                            audio_buffer.clear()
                            continue

                        # 1. STT
                        await websocket.send_json({"type": "status", "message": "Listening..."})
                        transcript = await stt.transcribe_audio_chunk(bytes(audio_buffer))
                        audio_buffer.clear()
                    else:
                        transcript = msg.get("text", "")
                    
                    if not transcript.strip():
                        continue
                        
                    current_voice_id = msg.get("voice_id") or voice_id
                    if not current_voice_id:
                        await websocket.send_json({
                            "type": "error", 
                            "message": "Please select a Voice Identity for the agent before interacting."
                        })
                        continue
                        
                    await websocket.send_json({"type": "transcript", "text": transcript, "source": "user"})
                    
                    # 2. LLM
                    await websocket.send_json({"type": "status", "message": "Thinking..."})
                    llm_text = ""
                    async for token_text in llm.generate_response_stream(chat_session, transcript):
                        llm_text += token_text
                    
                    await websocket.send_json({"type": "transcript", "text": llm_text, "source": "agent"})
                    
                    # 3. TTS Stream
                    await websocket.send_json({"type": "status", "message": "Speaking..."})
                    async for chunk_data in _stream_tts(llm_text, current_voice_id, language, 1.0, 0.7):
                        if chunk_data["type"] == "audio":
                            await websocket.send_json({
                                "type": "audio_chunk",
                                "chunk_idx": chunk_data["chunk_idx"],
                                "sample_rate": chunk_data["sample_rate"]
                            })
                            await websocket.send_bytes(chunk_data["audio"])
                        elif chunk_data["type"] == "error":
                            await websocket.send_json({"type": "error", "message": chunk_data["message"]})
                            
                    await websocket.send_json({"type": "status", "message": "Idle"})

    except WebSocketDisconnect:
        logger.info(f"Agent stream disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"Agent stream error: {e}", exc_info=True)
    finally:
        manager.disconnect(websocket, user_id)

@router.websocket("/notifications")
async def notification_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
):
    """Real-time notification push channel."""
    user_id = await authenticate_ws(token)
    if not user_id:
        await websocket.accept()
        await websocket.close(code=4001)
        return

    connected = await manager.connect(websocket, user_id)
    if not connected:
        return

    await websocket.send_json({"type": "connected", "user_id": user_id})

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat", "ts": time.time()})
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, user_id)
