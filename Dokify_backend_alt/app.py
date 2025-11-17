"""
Entry point for Hugging Face Spaces deployment.
This file imports and runs the FastAPI application.
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Import the FastAPI app from main.py
from main import app

# Set up environment variables for Hugging Face Spaces
os.environ.setdefault("TRANSFORMERS_CACHE", "/tmp/cache")
os.environ.setdefault("HF_HOME", "/tmp/cache")
os.environ.setdefault("TORCH_HOME", "/tmp/cache")
os.environ.setdefault("SUNO_USE_SMALL_MODELS", "True")
os.environ.setdefault("SUNO_OFFLOAD_CPU", "True")

# Export the app for uvicorn
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
