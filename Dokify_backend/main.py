from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import asyncio

# Import your own processing functions - adjust imports as needed
from book_to_txt import process_book_and_extract_text, save_book
from identify_character import process_book_and_identify_characters
from generate_audiobook import process_audiobook_generation

app = FastAPI()

# Enable CORS for all origins (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories for file storage
UPLOAD_DIR = "uploads"
AUDIO_DIR = "audiobooks"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

# Async pipeline steps
async def run_text_extraction(book_filepath: str) -> str:
    text_chunks = []
    for chunk in process_book_and_extract_text(book_filepath):
        text_chunks.append(chunk)
        await asyncio.sleep(0)  # release control
    full_text = "\n".join(text_chunks) if text_chunks else ""
    save_book(full_text)
    return os.path.join(os.getcwd(), "converted_book.txt")

async def run_character_identification(book_title: str):
    async for _ in process_book_and_identify_characters(book_title):
        await asyncio.sleep(0)
    return (
        os.path.join(os.getcwd(), "speaker_attributed_book.jsonl"),
        os.path.join(os.getcwd(), "character_gender_map.json"),
    )

async def run_audio_generation(
    voice_type: str,
    narrator_gender: str,
    output_format: str,
    book_file_path: str,
    use_emotion_tags: bool = False,
) -> str:
    async for _ in process_audiobook_generation(
        voice_type, narrator_gender, output_format, book_file_path, use_emotion_tags
    ):
        await asyncio.sleep(0)
    ext = output_format.lower().replace(" ", "_")
    generated_audio = os.path.join("generated_audiobooks", f"audiobook.{ext}")
    if os.path.exists(generated_audio):
        dest = os.path.join(AUDIO_DIR, f"audiobook.{ext}")
        shutil.move(generated_audio, dest)
        return dest
    raise RuntimeError("Audiobook generation failed: output file missing")

# Full pipeline combining all steps
async def generate_audiobook_pipeline(
    file_path: str,
    protagonist_name: str = "John Doe",
    single_voice: bool = True,
    output_format: str = "m4a",
) -> str:
    # 1. Extract text from book
    converted_text_path = await run_text_extraction(file_path)

    # 2. Identify characters (skip if single voice)
    if not single_voice:
        await run_character_identification(protagonist_name)
        book_file_for_audio = os.path.join(os.getcwd(), "speaker_attributed_book.jsonl")
    else:
        # Convert plain text to JSONL for single voice, splitting into smaller chunks
        import textwrap
        jsonl_path = os.path.join(os.getcwd(), "single_voice_book.jsonl")
        with open(converted_text_path, "r", encoding="utf-8") as f_in, open(jsonl_path, "w", encoding="utf-8") as f_out:
            for chunk in f_in.read().split("\n\n"):
                chunk = chunk.strip()
                if chunk:
                    # Split into smaller pieces (e.g., 300 chars)
                    for subchunk in textwrap.wrap(chunk, 300):
                        import json
                        f_out.write(json.dumps({"text": subchunk}) + "\n")
        book_file_for_audio = jsonl_path

    # 3. Generate audiobook
    audio_file_path = await run_audio_generation(
        voice_type="Multi-Voice" if not single_voice else "Single Voice",
        narrator_gender="female",
        output_format=output_format,
        book_file_path=book_file_for_audio,
        use_emotion_tags=False,
    )
    return audio_file_path

# API endpoints
@app.post("/uploadfile/")
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    protagonist: str = "John Doe",
    single_voice: bool = True,
    output_format: str = "m4a",
):
    filename = file.filename or "uploaded_book"
    file_path = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Schedule background audiobook generation
    background_tasks.add_task(
        generate_audiobook_pipeline, file_path, protagonist, single_voice, output_format
    )
    return {"message": "Upload successful. Audiobook generation started."}

# @app.get("/audiobooks")
# async def list_audiobooks():
#     files = os.listdir(AUDIO_DIR)
#     audiobooks = [f for f in files if f.endswith((".mp3", ".m4a", ".m4b"))]
#     return {"audiobooks": audiobooks}

# @app.get("/audiobooks/{filename}")
# async def download_audiobook(filename: str):
#     file_path = os.path.join(AUDIO_DIR, filename)
#     if not os.path.exists(file_path):
#         raise HTTPException(status_code=404, detail="Audiobook not found")
#     media_type = "audio/mpeg" if filename.endswith(".mp3") else "audio/mp4"
#     return FileResponse(file_path, media_type=media_type, filename=filename)



# @app.get("/audiobooks/")
# async def list_audiobooks():
#     files = os.listdir(AUDIO_DIR)
#     audio_files = [f for f in files if f.endswith((".mp3", ".m4a", ".m4b"))]
#     return {"audiobooks": audio_files}
@app.get("/audiobook/{filename}")
async def get_audiobook_file(filename: str):
    file_path = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audiobook file not found")
    media_type = "audio/mpeg" if filename.endswith(".mp3") else "audio/mp4"
    return FileResponse(file_path, media_type=media_type, filename=filename)
import json
@app.get("/audiobooks/")
async def get_books():
    json_path = os.path.join(os.path.dirname(__file__), "audiobooks.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Book data not found")
    with open(json_path, "r", encoding="utf-8") as f:
        books = json.load(f)
    return {"books": books}
