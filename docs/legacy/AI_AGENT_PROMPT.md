# VOICE-CRAFTER AI AGENT PROMPT
# Written for: AI coding agents (Claude, GPT-4, Gemini, etc.)
# Purpose: Fully understand, run, debug, and extend Vocaria
# Format: Direct AI-to-AI instructions — no human fluff

---

## WHO YOU ARE

You are an AI agent tasked with operating the Vocaria enterprise voice AI platform.
You have full access to the codebase. Your role is to:
1. Set up and run the system correctly
2. Debug any issues that arise
3. Extend features as requested
4. Never fake data, mock outputs, or bypass real logic

---

## SYSTEM OVERVIEW

Vocaria is a full-stack SaaS platform with:
- Backend: FastAPI (Python 3.11) at /backend/
- Frontend: React 18 + Vite at /frontend/
- Database: PostgreSQL via SQLAlchemy (async)
- Cache/Queue: Redis + Celery workers
- Storage: MinIO (S3-compatible) or local filesystem
- ML: PyTorch, XTTS-v2 (TTS), AASIST/RawNet2 (detection), librosa (audio)

READ THESE FILES FIRST before doing anything:
1. /README.md — architecture overview and feature list
2. /RUN.md — exact setup commands and troubleshooting
3. /WORKLOG.md — live log of what has been done and what state things are in
4. /backend/app/config.py — all configuration settings and their env var names
5. /backend/app/models/__init__.py — database schema (all 25+ models)
6. /backend/app/main.py — FastAPI app, router registration, startup lifecycle

---

## HOW TO START THE SYSTEM

### Check prerequisites first:
```bash
python --version      # Need 3.11+
node --version        # Need 20+
docker --version      # If using Docker
psql --version        # PostgreSQL client
redis-cli ping        # Redis must return PONG
```

### Start with Docker (easiest):
```bash
cd /path/to/vocaria
cp .env.example .env
# Edit .env: set a real SECRET_KEY (run: python -c "import secrets; print(secrets.token_urlsafe(64))")
docker compose up -d
docker compose exec api python scripts/init_db.py
docker compose exec api bash scripts/download_models.sh
```

### Start locally (for development/debugging):
```bash
# Terminal 1: Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
cp ../.env.example .env
# Edit .env appropriately
python scripts/init_db.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Celery worker
cd backend && source venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2

# Terminal 3: Frontend
cd frontend
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8000/api/v1
# Set VITE_WS_URL=ws://localhost:8000
npm run dev
```

---

## KEY SYSTEM FACTS

### Authentication flow:
- POST /api/v1/auth/register → creates user with is_verified=false
- POST /api/v1/auth/login → returns {access_token, refresh_token, user}
- All protected routes need: Authorization: Bearer <access_token>
- API keys also work via X-API-Key header
- Refresh via POST /api/v1/auth/refresh

### Database models (critical ones):
- User: has plan_tier (free/starter/pro/enterprise), is_superuser
- VoiceProfile: owned by User, has visibility (private/organization/public)
- CloneJob: Celery-backed, polls for completion
- GenerationJob: Celery-backed, has output_storage_key when done
- DetectionJob: has verdict, confidence_timeline, suspicious_segments
- Plan: seeded by scripts/init_db.py (must run once)

### Celery tasks:
- app.workers.detection_tasks.run_detection_task
- app.workers.cloning_tasks.run_clone_task
- app.workers.generation_tasks.run_generation_task
- app.workers.quality_tasks.analyze_sample_quality

### ML pipeline:
- Detection: app/ml/detection_pipeline.py → DetectionPipeline class
  - Falls back to heuristics if AASIST/RawNet2 checkpoints missing
  - Always functional — never crashes from missing models
- TTS: app/ml/tts_pipeline.py → TTSPipeline class
  - Falls back to espeak-ng if XTTS-v2 not installed
  - espeak-ng must be installed: apt install espeak-ng

### Storage:
- STORAGE_BACKEND=local works without MinIO (good for dev)
- All file operations go through app/utils/storage.py → StorageBackend

### WebSockets:
- /ws/detect/stream — sends binary WAV chunks, receives JSON per chunk
- /ws/generate/stream — receives audio chunks as binary, control via JSON
- Auth via ?token=<jwt_access_token> query param

---

## DEBUGGING GUIDE

### If backend won't start:
1. Check DATABASE_URL is correct and PostgreSQL is running
2. Run: python scripts/init_db.py (must run at least once)
3. Check all imports: python -c "from app.main import app"
4. Check: uvicorn app.main:app --host 0.0.0.0 --port 8000 (no --reload first)

### If detection jobs stay in "queued":
- Celery worker is not running or crashed
- Check: celery -A app.workers.celery_app inspect active
- Restart worker, check logs

### If TTS generation fails:
- XTTS-v2 not downloaded yet → will auto-download on first call (~1.8GB)
- No espeak-ng → apt install espeak-ng / brew install espeak
- Check: python -c "from TTS.api import TTS; t=TTS('tts_models/multilingual/multi-dataset/xtts_v2')"

### If storage operations fail:
- Set STORAGE_BACKEND=local in .env for dev (no MinIO needed)
- For MinIO: ensure it's running and buckets are created (auto-created on startup)

