#!/bin/bash

# Exit on error
set -e

echo "Starting local Redis server..."
redis-server --daemonize yes

echo "Waiting for Redis to be ready..."
sleep 2

echo "Starting Celery worker..."
celery -A app.workers.celery_app worker --loglevel=info --pool=solo &

echo "Starting FastAPI server..."
# Using the same command HF Spaces expects for Docker deployments
exec uvicorn app.main:app --host 0.0.0.0 --port 7860
