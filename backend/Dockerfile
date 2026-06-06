# ── Stage 1: ML pipeline ─────────────────────────────────────
# Generates synthetic data and trains models before the API starts.
# This is a separate stage so model files are baked into the image.
FROM python:3.11-slim AS ml-builder

WORKDIR /app

# Install ML dependencies
COPY ml/requirements_ml.txt ./
RUN pip install --no-cache-dir -r requirements_ml.txt

# Copy and run the ML pipeline
COPY ml/ ./ml/
RUN cd ml && \
    python synthetic_data_generator.py && \
    python risk_model.py && \
    echo "✅ ML pipeline complete"

# ── Stage 2: Backend API ──────────────────────────────────────
FROM python:3.11-slim AS backend

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy trained model files from ml-builder stage
COPY --from=ml-builder /app/ml/data/ ./ml/data/

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose the API port
EXPOSE 8000

# Health check — verifies the API is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Start the API
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
