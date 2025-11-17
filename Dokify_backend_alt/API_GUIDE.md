# Dokify AudioBook Generator API Guide

## Overview

The Dokify AudioBook Generator API uses **background processing** to handle long-running audiobook generation tasks without blocking other server operations. This ensures the server remains responsive while processing can take minutes to hours.

## Workflow

### 1. Upload PDF and Start Generation

**Endpoint:** `POST /uploadfile/`

**Request:**
```bash
curl -X POST "http://localhost:7860/uploadfile/" \
  -F "file=@your-book.pdf" \
  -F "user_id=user123" \
  -F "single_voice=false"
```

**Response:**
```json
{
  "message": "Audiobook generation started",
  "filename": "your-book.pdf",
  "job_id": "job_a1b2c3d4e5f6",
  "status_url": "/job/job_a1b2c3d4e5f6/status",
  "user_id": "user123"
}
```

### 2. Check Job Status

**Endpoint:** `GET /job/{job_id}/status`

```bash
curl "http://localhost:7860/job/job_a1b2c3d4e5f6/status"
```

**Response (Processing):**
```json
{
  "status": "processing",
  "progress": "Generating audiobook (this may take several minutes)...",
  "created_at": "2025-11-17T16:45:00.123456",
  "user_id": "user123"
}
```

**Response (Completed):**
```json
{
  "status": "completed",
  "progress": "Audiobook generation completed!",
  "created_at": "2025-11-17T16:45:00.123456",
  "user_id": "user123",
  "result": {
    "audio_file": "audiobooks/user123/audiobook_a1b2c3d4.wav",
    "title": "The Great Adventure",
    "author": "John Author",
    "cover_image": "covers/user123/cover_a1b2c3d4.jpg"
  }
}
```

## Job Status Values

| Status | Description |
|--------|-------------|
| `pending` | Job is queued but not started |
| `processing` | Job is actively running |
| `completed` | Job finished successfully |
| `failed` | Job encountered an error |

## API Endpoints

### Core Endpoints

#### Upload PDF
- **POST** `/uploadfile/`
- **Form Data:**
  - `file`: PDF file
  - `user_id`: User identifier
  - `single_voice` (optional): Use single narrator voice
  - `output_format` (optional): "wav" or "mp3"
- **Returns:** Job ID and status URL

#### Check Job Status
- **GET** `/job/{job_id}/status`
- **Returns:** Current job status and progress

#### Get Job Result
- **GET** `/job/{job_id}/result`
- **Returns:** Final result data (only for completed jobs)

#### Download Audiobook
- **GET** `/audiobook/{user_id}/{filename}`
- **Returns:** Audio file download

### Management Endpoints

#### List All Jobs
- **GET** `/jobs/`
- **Query Params:**
  - `user_id` (optional): Filter by user
- **Returns:** List of all jobs

#### Cancel Job
- **DELETE** `/job/{job_id}`
- **Returns:** Cancellation confirmation (only works for pending jobs)

#### List Generated Audiobooks
- **GET** `/audiobooks/`
- **Returns:** Metadata of all completed audiobooks

#### Health Check
- **GET** `/health`
- **Returns:** Server status and active job count

## Usage Examples

### JavaScript/Web Client

```javascript
// 1. Upload file and start generation
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('user_id', 'user123');

const uploadResponse = await fetch('/uploadfile/', {
  method: 'POST',
  body: formData
});

const { job_id } = await uploadResponse.json();

// 2. Poll for status
async function checkStatus() {
  const response = await fetch(`/job/${job_id}/status`);
  const status = await response.json();
  
  if (status.status === 'completed') {
    // Download the audiobook
    const audioUrl = `/audiobook/${status.result.audio_file}`;
    window.open(audioUrl);
    return;
  }
  
  if (status.status === 'failed') {
    console.error('Generation failed:', status.error);
    return;
  }
  
  // Still processing, check again in 10 seconds
  setTimeout(checkStatus, 10000);
}

checkStatus();
```

### Python Client

```python
import requests
import time

# Upload file
with open('book.pdf', 'rb') as f:
    response = requests.post('http://localhost:7860/uploadfile/', 
                           files={'file': f},
                           data={'user_id': 'user123'})

job_id = response.json()['job_id']

# Poll for completion
while True:
    status_response = requests.get(f'http://localhost:7860/job/{job_id}/status')
    status = status_response.json()
    
    print(f"Status: {status['status']} - {status['progress']}")
    
    if status['status'] == 'completed':
        result = status['result']
        audio_url = f"http://localhost:7860/{result['audio_file']}"
        print(f"Audiobook ready: {audio_url}")
        break
    elif status['status'] == 'failed':
        print(f"Generation failed: {status.get('error', 'Unknown error')}")
        break
    
    time.sleep(10)  # Check every 10 seconds
```

## Expected Processing Times

- **Small PDF (5-10 pages)**: 2-5 minutes
- **Medium PDF (20-50 pages)**: 10-30 minutes  
- **Large PDF (100+ pages)**: 1+ hours

Processing time depends on:
- Text complexity and length
- Number of characters detected
- Hardware (CPU vs GPU)
- First-time model loading

## Error Handling

### Common Error Responses

**Job Not Found (404):**
```json
{
  "detail": "Job not found"
}
```

**Job Still Processing (400):**
```json
{
  "detail": "Job not completed yet. Current status: processing"
}
```

**Authentication Required (401):**
```json
{
  "detail": "Authentication required: user id missing"
}
```

### Best Practices

1. **Always check job status** before attempting to access results
2. **Implement exponential backoff** for status polling to avoid overwhelming the server
3. **Handle network errors** gracefully in your client code
4. **Store job IDs** to allow users to check on progress later
5. **Set reasonable timeouts** for long-running operations

## Background Processing Benefits

✅ **Non-blocking**: Other API calls work normally during generation
✅ **Scalable**: Multiple audiobooks can be generated simultaneously  
✅ **Resilient**: Jobs continue even if client disconnects
✅ **Trackable**: Full progress visibility and job management
✅ **User-friendly**: Immediate response with progress tracking

This design ensures your Dokify server remains responsive and can handle multiple users generating audiobooks concurrently.
