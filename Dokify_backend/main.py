from fastapi import FastAPI, UploadFile, File
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
    return {"message": "This endpoint will return audio books."}
