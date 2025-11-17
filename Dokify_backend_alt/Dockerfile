# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables for optimal performance
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SUNO_USE_SMALL_MODELS=True \
    SUNO_OFFLOAD_CPU=True \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies (minimal set)
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    poppler-utils \
    libsndfile1-dev \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app directories
RUN mkdir -p /app/uploads /app/audiobooks /app/covers && \
    chmod -R 755 /app/uploads /app/audiobooks /app/covers

# Install Python dependencies in stages for better error handling
# Stage 1: Core web framework
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    python-multipart==0.0.6

# Stage 2: PDF processing
RUN pip install --no-cache-dir \
    pdfplumber==0.10.3 \
    PyPDF2==3.0.1 \
    pdf2image==1.17.0 \
    Pillow==10.1.0

# Stage 3: PyTorch (CPU version for smaller size)
RUN pip install --no-cache-dir \
    torch==2.1.1+cpu \
    torchaudio==2.1.1+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Stage 4: ML/NLP dependencies
RUN pip install --no-cache-dir \
    transformers==4.35.2 \
    accelerate==0.24.1 \
    spacy==3.7.2 \
    scipy==1.11.4 \
    numpy==1.25.2

# Stage 5: Audio processing
RUN pip install --no-cache-dir \
    librosa==0.10.1 \
    soundfile==0.12.1

# Stage 6: Other utilities
RUN pip install --no-cache-dir \
    gender-guesser==0.4.0 \
    requests==2.31.0

# Install spaCy model with multiple fallback attempts
RUN python -m spacy download en_core_web_sm || \
    pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl || \
    echo "Warning: spaCy model installation failed"

# Install Bark TTS with fallback
RUN pip install --no-cache-dir git+https://github.com/suno-ai/bark.git || \
    echo "Warning: Bark TTS installation failed"

# Copy application files
COPY main.py app.py requirements.txt audiobooks.json ./
COPY . .

# Set proper permissions
RUN chmod 755 uploads audiobooks covers

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port for HF Spaces
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
