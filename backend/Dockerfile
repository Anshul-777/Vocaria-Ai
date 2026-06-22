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

COPY . .

# Copy and set permissions for start script
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 7860

CMD ["./start.sh"]
