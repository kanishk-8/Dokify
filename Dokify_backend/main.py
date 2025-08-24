from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Add CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...)):
    # Create uploads directory if it doesn't exist
    os.makedirs("uploads", exist_ok=True)

    # Save the file
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "file_size": len(content),
        "message": "File uploaded successfully"
    }




@app.post("/getAudioBooks/")
async def get_audio_books():
    import json
    # Get the directory of the current script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "audiobooks.json")
    with open(file_path, "r") as f:
        audiobooks = json.load(f)
    return {"audiobooks": audiobooks}

@app.get("/audiobook/{filename}")
async def get_audiobook_file(filename: str):
    file_path = os.path.join("audiobooks", filename)
    if not os.path.exists(file_path):
        return {"error": "File not found"}
    # Serve correct MIME type based on file extension
    if filename.endswith(".mp3"):
        media_type = "audio/mpeg"
    elif filename.endswith(".m4a"):
        media_type = "audio/mp4"
    else:
        media_type = "application/octet-stream"
    return FileResponse(file_path, media_type=media_type)
