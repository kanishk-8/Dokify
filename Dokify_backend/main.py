
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import asyncio

# Import functions from audiobook-creator repo (adjust import paths as needed)
# from book_to_txt import process_book_and_extract_text, save_book
# from identify_characters_and_output_book_to_jsonl import process_book_and_identify_characters
# from generate_audiobook import process_audiobook_generation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
PROCESSED_DIR = "processed"
AUDIO_DIR = "audiobooks"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)


# async def run_text_extraction(book_filepath: str):
#     print("[pipeline] Starting text extraction...")
#     text_chunks = []
#     for txt_chunk in process_book_and_extract_text(book_filepath):
#         text_chunks.append(txt_chunk)
#         # Optionally you can do partial saving or streaming here
#         await asyncio.sleep(0)  # Yield control in async context
#     full_text = text_chunks[-1] if text_chunks else ""
#     save_book(full_text)
#     print("[pipeline] Text extraction completed.")
#     return os.path.join(os.getcwd(), "converted_book.txt")


# async def run_character_identification(book_title: str):
#     print("[pipeline] Starting character identification...")
#     async for progress in process_book_and_identify_characters(book_title):
#         # You can stream progress updates or log them here
#         await asyncio.sleep(0)
#     print("[pipeline] Character identification completed.")
#     return os.path.join(os.getcwd(), "speaker_attributed_book.jsonl"), os.path.join(os.getcwd(), "character_gender_map.json")


# async def run_audio_generation(voice_type: str, narrator_gender: str, output_format: str, book_file_path: str, use_emotion_tags: bool = False):
#     print("[pipeline] Starting audiobook generation...")
#     async for progress in process_audiobook_generation(voice_type, narrator_gender, output_format, book_file_path, use_emotion_tags):
#         await asyncio.sleep(0)
#     ext = "m4b" if output_format.lower() == "m4b (chapters & cover)" else output_format.lower()
#     audio_file = os.path.join("generated_audiobooks", f"audiobook.{ext}")

#     # Optionally move the output audio file to AUDIO_DIR if needed
#     if os.path.exists(audio_file):
#         dest_path = os.path.join(AUDIO_DIR, f"audiobook.{ext}")
#         shutil.move(audio_file, dest_path)
#         print(f"[pipeline] Audiobook moved to {dest_path}")
#         return dest_path
#     raise Exception("Audiobook generation failed: output file not found")


# async def generate_audiobook_pipeline(file_path: str, protagonist_name: str = "John Doe", single_voice: bool = True, output_format: str = "m4a"):
#     # 1. Text extraction
#     converted_text_path = await run_text_extraction(file_path)

#     # 2. Character identification (only if multi-voice to get character info)
#     if not single_voice:
#         await run_character_identification(protagonist_name)
#         book_file_path_for_audio = os.path.join(os.getcwd(), "speaker_attributed_book.jsonl")
#     else:
#         book_file_path_for_audio = converted_text_path

#     # 3. Audiobook generation
#     audio_file_path = await run_audio_generation(
#         voice_type="Multi-Voice" if not single_voice else "Single Voice",
#         narrator_gender="female",  # You can parametrize as needed
#         output_format=output_format,
#         book_file_path=book_file_path_for_audio,
#         use_emotion_tags=False  # Adjust as needed
#     )
#     print("[pipeline] Audiobook pipeline completed.")
#     return audio_file_path


# @app.post("/uploadfile/")
# async def upload_file(file: UploadFile = File(...), background_tasks: BackgroundTasks = None, protagonist: str = "John Doe", single_voice: bool = True, output_format: str = "m4a"):
#     file_path = os.path.join(UPLOAD_DIR, file.filename)
#     print(f"[upload_file] Received upload for {file.filename}")

#     with open(file_path, "wb") as buffer:
#         content = await file.read()
#         buffer.write(content)
#     print(f"[upload_file] Saved to {file_path}, size: {len(content)} bytes")

#     if background_tasks:
#         background_tasks.add_task(generate_audiobook_pipeline, file_path, protagonist, single_voice, output_format)
#         print("[upload_file] Audiobook generation scheduled in background.")
#         return {"message": "File uploaded. Audiobook generation started."}
#     else:
#         audio_path = await generate_audiobook_pipeline(file_path, protagonist, single_voice, output_format)
#         return {"message": "Audiobook generated successfully.", "audio_path": audio_path}


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
