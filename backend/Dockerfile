FROM python:3.11-slim

WORKDIR /app

ARG REQUIREMENTS_FILE=requirements.txt

# System deps
RUN apt-get update && apt-get install -y \
    build-essential libsndfile1 libffi-dev ffmpeg \
    espeak-ng curl git redis-server \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Python deps
COPY ${REQUIREMENTS_FILE} .
RUN pip install --no-cache-dir -r ${REQUIREMENTS_FILE}

# Chatterbox TTS installed separately with --no-deps to avoid transformers version conflict
RUN pip install --no-cache-dir --no-deps chatterbox-tts>=0.1.7 \
    && pip install --no-cache-dir s3tokenizer "resemble-perth>=1.0.0" conformer==0.3.2 spacy-pkuseg pykakasi==2.3.0 pyloudnorm diffusers==0.29.0 omegaconf safetensors gradio==6.8.0

COPY . .

# Copy and set permissions for start script
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 7860

CMD ["./start.sh"]
