from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import asyncio

# PDF metadata and cover extraction
from PyPDF2 import PdfReader
from pdf2image import convert_from_path


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
    single_voice: bool = False,
    output_format: str = "m4a",
) -> str:
    # 0. Extract PDF metadata and cover image
    def extract_pdf_metadata(pdf_path):
        try:
            reader = PdfReader(pdf_path)
            info = reader.metadata or {}
            title = getattr(info, 'title', None) or os.path.splitext(os.path.basename(pdf_path))[0]
            author = getattr(info, 'author', None) or "Unknown Author"
            return title, author
        except Exception:
            return os.path.splitext(os.path.basename(pdf_path))[0], "Unknown Author"

    def extract_cover_image(pdf_path, output_dir="covers"):
        try:
            os.makedirs(output_dir, exist_ok=True)
            images = convert_from_path(pdf_path, first_page=1, last_page=1)
            if images:
                cover_path = os.path.join(output_dir, os.path.splitext(os.path.basename(pdf_path))[0] + "_cover.jpg")
                images[0].save(cover_path, "JPEG")
                return cover_path
        except Exception:
            pass
        # fallback placeholder
        return "https://covers.openlibrary.org/b/id/8231856-L.jpg"

    title, author = extract_pdf_metadata(file_path)
    cover_image_path = extract_cover_image(file_path)
    # If local cover, serve via static endpoint or use as is
    if cover_image_path.startswith("http"):
        cover_image_url = cover_image_path
    else:
        # You may want to serve this via FastAPI static files, for now just use the path
        cover_image_url = cover_image_path

    # 1. Extract text from book
    converted_text_path = await run_text_extraction(file_path)

    # 2. Identify characters (skip if single voice)
    if not single_voice:
        await run_character_identification(converted_text_path)
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

    # 4. Append to audiobooks.json
    def append_audiobook_entry(audio_file_path, title, author, cover_image_url, description=""):
        json_path = os.path.join(os.path.dirname(__file__), "audiobooks.json")
        # Load existing audiobooks
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                try:
                    audiobooks = json.load(f)
                except Exception:
                    audiobooks = []
        else:
            audiobooks = []

        # Generate a new ID
        new_id = str(len(audiobooks) + 1)
        # Use filename for chapter audio
        chapter = {
            "title": title,
            "audioUrl": os.path.basename(audio_file_path)
        }
        entry = {
            "id": new_id,
            "title": title,
            "author": author,
            "coverImage": cover_image_url,
            "description": description,
            "bookmarked": False,
            "chapters": [chapter]
        }
        audiobooks.append(entry)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(audiobooks, f, indent=2)

    append_audiobook_entry(audio_file_path, title, author, cover_image_url, description="")
    return audio_file_path

# API endpoints
@app.post("/uploadfile/")
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    protagonist: str = "John Doe",
    single_voice: bool = False,
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
        books_data = json.load(f)
    return {"books": books_data}