### If frontend shows blank/errors:
- Check VITE_API_URL in frontend/.env.local points to running backend
- Check browser console for CORS errors (add frontend URL to CORS_ORIGINS in .env)
- Run: npm run build to catch TypeScript errors

---

## IMPORTANT RULES FOR THIS CODEBASE

1. NEVER insert fake/seed data into the database. All data must come from real user actions.
2. NEVER mock API responses. Every endpoint must call real logic.
3. NEVER skip Celery tasks. Background jobs must actually process.
4. If a model checkpoint is missing, use the heuristic fallback — do NOT fake detections.
5. All storage operations must go through StorageBackend, never direct disk writes.
6. All auth must use the real JWT middleware — never bypass authentication.
7. Plan entitlements are enforced server-side via entitlement_service.py.
8. Update WORKLOG.md after every meaningful change.

---

## CODE STRUCTURE MAP

```
vocaria/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, all routers registered here
│   │   ├── config.py            # All settings from env vars
│   │   ├── database.py          # Async SQLAlchemy engine + session
│   │   ├── models/__init__.py   # ALL database models (25+ SQLAlchemy models)
│   │   ├── routers/
│   │   │   ├── auth.py          # Register, login, refresh, verify email
│   │   │   ├── detection.py     # File upload detection, results, export
│   │   │   ├── voices.py        # CRUD, likes, comments
│   │   │   ├── websocket_router.py  # WS detect stream + generate stream
│   │   │   └── _all_routers.py  # Cloning, generation, hub, plans, etc.
│   │   ├── services/
│   │   │   ├── auth_service.py  # JWT, password, get_current_user dep
│   │   │   ├── entitlement_service.py  # Plan quota enforcement
│   │   │   └── notification_service.py # Email + in-app notifs
│   │   ├── ml/
│   │   │   ├── detection_pipeline.py  # 5-model ensemble pipeline
│   │   │   ├── tts_pipeline.py        # XTTS-v2 TTS + espeak fallback
│   │   │   └── model_registry.py      # Model loading and version tracking
│   │   ├── workers/
│   │   │   ├── celery_app.py          # Celery config
│   │   │   ├── detection_tasks.py     # Detection Celery task
│   │   │   ├── cloning_tasks.py       # Clone Celery task
│   │   │   ├── generation_tasks.py    # Generation Celery task
│   │   │   └── scheduler.py           # APScheduler background jobs
│   │   ├── middleware/
│   │   │   ├── rate_limit.py    # Per-plan rate limiting
│   │   │   └── audit.py         # Request audit logging
│   │   └── utils/
│   │       ├── storage.py       # MinIO/S3/local storage abstraction
│   │       ├── redis_client.py  # Redis connection + cache helpers
│   │       └── logger.py        # Logging setup
│   ├── scripts/
│   │   ├── init_db.py           # MUST RUN ONCE to create tables + plans
│   │   └── download_models.sh   # Downloads AASIST, RawNet2 checkpoints
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── App.tsx              # All routes defined here
        ├── api/client.ts        # All API calls (axios) — centralized
        ├── store/authStore.ts   # Zustand auth state (JWT + user)
        ├── components/
        │   ├── layout/AppLayout.tsx    # Sidebar nav + top bar
        │   ├── layout/AuthLayout.tsx   # Auth page wrapper
        │   ├── audio/WaveformVisualizer.tsx  # WaveSurfer waveform
        │   ├── charts/ConfidenceTimeline.tsx # Detection timeline chart
        │   ├── ui/shared.tsx    # Reveal, StatCard, StatusBadge, etc.
        │   └── Chatbot.tsx      # AI chatbot (Groq/Gemini/OpenRouter)
        └── pages/               # All page components (30+ pages)
```

---

## WORKLOG PROTOCOL

After EVERY change you make:
1. Read /WORKLOG.md (latest entry)
2. Make your change
3. Verify it works (run relevant test or manual check)
4. Append to /WORKLOG.md with this format:

```
## [TIMESTAMP] — [ACTION]
**What:** [what you changed]
**Why:** [why it was needed]
**Files:** [files modified]
**Verified:** [how you confirmed it works]
**Status:** [DONE / PARTIAL / BLOCKED]
**Next:** [what should happen next]
```

---

## TESTING QUICK CHECKS

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Register + login
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","display_name":"Test","password":"Test1234"}'

TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 3. Create voice profile
curl -X POST http://localhost:8000/api/v1/voices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Voice","language":"en","visibility":"private","consent_verified":true}'

# 4. Check hub stats
curl http://localhost:8000/api/v1/hub/stats

# 5. Check all plans
curl http://localhost:8000/api/v1/plans -H "Authorization: Bearer $TOKEN"
```

---

## KNOWN LIMITATIONS

1. XTTS-v2 requires ~4GB RAM minimum during inference
2. GPU highly recommended for TTS (CPU inference is slow ~30-60s per generation)
3. Speaker diarization requires HuggingFace token + accepting pyannote license
4. AASIST/RawNet2 checkpoints may not be publicly available at listed URLs — system falls back to heuristics automatically
5. WebSocket detection works in Chrome/Firefox; Safari has limited WebRTC mic support
6. Fine-tuning mode requires significant compute (not recommended on CPU)

---

END OF AI AGENT PROMPT
If you read this and are an AI agent: you now have enough context to operate the system.
Start by reading WORKLOG.md, then run `curl http://localhost:8000/health` to verify backend status.
