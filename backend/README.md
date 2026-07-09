---
title: Vocaria Backend
emoji: 📊
colorFrom: blue
colorTo: pink
sdk: docker
pinned: false
license: apache-2.0
---

<div align="center">

# 🧠 Vocaria · Backend

### The intelligence & orchestration layer of the Enterprise Voice AI Platform

<p>
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-async-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img alt="PyTorch" src="https://img.shields.io/badge/PyTorch-ML-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>
<p>
  <img alt="Celery" src="https://img.shields.io/badge/Workers-Celery-37814A?style=flat-square&logo=celery&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Broker-Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/DB-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="SQLAlchemy" src="https://img.shields.io/badge/ORM-SQLAlchemy_async-D71F00?style=flat-square" />
  <img alt="Supabase" src="https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img alt="WebSocket" src="https://img.shields.io/badge/Realtime-WebSocket-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square" />
</p>

**An async FastAPI service** unifying voice generation, cloning, real-time agents,<br/>and deepfake detection behind one authenticated, observable API.

[🌐 Live Platform](https://vocaria-ai.vercel.app/) · [👤 Portfolio](https://anshul-portfolio.vercel.app/) · [✨ AexoTreX](https://aexotrex.vercel.app/)

</div>

---

## 📖 Overview

The Vocaria backend is a **modular, async-first FastAPI application** that exposes the full
voice lifecycle as a clean REST + WebSocket surface. Heavy machine-learning work is offloaded
to **Celery workers**, model weights are managed by a central **model registry**, and every
request flows through **rate-limiting and audit middleware** for security and traceability.

> [!NOTE]
> Subsystems initialize **best-effort** at startup (`app/main.py` lifespan) — the model
> registry, Redis, storage backend, and scheduler each boot independently, so the API stays
> available even when an optional dependency is offline.

---

## 🧬 Capability Map

| Domain | Router(s) | ML Pipeline | Async Worker |
| :-- | :-- | :-- | :-- |
| 🤖 **Conversational Agent** | `agent`, `streaming`, `websocket_router` | `ml/llm_engine`, `ml/stt_pipeline` | — |
| 🪄 **Generation Engine** | `generation`, `voices` | `ml/tts_pipeline`, `ml/tts/` | `workers/generation_tasks` |
| 🫆 **Voice Cloning** | `cloning` | `ml/cloning/` | `workers/cloning_tasks` |
| 🛡️ **Deepfake Detection** | `detection` | `ml/detection_pipeline`, `ml/detectors/` | `workers/detection_tasks` |
| 🌐 **Community Hub** | `hub`, `users`, `organizations` | — | — |
| 🎚️ **Studio** | `studio`, `uploads` | — | `workers/quality_tasks` |
| 📊 **Ops & Trust** | `analytics`, `benchmarks`, `quality`, `audit_logs`, `history`, `admin` | — | `workers/scheduler` |
| 🔐 **Access** | `auth`, `apikeys`, `plans`, `notifications` | — | — |

---

## 🏗️ System Architecture

```
                         ┌────────────────────────────┐
   Client / Frontend ───▶│  FastAPI  (app/main.py)     │
   REST + WebSocket      │  ├─ CORS · GZip             │
                         │  ├─ RateLimitMiddleware     │
                         │  ├─ AuditMiddleware         │
                         │  └─ Routers (22 modules)    │
                         └───────┬───────────┬─────────┘
                                 │           │
                 enqueue jobs    │           │  read/write
                                 ▼           ▼
                    ┌────────────────┐   ┌────────────────────┐
                    │  Redis broker  │   │  PostgreSQL (async │
                    │  (Celery)      │   │  SQLAlchemy+Alembic)│
                    └───────┬────────┘   └────────────────────┘
                            │
             ┌──────────────┼───────────────┐
             ▼              ▼               ▼
     generation_tasks  cloning_tasks   detection_tasks
             │              │               │
             ▼              ▼               ▼
                 ┌────────────────────────────┐
                 │   ML Model Registry         │
                 │   TTS · Clone · Detect ·    │
                 │   Diarize · STT · LLM       │
                 └────────────────────────────┘
                            │
                            ▼
                 Object Storage (MinIO / S3 / local)
```

### 📁 Project Structure

```
backend/
├─ app/
│  ├─ main.py               # FastAPI app · lifespan · middleware wiring
│  ├─ config.py             # Pydantic settings (env-driven)
│  ├─ database.py           # Async engine, Base, session factory
│  ├─ models/               # SQLAlchemy ORM models
│  ├─ routers/              # 22 REST/WS routers (auth → studio)
│  ├─ services/             # auth · entitlement · notification services
│  ├─ middleware/           # rate_limit · audit
│  ├─ ml/
│  │  ├─ model_registry.py  # Central model loader / lifecycle
│  │  ├─ tts_pipeline.py    # Text-to-speech synthesis
│  │  ├─ cloning/           # Speaker embedding + clone synthesis
│  │  ├─ detection_pipeline.py + detectors/   # Deepfake ensemble
│  │  ├─ stt_pipeline.py    # Speech-to-text
│  │  └─ llm_engine.py      # Agent reasoning
│  ├─ workers/              # Celery app + task modules + scheduler
│  └─ utils/                # logger · redis_client · storage
├─ alembic.ini              # DB migration config
├─ docker-compose*.yml      # infra · workers · full-stack composes
├─ Dockerfile               # Container image (HF Spaces compatible)
└─ requirements*.txt        # runtime / dev dependency sets
```

---

## 🧠 ML Model Registry & Credits

Vocaria orchestrates a suite of specialized open models through
`app/ml/model_registry.py`. Each domain is served by a purpose-built network:

| Domain | Model(s) | Role |
| :-- | :-- | :-- |
| 🗣️ **Text-to-Speech** | **Kokoro-82M**, **Coqui XTTS-v2**, **Parler TTS** | Expressive multilingual synthesis |
| 🫆 **Voice Cloning** | **Coqui XTTS-v2**, **Chatterbox Turbo** | Zero-shot + fine-tuned cloning |
| 🎧 **Feature Extraction / STT** | **Wav2Vec2** | Speech representations & transcription |
| 🛡️ **Deepfake Detection** | **AASIST**, **RawNet2** | Anti-spoofing ensemble scoring |
| 👥 **Speaker Diarization** | **Pyannote.audio** | "Who spoke when" segmentation |

> [!IMPORTANT]
> **Model credits.** Vocaria builds on the work of the open-source research community.
> All trademarks and weights belong to their respective authors and are used under their
> original licenses. Attribution: **Kokoro-82M · Coqui XTTS-v2 · Parler TTS ·
> Chatterbox Turbo · Wav2Vec2 · AASIST · RawNet2 · Pyannote.audio**.

<details>
<summary><b>Detection pipeline detail</b></summary>

The deepfake detector fuses independent signals — spectral, prosodic, and neural artifact
analysis via **AASIST** and **RawNet2**, with **Wav2Vec2** embeddings — into an ensemble
manipulation probability. Segments stream over WebSocket in real time, **Pyannote.audio**
attributes each segment to a speaker, and an immutable chain-of-custody log seals every
verdict for compliance.
</details>

---

## 🔌 Configuration

All settings are environment-driven via `app/config.py` (Pydantic). See
[`.env.example`](./.env.example) for the full template.

<details>
<summary><b>Core environment reference</b></summary>

```env
# Application
APP_NAME=Vocaria
ENVIRONMENT=development
SECRET_KEY=<strong-random-64-char-string>

# Data plane
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/vocaria
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Object storage
STORAGE_BACKEND=minio            # minio | s3 | local
STORAGE_ENDPOINT=localhost:9000

# ML runtime
MODELS_DIR=./models
DEVICE=auto                      # auto | cpu | cuda | mps
TTS_MODEL=tts_models/multilingual/multi-dataset/xtts_v2
AASIST_MODEL_PATH=./models/aasist/AASIST.pth
RAWNET2_MODEL_PATH=./models/rawnet2/RawNet2.pth

# Diarization (HuggingFace token required for pyannote)
DIARIZATION_ENABLED=true
HF_TOKEN=<huggingface-token>
```
</details>

| Group | Keys | Purpose |
| :-- | :-- | :-- |
| **Database** | `DATABASE_URL` | Async PostgreSQL DSN (asyncpg) |
| **Cache / Broker** | `REDIS_URL`, `CELERY_*` | Redis cache + Celery transport |
| **Storage** | `STORAGE_BACKEND`, `STORAGE_*` | MinIO / S3 / local object store |
| **ML** | `MODELS_DIR`, `DEVICE`, `*_MODEL_PATH`, `HF_TOKEN` | Weights & inference device |
| **Billing** | `PAYMENT_GATEWAY`, `STRIPE_*` | Subscription entitlements |
| **Auth / OAuth** | `SECRET_KEY`, `GOOGLE_*`, `GITHUB_*` | Tokens & social login |

---

## 🛡️ Cross-Cutting Concerns

| Concern | Implementation |
| :-- | :-- |
| **Rate limiting** | `middleware/rate_limit.py` — per-client throttling |
| **Audit trail** | `middleware/audit.py` + `routers/audit_logs.py` — tamper-evident logs |
| **Entitlements** | `services/entitlement_service.py` — plan-gated feature access |
| **Notifications** | `services/notification_service.py` + `routers/notifications.py` |
| **Real-time** | `routers/streaming.py`, `routers/websocket_router.py` — WS streaming |
| **Scheduling** | `workers/scheduler.py` — periodic background jobs |
| **Migrations** | Alembic (`alembic.ini`) over async SQLAlchemy models |

---

## 📦 Technology

| Layer | Choice |
| :-- | :-- |
| **API** | FastAPI (async) + Uvicorn |
| **Validation / Settings** | Pydantic |
| **Database** | PostgreSQL · SQLAlchemy (async) · Alembic |
| **Cache & Queue** | Redis · Celery |
| **ML runtime** | PyTorch · Transformers · Coqui TTS · Pyannote |
| **Storage** | MinIO / S3 / local (pluggable) |
| **Auth** | Supabase + JWT · OAuth (Google, GitHub) |
| **Packaging** | Docker · Docker Compose · HuggingFace Spaces |

---

<div align="center">

### Enterprise voice, engineered end to end.

Built by [**Anshul**](https://anshul-portfolio.vercel.app/) · Powered by [**AexoTreX**](https://aexotrex.vercel.app/)

<sub>© Vocaria — Cloning · Generation · Detection · Agents.</sub>

</div>
