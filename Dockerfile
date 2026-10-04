# ==============================================================================
# Multi-Stage Dockerfile for 3D Printer Predictive Maintenance
# Serves Vite React Frontend + Flask ML Backend in a single Railway service
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend (Node.js)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first for better caching
COPY frontend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy frontend code and build
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python Backend Runtime
# ------------------------------------------------------------------------------
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=5000

WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application files, data, and models
COPY backend/ ./backend/
COPY data/ ./data/

# Copy compiled static frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose runtime port
EXPOSE 5000

# Run with Gunicorn WSGI server binding to Railway's dynamic $PORT
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --threads 4 --timeout 120 backend.app:app"]
