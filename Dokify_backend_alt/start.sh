#!/bin/bash

# Startup script for Dokify AudioBook Generator on Hugging Face Spaces
# This script handles initialization and starts the FastAPI server

set -e  # Exit on any error

echo "🚀 Starting Dokify AudioBook Generator..."

# Set environment variables for optimal performance
export PYTHONUNBUFFERED=1
export TRANSFORMERS_CACHE=${TRANSFORMERS_CACHE:-/tmp/cache}
export HF_HOME=${HF_HOME:-/tmp/cache}
export TORCH_HOME=${TORCH_HOME:-/tmp/cache}
export SUNO_USE_SMALL_MODELS=${SUNO_USE_SMALL_MODELS:-True}
export SUNO_OFFLOAD_CPU=${SUNO_OFFLOAD_CPU:-True}

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads audiobooks covers /tmp/cache

# Set permissions
chmod 755 uploads audiobooks covers

# Check Python version
echo "🐍 Python version:"
python --version

# Check if required packages are installed
echo "📦 Checking core dependencies..."
python -c "import fastapi; print(f'FastAPI: {fastapi.__version__}')" || exit 1
python -c "import uvicorn; print(f'Uvicorn: {uvicorn.__version__}')" || exit 1
python -c "import torch; print(f'PyTorch: {torch.__version__}')" || exit 1

# Check spaCy model
echo "🔤 Checking spaCy model..."
python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('spaCy model loaded successfully')" || {
    echo "⚠️ spaCy model not found, downloading..."
    python -m spacy download en_core_web_sm
}

# Check Bark TTS (optional, don't fail if not available)
echo "🎵 Checking Bark TTS..."
python -c "import bark; print('Bark TTS available')" || {
    echo "⚠️ Bark TTS not available, TTS features may be limited"
}

# Verify transformers cache
echo "🤖 Setting up model cache..."
python -c "
import os
from transformers import pipeline
print(f'Cache directory: {os.environ.get(\"TRANSFORMERS_CACHE\", \"default\")}')
print('Transformers pipeline test successful')
"

# Start the server
echo "🌐 Starting FastAPI server on port ${PORT:-7860}..."
exec uvicorn main:app \
    --host 0.0.0.0 \
    --port ${PORT:-7860} \
    --workers 1 \
    --timeout-keep-alive 30 \
    --access-log \
    --log-level info
