# Use Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies including build tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    poppler-utils \
    build-essential \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy uv configuration files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv and create virtual environment
RUN uv sync --frozen --no-cache

# Copy application code selectively (avoid overwriting .venv)
COPY *.py ./
COPY *.json ./
COPY *.jsonl ./
COPY *.txt ./
COPY README.md ./

# Copy generated_audiobooks directory for demo purposes
COPY generated_audiobooks/ ./generated_audiobooks/
COPY audiobooks ./audiobooks/

# Create necessary directories
RUN mkdir -p uploads audiobooks covers audio_segments

# Expose port 8000 to match original backend
EXPOSE 8000

# Set environment variables for production
ENV PYTHONPATH=/app
ENV PORT=8000
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Run the application using the virtual environment directly
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
