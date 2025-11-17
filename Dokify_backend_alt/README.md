# Dokify AudioBook Generator 🎧📚

A FastAPI server that converts PDF books into audiobooks using Bark TTS with multi-character voice support.

**🚀 [Try it on Hugging Face Spaces](https://huggingface.co/spaces/your-username/dokify-audiobook-generator)**

## Features

- 📖 PDF text extraction and processing
- 🎭 Multi-character voice mapping with gender detection
- 🎵 High-quality text-to-speech using Bark TTS
- 🎨 Automatic cover image extraction
- 🔄 RESTful API for easy integration
- 🐳 Docker support for easy deployment

## Quick Setup

### 1. Install Dependencies

**Option A: Using uv (recommended)**

```bash
# Install uv if needed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Install spaCy model
uv run python -m spacy download en_core_web_sm
```

**Option B: Using pip**

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install git+https://github.com/suno-ai/bark.git

# Install spaCy model
python -m spacy download en_core_web_sm
```

### 2. Start Server

```bash
# Simple start
python main.py

# Or with uv
uv run python main.py

# Or with uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Test Installation

Visit `http://localhost:8000` - you should see:

```json
{ "message": "Dokify AudioBook Generator API", "version": "1.0.0" }
```

API docs: `http://localhost:8000/docs`

## Usage

### Upload a Book

```bash
curl -X POST "http://localhost:8000/uploadfile/" \
  -H "x-user-id: test-user" \
  -F "file=@book.pdf" \
  -F "single_voice=false"
```

### List Audiobooks

```bash
curl "http://localhost:8000/audiobooks/"
```

## Features

- **Multi-Voice**: Automatic character detection and voice assignment
- **Single Voice**: Option for one narrator throughout
- **Format Support**: PDF input, WAV/MP3 output
- **User Management**: Per-user audiobook storage
- **GPU Acceleration**: CUDA support for faster generation

## How It Works

1. Upload PDF → Extract text
2. Identify characters using spaCy NLP
3. Assign voices based on gender detection
4. Split text into dialogue/narrative segments
5. Generate audio using Bark TTS
6. Combine segments into final audiobook

## Performance

- **GPU Mode**: ~15-30 seconds per segment
- **CPU Mode**: ~2-5 minutes per segment
- **First Run**: Downloads ~10GB of models (5-15 min)

## Requirements

- Python 3.10+
- 8GB+ RAM (16GB recommended)
- Optional: CUDA GPU for speed
- ~15GB disk space (models + generated audio)

## Troubleshooting

### CUDA Out of Memory

```bash
export SUNO_USE_SMALL_MODELS=True
python main.py
```

### spaCy Model Missing

```bash
python -m spacy download en_core_web_sm
```

### Port In Use

```bash
# Kill existing process
lsof -ti:8000 | xargs kill -9

# Or use different port
uvicorn main:app --port 8001
```

### Import Errors

Make sure you're in the virtual environment:

```bash
which python
pip list | grep fastapi
```

## API Endpoints

- `POST /uploadfile/` - Upload PDF for conversion
- `GET /audiobooks/` - List all audiobooks
- `GET /audiobook/{user_id}/{filename}` - Download audiobook
- `GET /health` - Server status and model availability

## Client Integration

The server works with your React Native app. Key points:

1. Send `x-user-id` header for user identification
2. Upload progress tracked via background tasks
3. Files organized per user in `audiobooks/{user_id}/`
4. Metadata stored in `audiobooks.json`

## File Structure

```
Dokify_backend_alt/
├── main.py              # FastAPI application
├── requirements.txt     # Dependencies
├── pyproject.toml      # uv configuration
├── uploads/            # User uploads (auto-created)
├── audiobooks/         # Generated files (auto-created)
├── covers/             # Book covers (auto-created)
└── audiobooks.json     # Metadata (auto-created)
```

## Environment Variables

```bash
# Use smaller models (less VRAM)
export SUNO_USE_SMALL_MODELS=True

# CPU offloading
export SUNO_OFFLOAD_CPU=True

# GPU selection
export CUDA_VISIBLE_DEVICES=0
```

## Development

For development with auto-reload:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## License

Part of the Dokify application suite.
