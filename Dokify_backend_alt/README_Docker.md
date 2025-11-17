# Docker Deployment Guide for Dokify AudioBook Generator

This guide explains how to build and deploy the Dokify AudioBook Generator using Docker, specifically optimized for Hugging Face Spaces.

## 🐳 Docker Setup

### Prerequisites
- Docker installed on your system
- At least 4GB of RAM available
- 8GB+ of disk space for models and dependencies

### Building the Docker Image

1. **Navigate to the project directory:**
```bash
cd Dokify_backend_alt
```

2. **Build the Docker image:**
```bash
docker build -t dokify-audiobook-generator .
```

3. **Run the container:**
```bash
docker run -p 7860:7860 dokify-audiobook-generator
```

The application will be available at `http://localhost:7860`

## 🚀 Hugging Face Spaces Deployment

### File Structure for HF Spaces
Your repository should have this structure:
```
Dokify_backend_alt/
├── Dockerfile
├── app.py                 # Entry point for HF Spaces
├── main.py               # FastAPI application
├── requirements.txt      # Dependencies
├── pyproject.toml       # Project configuration
├── audiobooks.json      # Metadata storage
└── README.md            # Project documentation
```

### Deployment Steps

1. **Create a new Space on Hugging Face:**
   - Go to https://huggingface.co/spaces
   - Click "Create new Space"
   - Choose "Docker" as the SDK
   - Set visibility (public/private)

2. **Upload your files:**
   - Either use git or the HF Spaces web interface
   - Ensure all files are in the root directory of your Space

3. **Environment Variables (Optional):**
   Add these to your Space settings if needed:
   ```
   SUNO_USE_SMALL_MODELS=True
   SUNO_OFFLOAD_CPU=True
   TRANSFORMERS_CACHE=/tmp/cache
   HF_HOME=/tmp/cache
   ```

4. **Hardware Requirements:**
   - **CPU Basic**: Sufficient for basic operation (slower TTS)
   - **CPU Upgrade**: Recommended for better performance
   - **GPU**: Best performance but may not be necessary

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUNO_USE_SMALL_MODELS` | `True` | Use smaller Bark models for faster loading |
| `SUNO_OFFLOAD_CPU` | `True` | Offload computation to CPU when needed |
| `TRANSFORMERS_CACHE` | `/app/cache` | Cache directory for Hugging Face models |
| `HF_HOME` | `/app/cache` | Hugging Face home directory |
| `PORT` | `7860` | Port number (HF Spaces uses 7860) |

### Memory Optimization
The Dockerfile is configured for memory efficiency:
- Uses Python 3.11 slim base image
- Enables CPU offloading for Bark TTS
- Uses smaller model variants when possible
- Implements proper caching strategies

## 📝 API Endpoints

Once deployed, your Space will expose these endpoints:

- `GET /` - Root endpoint with API information
- `POST /uploadfile/` - Upload PDF and generate audiobook
- `GET /audiobook/{user_id}/{filename}` - Download generated audio
- `GET /cover/{user_id}` - Get book cover image
- `GET /audiobooks/` - List all generated audiobooks
- `GET /health` - Health check endpoint

## 🛠 Troubleshooting

### Common Issues

1. **Out of Memory Errors:**
   - Ensure `SUNO_USE_SMALL_MODELS=True`
   - Enable `SUNO_OFFLOAD_CPU=True`
   - Consider upgrading to CPU Upgrade tier on HF Spaces

2. **Slow Model Loading:**
   - First run will be slow due to model downloads
   - Subsequent runs will use cached models

3. **PDF Processing Errors:**
   - Ensure PDFs are not password protected
   - Check PDF file size (recommend < 50MB)

4. **Audio Generation Failures:**
   - Check logs for specific Bark TTS errors
   - Verify spaCy models are properly installed

### Debugging

View logs in Hugging Face Spaces:
1. Go to your Space page
2. Click on "Logs" tab
3. Monitor real-time output

For local debugging:
```bash
docker run -it --entrypoint /bin/bash dokify-audiobook-generator
```

## 🔒 Security Notes

- The container runs as a non-root user for security
- File uploads are stored in isolated directories
- CORS is enabled for web client access
- No sensitive data is logged

## 📊 Performance Expectations

### Processing Times (approximate):
- **Small PDF (5-10 pages)**: 2-5 minutes
- **Medium PDF (20-50 pages)**: 10-30 minutes
- **Large PDF (100+ pages)**: 1+ hours

Times vary based on:
- Text complexity
- Number of characters detected
- Hardware tier
- Model loading (first run)

## 🆘 Support

If you encounter issues:
1. Check the logs in HF Spaces
2. Verify your PDF format and size
3. Try with a smaller test PDF first
4. Check the health endpoint: `/health`

For development issues, refer to the main README.md file.
