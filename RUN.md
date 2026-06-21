# Vocaria — Run Guide

This guide covers running Vocaria locally for development and production.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 15+ | `brew install postgresql` / [postgresql.org](https://postgresql.org) |
| Redis | 7+ | `brew install redis` / [redis.io](https://redis.io) |
| Docker (optional) | 24+ | [docker.com](https://docker.com) |
| ffmpeg | any | `brew install ffmpeg` / `apt install ffmpeg` |

---

## Option A — Docker Compose (Recommended)

The fastest way to run the complete stack.

### Step 1: Clone and configure
```bash
git clone https://github.com/your-org/vocaria.git
cd vocaria
cp .env.example .env
# Edit .env with your settings (minimum: SECRET_KEY)
```

### Step 2: Start all services
```bash
docker compose up -d
```
### Start a lightweight dev Docker stack (faster, skips heavy worker builds)
If you want to validate the API + frontend quickly without building the ML-heavy worker images, use the provided `docker-compose.dev.yml`:

```bash
cd /path/to/vocaria
cp .env.example .env
# Edit .env for production credentials or use defaults for dev
docker compose -f docker-compose.dev.yml up -d --build
docker compose exec api python scripts/init_db.py
# Only download models when you need them (large):
# docker compose exec api bash scripts/download_models.sh
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO (storage) on port 9000 (console: 9001)
- FastAPI backend on port 8000
- Celery worker (background jobs)
- Celery beat (scheduled tasks)
- React frontend on port 3000
- Flower (task monitor) on port 5555

### Step 3: Initialize database
```bash
docker compose exec api python scripts/init_db.py
```

### Step 4: Download ML models
```bash
docker compose exec api bash scripts/download_models.sh
```

### Step 5: Open the app
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/api/docs
- **MinIO Console:** http://localhost:9001 (user: minioadmin, pass: minioadmin)
- **Flower (tasks):** http://localhost:5555

---

## Option B — Local Development (No Docker)

### Step 1: Start PostgreSQL and Redis

**macOS (Homebrew):**
```bash
brew services start postgresql@16
brew services start redis
createdb voicecrafter
```

**Ubuntu/Debian:**
```bash
sudo systemctl start postgresql redis
sudo -u postgres createdb voicecrafter
sudo -u postgres psql -c "CREATE USER voicecrafter WITH PASSWORD 'voicecrafter';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE voicecrafter TO voicecrafter;"
```

**Windows (WSL2 recommended):**
```bash
sudo service postgresql start
sudo service redis-server start
```

### Step 2: Start MinIO (optional — or use local storage)

```bash
# Download MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
./minio server /tmp/minio-data --console-address :9001 &

# OR use local filesystem storage by setting in .env:
# STORAGE_BACKEND=local
# LOCAL_STORAGE_PATH=/tmp/vocaria-storage
```

### Step 3: Set up backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Install PyTorch (CPU version — fastest to install)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# For NVIDIA GPU:
# pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# For Apple Silicon GPU:
# pip install torch torchaudio

# Copy and edit environment
cp ../.env.example .env
# Edit .env: set DATABASE_URL, STORAGE_BACKEND, etc.

# Initialize database (creates all tables + plan records)
python scripts/init_db.py

# Download ML models
bash scripts/download_models.sh

# Start the API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4: Start Celery worker (new terminal)

```bash
cd backend
source venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2
```

### Step 5: Set up frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# .env.local contents:
# VITE_API_URL=http://localhost:8000/api/v1
# VITE_WS_URL=ws://localhost:8000

# Start dev server
npm run dev
```

### Step 6: Open the app
- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8000/api/docs

---

## First-Time Setup

### 1. Create your first account
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","username":"admin","display_name":"Admin User","password":"Admin1234"}'
```

### 2. (Optional) Grant superuser for admin panel
```bash
# Connect to database
psql postgresql://voicecrafter:voicecrafter@localhost:5432/voicecrafter

# Grant superuser
UPDATE users SET is_superuser = true WHERE email = 'admin@example.com';
```

### 3. Test API
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Check profile
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Setting Up the AI Chatbot

The in-app VoiceBot chatbot supports three free AI providers:

### Groq (Recommended — Fast, Free tier)
1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key
3. In the app: click the chat bubble → Settings → Provider: Groq → paste key

### Google Gemini (Free tier)
1. Get key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. In the app: Provider: Gemini → paste key

### OpenRouter (Free models available)
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Create key, select a :free model
3. In the app: Provider: OpenRouter → paste key

---

## Downloading Detection Models

Detection works with heuristic fallback when checkpoints are missing, but for best accuracy:

```bash
cd backend

# Download AASIST (graph attention anti-spoofing, ~5MB)
mkdir -p models/aasist
curl -L -o models/aasist/AASIST.pth \
  https://github.com/clovaai/aasist/releases/download/v1.0/AASIST.pth

# Download RawNet2 (~3MB)
mkdir -p models/rawnet2
curl -L -o models/rawnet2/RawNet2.pth \
  https://github.com/eurecom-asp/RawNet2-antispoofing/releases/download/v1.0/RawNet2.pth

# Update .env
echo "AASIST_MODEL_PATH=./models/aasist/AASIST.pth" >> .env
echo "RAWNET2_MODEL_PATH=./models/rawnet2/RawNet2.pth" >> .env
```

### XTTS-v2 TTS Model (~1.8 GB)
Downloads automatically on first generation request. To pre-download:
```bash
python3 -c "from TTS.api import TTS; TTS(model_name='tts_models/multilingual/multi-dataset/xtts_v2')"
```

### Speaker Diarization (Optional)
Requires accepting the pyannote license on HuggingFace:
1. Accept license: https://huggingface.co/pyannote/speaker-diarization-3.1
2. Get HF token: https://huggingface.co/settings/tokens
3. Set in .env: `HF_TOKEN=hf_your_token`
4. Set: `FEATURE_DIARIZATION=true`

---

## Production Deployment

### Environment
```bash
# Generate secure secret key
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# Set in .env
ENVIRONMENT=production
SECRET_KEY=<generated-key>
DEBUG=false
```

### SSL / Reverse Proxy (nginx example)
```nginx
server {
    listen 443 ssl;
    server_name app.vocaria.ai;

    location / { proxy_pass http://localhost:3000; }
    location /api/ { proxy_pass http://localhost:8000; }
    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

### Build frontend for production
```bash
cd frontend
npm run build
# Serve dist/ with nginx or upload to CDN
```

---

## Troubleshooting

### "Cannot connect to PostgreSQL"
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432
# Check connection string in .env
```

### "Redis connection refused"
```bash
redis-cli ping  # Should return PONG
```

### "TTS model not found"
```bash
# Pre-download the model
python3 -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
# Or set STORAGE_BACKEND=local if MinIO is unavailable
```

### "WebSocket connection failed"
- Ensure backend is running on port 8000
- Check VITE_WS_URL in frontend/.env.local
- For production: ensure nginx proxies /ws/ with Upgrade headers

### "Celery tasks not running"
```bash
# Check worker is running
celery -A app.workers.celery_app inspect active
# Restart worker
celery -A app.workers.celery_app worker --loglevel=debug
```

### macOS: "Failed to build soundfile"
```bash
brew install libsndfile
pip install soundfile
```

---

## Services Summary

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 (Docker) / 5173 (dev) | http://localhost:3000 |
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/api/docs |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| Flower (Celery) | 5555 | http://localhost:5555 |
