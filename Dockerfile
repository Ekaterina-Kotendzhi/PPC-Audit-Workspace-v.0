# Stage 1: собрать frontend → app/static/js/app.js
FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN node build.mjs

# Stage 2: Python API + Playwright PDF
FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    ca-certificates \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
ENV PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=300000
RUN python -m playwright install --with-deps chromium \
    || python -m playwright install --with-deps chromium

COPY . .
COPY --from=frontend /build/app/static/js/app.js /app/app/static/js/app.js

RUN mkdir -p /app/data /app/app/uploads /app/app/exports

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
