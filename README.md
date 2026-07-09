<div align="center">

# 🎙️ Vocaria AI

### Enterprise Voice AI Platform — Clone · Generate · Detect · Stream

<p>
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Voice_AI-7C3AED?style=for-the-badge" />
  <img alt="Models" src="https://img.shields.io/badge/Models-5_Detection_+_3_TTS-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />
  <img alt="Languages" src="https://img.shields.io/badge/Languages-17-3178C6?style=for-the-badge" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" />
</p>
<p>
  <img alt="FastAPI" src="https://img.shields.io/badge/API-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/UI-React_18-149ECA?style=flat-square&logo=react&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/DB-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Queue-Redis_+_Celery-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Deploy-Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
</p>

**The most complete open-source voice AI platform.**<br/>
Real voice cloning, expressive multilingual TTS, 5-model deepfake detection,<br/>live streaming analysis, a community voice hub, and full enterprise SaaS features — in one stack.

[🌐 Live Platform](https://vocaria-ai.vercel.app/) · [👤 Portfolio](https://anshul-portfolio.vercel.app/) · [✨ AexoTreX](https://aexotrex.vercel.app/)

</div>

---

## 📖 Overview

Vocaria is a **production-grade, full-stack voice AI platform** built for creators, developers, and enterprises who need to work with synthetic voice at every level of the stack — generation, cloning, detection, real-time agents, and community distribution.

The platform is structured as a monorepo with three deployment targets that operate independently or together:

| Layer | Stack | Purpose |
| :-- | :-- | :-- |
| **[`frontend/`](./frontend/README.md)** | React 18 · Vite · Tailwind · Framer Motion | Cinematic SPA — the full user-facing product |
| **[`backend/`](./backend/README.md)** | FastAPI · Celery · SQLAlchemy async | REST + WebSocket API with ML pipelines |
| **Infrastructure** | Docker Compose · PostgreSQL · Redis · MinIO | Data plane, broker, and object storage |

> [!NOTE]
> Each subsystem has its own detailed README. This document covers the **platform as a whole** — capabilities, system architecture, deployment, infrastructure, API surface, and environment configuration.

---

## 🏛️ Platform Capabilities

Vocaria is organized around six core pillars. Each pillar maps to a backend router group, a set of ML pipelines, and a dedicated frontend section.

| # | Pillar | What it does |
| :-- | :-- | :-- |
| 🤖 | **Vocaria Agent** | Real-time conversational voice sessions. STT → LLM reasoning → streaming TTS in a single WebSocket loop, with latency telemetry and session history. |
| 🪄 | **Generation Engine** | Expressive multilingual text-to-speech using Kokoro-82M, Parler TTS, and XTTS-v2. Supports 17 languages, 8 emotion styles, SSML, and streaming audio output. |
| 🫆 | **Voice Cloning** | Zero-shot cloning from 3+ seconds of audio. Speaker embeddings are versioned and stored; fine-tune mode increases similarity. Quality analysis runs before cloning begins. |
| 🛡️ | **Deepfake Detection** | 5-model ensemble (Wav2Vec2 + AASIST + RawNet2 + spectral + prosodic) for AI probability scoring. Real-time WebSocket streaming from microphone. Speaker diarization. Custody logs. |
| 🌐 | **Voice Hub** | Public community library. Upload, browse, like, comment on, and one-click clone voice profiles. Social follows, profile pages, and organization support. |
| 🎚️ | **Studio & Quality Lab** | Multi-track audio studio for sequencing TTS outputs. Drag-and-drop Quality Lab for SNR, speech ratio, clipping, deepfake probability, and per-speaker diarization on any audio file. |

---

## 🏗️ System Architecture

```
                          ┌──────────────────────────────────────────┐
    Browser / Client ────▶│           React SPA (Vercel)              │
                          │   Auth guard · Route graph · Framer UI    │
                          └──────────────┬──────────────┬─────────────┘
                                         │ REST          │ WebSocket
                                         ▼              ▼
                          ┌──────────────────────────────────────────┐
                          │             FastAPI  (Uvicorn)            │
                          │  ┌───────────────────────────────────┐   │
                          │  │  Middleware: CORS · GZip           │   │
                          │  │             RateLimit · Audit      │   │
                          │  └───────────────────────────────────┘   │
                          │  22 Routers: auth · voices · cloning ·   │
                          │  generation · detection · agent · hub ·  │
                          │  studio · quality · analytics · admin …  │
                          └──────┬────────────┬──────────────────────┘
                                 │            │
              ┌──────────────────┘            └───────────────────┐
              ▼                                                    ▼
  ┌─────────────────────┐                          ┌──────────────────────────┐
  │  Redis (Celery broker│                          │  PostgreSQL (asyncpg)    │
  │  + result backend)   │                          │  SQLAlchemy async models │
  └──────┬──────────────┘                          │  Alembic migrations      │
         │                                          └──────────────────────────┘
         │  dispatch async jobs
         ├──────────────┬─────────────────┐
         ▼              ▼                 ▼
  generation_tasks  cloning_tasks   detection_tasks
         │              │                 │
         └──────────────┴─────────────────┘
                        │
                        ▼
           ┌─────────────────────────────┐
           │     ML Model Registry       │
           │  TTS · Clone · Detect ·     │
           │  STT · LLM · Diarize        │
           └──────────────┬──────────────┘
                          │
                          ▼
         Object Storage (MinIO / S3 / local)
```

### Data Flow

- **Auth** — Supabase sessions verified on every request; JWT passed in the `Authorization` header. Protected routes on the frontend use Zustand state hydrated from Supabase's `onAuthStateChange`.
- **Short-lived requests** (TTS preview, hub browse, profile updates) — handled directly by FastAPI routers with async DB reads via SQLAlchemy.
- **Heavy ML jobs** (cloning, long-form TTS generation, batch detection) — enqueued to Celery via Redis, executed by workers in separate processes, results stored to object storage, status polled over REST.
- **Real-time** (voice agent, live detection, streaming TTS, notifications) — maintained over WebSocket connections handled by FastAPI's async router.

---

## 🧬 ML Model Ecosystem

Vocaria orchestrates a multi-model stack through a central `model_registry.py` that loads, caches, and manages the lifecycle of each network.

| Domain | Model(s) | Details |
| :-- | :-- | :-- |
| 🗣️ **Text-to-Speech** | **Kokoro-82M** · **Coqui XTTS-v2** · **Parler TTS** | Kokoro for fast, expressive output; XTTS-v2 for zero-shot cloning + multilingual; Parler for controllable prosody |
| 🫆 **Voice Cloning** | **XTTS-v2** · **Chatterbox Turbo** | Speaker embedding extraction; zero-shot and fine-tune modes |
| 🎧 **STT / Features** | **Wav2Vec2** | Speech representations for agent transcription and detection features |
| 🛡️ **Deepfake Detection** | **AASIST** · **RawNet2** · spectral + prosodic heuristics | Ensemble fusion → single AI probability score |
| 👥 **Diarization** | **Pyannote.audio 3.1** | Per-speaker segment attribution; requires `HF_TOKEN` |
| 🤖 **LLM Engine** | Vocaria Agent | Reasoning and response generation for the conversational agent |

> [!IMPORTANT]
> **Model weights** for AASIST and RawNet2 must be downloaded separately from their original repositories and placed at `backend/models/aasist/AASIST.pth` and `backend/models/rawnet2/RawNet2.pth`. Without them, the system falls back to built-in heuristic detectors — less accurate, but fully functional.
>
> **License note.** XTTS-v2 is subject to Coqui CPML — commercial use requires a separate agreement. Pyannote models require HuggingFace token and acceptance of pyannote's terms. All other model weights belong to their respective authors and are used under their original licenses.

---

## 🐳 Infrastructure

Vocaria ships three Docker Compose files to cover different deployment scenarios.

| File | Services | When to use |
| :-- | :-- | :-- |
| `docker-compose.yml` | Full stack (API + frontend + workers + PostgreSQL + Redis + MinIO) | Production or full local environment |
| `docker-compose.dev.yml` | Infrastructure only (PostgreSQL + Redis + MinIO) | Local development with hot-reload servers |
| `backend/docker-compose-infra.yml` | Same as above, backend-scoped | Backend-only development |
| `backend/docker-compose-workers.yml` | Celery workers only | Scaling workers independently |

### Service Map

```
┌─────────────┬───────────────────────────┬────────────┬──────────────┐
│ Service      │ Image                      │ Port       │ Role         │
├─────────────┼───────────────────────────┼────────────┼──────────────┤
│ api          │ backend/Dockerfile         │ 8000       │ FastAPI      │
│ frontend     │ nginx + built SPA          │ 3000       │ React UI     │
│ postgres     │ postgres:16                │ 5432       │ Primary DB   │
│ redis        │ redis:7-alpine             │ 6379       │ Broker/cache │
│ minio        │ minio/minio                │ 9000/9001  │ Object store │
│ worker-gen   │ backend/Dockerfile         │ —          │ TTS/gen jobs │
│ worker-det   │ backend/Dockerfile         │ —          │ Detection    │
│ worker-clone │ backend/Dockerfile         │ —          │ Cloning      │
└─────────────┴───────────────────────────┴────────────┴──────────────┘
```

---

## ⚡ Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 16** (or use Docker Compose)
- **Redis 7** (or use Docker Compose)
- **Git**

### Option A — Docker Compose (recommended)

The fastest path to a running platform. Starts all services including the database, broker, object storage, and workers.

```bash
git clone https://github.com/Anshul-A7/Vocaria-AI.git
cd Vocaria-AI

# Copy and configure environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env — set DATABASE_URL, SECRET_KEY, STORAGE_BACKEND, etc.

# Start everything
docker compose up -d
```

Access the platform at **http://localhost:3000** · API docs at **http://localhost:8000/api/docs**

---

### Option B — Local Development (hot-reload)

Start infrastructure via Docker, then run frontend and backend directly for fast iteration.

**Step 1 — Start infrastructure services**

```bash
docker compose -f docker-compose.dev.yml up -d
# Starts PostgreSQL, Redis, and MinIO only
```

**Step 2 — Start the backend API**

```bash
cd backend
cp .env.example .env
# Edit .env with your local settings

pip install -r requirements.txt

# Initialize the database schema
alembic upgrade head

# Run the API server
uvicorn app.main:app --reload --port 8000
```

**Step 3 — Start Celery workers** (separate terminals)

```bash
cd backend

# Generation + default queue
celery -A app.workers.celery_app worker -Q generation,default -c 4 --loglevel=info

# Detection + cloning queue
celery -A app.workers.celery_app worker -Q detection,cloning -c 2 --loglevel=info
```

**Step 4 — Start the frontend**

```bash
cd frontend
cp .env.example .env
# Edit .env — set VITE_API_BASE_URL=http://localhost:8000

npm install
npm run dev
```

Frontend runs at **http://localhost:5173** · API at **http://localhost:8000**

---

### Option C — Windows (run-local.bat)

A convenience launcher that starts uvicorn and Celery together on Windows using the project's virtual environment.

```bat
run-local.bat
```

> Requires the backend `.venv` to be set up under `backend/.venv/`. See `backend/README.md` for setup details.

---

## 🔌 Environment Variables

All configuration is environment-driven. Template files are included in the repository — never commit live values.

| File | Purpose |
| :-- | :-- |
| [`backend/.env.example`](./backend/.env.example) | Full backend configuration template |
| [`frontend/.env.example`](./frontend/.env.example) | Frontend Vite variable template |

### Key variables at a glance

| Variable | Location | Description |
| :-- | :-- | :-- |
| `SECRET_KEY` | backend | JWT signing secret — use a strong 64-char random value in production |
| `DATABASE_URL` | backend | Async PostgreSQL DSN (`postgresql+asyncpg://...`) |
| `REDIS_URL` | backend | Redis connection string for caching |
| `CELERY_BROKER_URL` | backend | Redis URL for Celery job dispatch |
| `STORAGE_BACKEND` | backend | `minio` · `s3` · `local` |
| `STORAGE_ENDPOINT` | backend | MinIO host (e.g. `localhost:9000`) |
| `HF_TOKEN` | backend | HuggingFace token required for Pyannote diarization |
| `STRIPE_SECRET_KEY` | backend | Stripe key for subscription billing |
| `AGENT_API_KEY` | backend | Internal key for Vocaria Agent LLM responses |
| `DIARIZATION_ENABLED` | backend | Toggle speaker diarization (`true` / `false`) |
| `DEVICE` | backend | Inference device: `auto` · `cpu` · `cuda` · `mps` |
| `MODELS_DIR` | backend | Path to downloaded model weight files |
| `VITE_API_BASE_URL` | frontend | Backend origin used by the React app |
| `VITE_SUPABASE_URL` | frontend | Supabase project endpoint |
| `VITE_SUPABASE_ANON_KEY` | frontend | Supabase public anon key for browser auth |

### Storage backends

```env
# Local filesystem (no extra services needed)
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=/tmp/vocaria

# MinIO (self-hosted S3-compatible, default in Docker Compose)
STORAGE_BACKEND=minio
STORAGE_ENDPOINT=localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin

# AWS S3
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=vocaria-audio
```

---

## 🌐 API Reference

Full interactive documentation is available at **`/api/docs`** (Swagger UI) and **`/api/redoc`** when the backend is running.

### REST endpoints

```
Authentication
  POST  /api/v1/auth/register        Register a new user
  POST  /api/v1/auth/login           Issue JWT access + refresh tokens
  POST  /api/v1/auth/refresh         Refresh access token
  POST  /api/v1/auth/logout          Invalidate session

Voices & Cloning
  GET   /api/v1/voices               List user's voice profiles
  POST  /api/v1/voices               Create a new voice profile
  GET   /api/v1/voices/:id           Get voice profile details
  DELETE /api/v1/voices/:id          Delete voice profile
  POST  /api/v1/cloning/start        Enqueue a clone job (returns job_id)
  GET   /api/v1/cloning/:job_id      Poll clone job status

Generation (TTS)
  POST  /api/v1/generation           Enqueue TTS job (returns job_id)
  GET   /api/v1/generation/:job_id   Poll generation job + download URL

Deepfake Detection
  POST  /api/v1/detection/analyze    Enqueue batch detection job
  GET   /api/v1/detection/:job_id    Poll detection results + report
  GET   /api/v1/detection/:job_id/report  Download full JSON evidence log

Voice Hub
  GET   /api/v1/hub/voices           Browse public voice library
  POST  /api/v1/hub/voices/:id/like  Like a voice profile
  POST  /api/v1/hub/voices/:id/clone Clone a hub voice to your library

Quality Lab
  POST  /api/v1/quality/analyze      Analyze audio file (SNR, clipping, diarization)

Analytics & Platform
  GET   /api/v1/analytics/usage      Usage statistics for current user
  GET   /api/v1/benchmarks           Model benchmarks and cost estimator data
  GET   /api/v1/audit                Paginated audit log (admin: all users)
  GET   /api/v1/history              Generation and detection history
  GET   /api/v1/notifications        Notification feed
  GET   /api/v1/plans                Available subscription plans
```

### WebSocket endpoints

```
WS  /ws/detect/stream        Live deepfake detection — stream microphone audio, receive
                              per-chunk AI probability scores and speaker segments in real time

WS  /ws/generate/stream      Streaming TTS output — receive synthesized audio chunks as
                              they are generated, enabling low-latency playback

WS  /ws/agent                Full voice agent session — STT → LLM → TTS in a single
                              persistent connection with session context

WS  /ws/notifications        Server-sent notification events (new follows, job completions,
                              system alerts) pushed to authenticated clients
```

---

## 💼 Plans & Entitlements

Vocaria ships as a multi-tenant SaaS platform with four tiers. Feature access is enforced server-side by `services/entitlement_service.py`.

| Feature | Free | Starter | Pro | Enterprise |
| :-- | :--: | :--: | :--: | :--: |
| TTS generations / month | 50 | 500 | 5,000 | Unlimited |
| Voice cloning profiles | 1 | 5 | 25 | Unlimited |
| Detection minutes / month | 10 | 60 | 300 | Unlimited |
| SSML support | — | — | ✓ | ✓ |
| Fine-tune cloning | — | — | ✓ | ✓ |
| Speaker diarization | — | ✓ | ✓ | ✓ |
| API key access | — | ✓ | ✓ | ✓ |
| Audit log export | — | — | ✓ | ✓ |
| SLA / support | — | — | — | ✓ |

---

## 🔐 Security

| Concern | Approach |
| :-- | :-- |
| **Authentication** | Supabase JWT; tokens verified on every protected route |
| **Rate limiting** | Per-client throttling via `middleware/rate_limit.py` |
| **Audit trail** | Every state-mutating API call logged with user, IP, timestamp, and result |
| **Secrets** | All credentials are environment-injected; `.env` files are git-ignored |
| **CORS** | Configured per-environment in `app/config.py` |
| **Payment** | Stripe handles card data; no PAN ever touches Vocaria servers |

---

## 🗂️ Repository Structure

```
Vocaria-AI/
├─ frontend/                  React SPA — see frontend/README.md
├─ backend/                   FastAPI service — see backend/README.md
├─ docker-compose.yml         Full-stack production / local compose
├─ docker-compose.dev.yml     Infrastructure-only compose (dev mode)
├─ .env.example               Root environment reference
├─ .gitignore                 Ignores .env, models, storage, __pycache__
├─ LICENSE                    MIT
└─ README.md                  ← You are here
```

---

## 📄 License

**MIT License** — see [LICENSE](./LICENSE) for details.

**Third-party model licenses:**
- **XTTS-v2** — Coqui CPML; commercial use requires a separate agreement with Coqui AI.
- **AASIST / RawNet2** — original authors' research licenses; weights must be obtained from their respective repositories.
- **Pyannote.audio** — HuggingFace model terms; requires token acceptance before download.
- All other models and dependencies are used under their respective open-source licenses.

---

<div align="center">

### One platform. Every dimension of voice.

Built by [**Anshul**](https://anshul-portfolio.vercel.app/) · Powered by [**AexoTreX**](https://aexotrex.vercel.app/)

<sub>© Vocaria AI — Cloning · Generation · Detection · Agents · Hub · Studio.</sub>

</div>
