# Dokify

Dokify is an end-to-end prototype for converting books (PDFs) into narrated audiobooks with multi-voice character attribution. It contains two main parts:

- `Dokify` — a React Native (Expo) mobile frontend with screens for browsing and generating audiobooks.
- `Dokify_backend` — a Python FastAPI backend that implements a multi-stage pipeline: PDF text extraction → character identification & voice assignment → speech synthesis → audio concatenation → catalog update.

This README documents the project architecture, backend pipeline, frontend structure, data artifacts, and API surface. It intentionally omits any instructions for starting or running the project.

---

## High-level architecture

- User uploads a book (PDF) using the frontend.
- Backend extracts text from the PDF and converts it to plain text.
- An NLP step identifies characters, attributes speakers and (optionally) emotions to text chunks, and assigns TTS voices.
- TTS synthesis generates short audio segments per chunk.
- FFmpeg concatenates segments into a single audiobook file.
- The newly created audiobook is added to a local catalog (`audiobooks.json`) and stored in the backend's audio directory.
- The frontend can list available audiobooks and play them via the shared audio player.

---

## Backend pipeline (conceptual)

The backend implements a multi-step, largely asynchronous pipeline. The pipeline is expressed in `Dokify_backend/main.py` and composed of smaller modules:

1. PDF metadata & cover extraction
   - Uses `PyPDF2` to read metadata.
   - Optionally extracts the first page as a cover image via `pdf2image` (requires poppler).
   - Falls back to a placeholder cover URL when extraction fails.

2. Text extraction
   - Implemented in `book_to_txt.py`.
   - Reads each page from the uploaded PDF and yields text chunks.
   - Saves combined text to `converted_book.txt`.

3. Character identification & voice assignment
   - Implemented in `identify_character.py`.
   - Uses GLiNER to detect PERSON entities from the full text.
   - Assigns voices from a predefined list of KittenTTS voices and heuristically assigns genders.
   - Uses Google Gemini (via the genai client) to attempt speaker and emotion attribution per chunk. Falls back to heuristics if API calls fail.
   - Produces:
     - `speaker_attributed_book.jsonl` — one JSON line per chunk with `text`, `character`, `emotion`, `voice`.
     - `character_voice_map.json` — mapping of character → voice id.
     - `character_gender_map.json` — mapping of character → gender.

4. TTS synthesis
   - Implemented in `generate_audiobook.py` (uses `kitten.synthesize_audio`).
   - Iterates the JSONL chunks, synthesizes a small WAV segment for each chunk (stored under `audio_segments/segment_{i}.wav`).
   - Writes a `concat_list.txt` used by ffmpeg for safe concatenation.

5. Audio concatenation & finalization
   - Concatenates per-chunk WAVs into a single audio file using `ffmpeg-python` and writes the file to `generated_audiobooks/audiobook.<ext>`.
   - The pipeline moves the final audiobook into the persistent `audiobooks/` directory and appends an entry to `audiobooks.json`.

6. Catalog update
   - `audiobooks.json` (root of backend) stores the list of available audiobooks with metadata:
     - `id`, `title`, `author`, `coverImage`, `description`, `bookmarked`, `chapters` (each with `title` and `audioUrl`).

---

## Backend files overview

- `Dokify_backend/main.py`
  - FastAPI app and top-level pipeline orchestration.
  - Endpoints for upload and listing/serving audiobooks.
  - Coordinates the three main pipeline phases using helper functions.

- `Dokify_backend/book_to_txt.py`
  - Text extraction utilities using PyPDF2.
  - `process_book_and_extract_text(pdf_file_path)` yields page text.
  - `save_book(full_text, output_path="converted_book.txt")`

- `Dokify_backend/identify_character.py`
  - Character extraction (GLiNER), speaker/emotion attribution (Gemini), and voice assignment.
  - Writes `speaker_attributed_book.jsonl`, `character_voice_map.json`, and `character_gender_map.json`.
  - Depends on `nltk` sentence tokenization and external LLM API credentials.

- `Dokify_backend/generate_audiobook.py`
  - Reads JSONL input (speaker-attributed or single-voice JSONL) and synthesizes audio segments.
  - Uses `kitten.synthesize_audio(...)` to produce WAVs and `ffmpeg` to concatenate.
  - Yields progress and returns path to final audio file.

- Other backend artifacts and helper scripts:
  - `book_to_txt.py`, `identify_character.py`, `generate_audiobook.py`, `main.py`
  - `audiobooks.json` — local catalog of available audiobooks
  - `single_voice_book.jsonl` — prepared JSONL when single-voice conversion is requested
  - `speaker_attributed_book.jsonl` — output of the character identification step

---

## Persistent data artifacts (directories & key files)

- `uploads/` — incoming uploaded PDFs (temporary storage).
- `audio_segments/` — per-chunk synthesized WAV files (intermediate).
- `generated_audiobooks/` — temporary final audio output before being moved to `audiobooks/`.
- `audiobooks/` — persistent audio storage (final MP3/M4A files).
- `covers/` — extracted cover images if available.
- Root JSON / JSONL artifacts:
  - `audiobooks.json` — catalog that the frontend reads.
  - `speaker_attributed_book.jsonl` — per-chunk attribution used by TTS.
  - `single_voice_book.jsonl` — JSONL used when `single_voice` mode is requested.
  - `character_voice_map.json`, `character_gender_map.json` — character metadata for diagnostics.

---

## API surface (what the frontend calls)

The backend exposes a small set of endpoints (implemented in `main.py`):

- POST `/uploadfile/`
  - Accepts multipart/form-data with keys:
    - `file` (file) — the uploaded PDF
    - `protagonist` (string) — name hint (optional)
    - `single_voice` (bool / string) — "true"/"false" or boolean indicating single-voice synthesis
    - `output_format` (string) — audio format, e.g., `m4a`, `mp3`, `m4b`
  - Behavior: stores uploaded file under `uploads/` and schedules background processing for the pipeline. Returns an acknowledgement message.
  - Notes: The pipeline runs asynchronously and will append the result to `audiobooks.json` when complete.

- GET `/audiobook/{filename}`
  - Serves the audio file from the backend `audiobooks/` directory.
  - Returns audio file with appropriate media type (`audio/mpeg` or `audio/mp4`).

- GET `/audiobooks/`
  - Returns the contents of `audiobooks.json` (catalog of audiobooks).
  - Response shape:
    - `{ "books": [ { id, title, author, coverImage, description, bookmarked, chapters: [{title, audioUrl}] }, ... ] }`

Note: Some commented-out endpoints exist in the code (variants of listing/downsloading), but the three endpoints above are the ones implemented/active.

---

## Frontend structure (React Native / Expo)

Top-level: `Dokify` app directory.

Key directories:

- `app/` — file-based routing and screens
  - `app/(authenticated)/(tabs)/` — main tab layout and screens:
    - `home/` — book list and book details screens (e.g., `bookdetails.tsx`)
    - `generate.tsx` — screen that allows you to upload a PDF and kick off audiobook generation
  - `app/...` — other routing files for onboarding/auth flows (if present)
- `components/` — reusable UI primitives and player components
  - `miniplayer` — compact audio player shown in tab layout
- `context/` — React context hooks (e.g., `audioprovider`) for shared audio state and playback
- `hooks/` — custom hooks (e.g., `useThemeColor`)
- `constants/` — design tokens and constants used across the app
- `assets/` — images, icons, and static assets
- `package.json`, `app.json`, `tsconfig.json`, and ESlint config file for project metadata and type tooling

Frontend integration notes:

- The `GenerateAudioBook` screen builds a `FormData` payload and posts to the backend upload endpoint, attaching fields such as `protagonist`, `single_voice`, and `output_format`.
- The frontend reads the backend base URL from environment variables (`EXPO_PUBLIC_BACKENDURL`).
- The app uses a shared audio player context to manage playback; when an audiobook is selected, its audio URL is set in the audio context so the same player UI can control playback.

---

## Important environment & runtime considerations

- External services:
  - Google Gemini (via `genai` client) is used for speaker/emotion attribution. The pipeline expects `GEMINI_API_KEY` set in environment (the code uses `python-dotenv` to load environment variables).
  - TTS: code references `kitten.synthesize_audio(...)` which requires the KittenTTS library or compatible voice synthesis provider. Behavior will depend on that library’s API and credentials (not embedded in this repository).
- Native/system dependencies:
  - `ffmpeg` binary is required for audio concatenation (the Python code uses `ffmpeg-python` as a wrapper).
  - `pdf2image` requires `poppler`/`pdftoppm` binaries to extract page images.
- NLP tooling:
  - `nltk` is used for sentence tokenization and may require downloading `punkt` data at runtime.
  - GLiNER model weights are loaded via `GLiNER.from_pretrained(...)` in `identify_character.py`.
- File sizes & resource usage:
  - Synthesizing long books will produce many audio segments and can consume significant disk space, memory, and CPU. Expect long-running background tasks for full-book synthesis.

---

## Key environment variables (used by backend / some modules)

- `GEMINI_API_KEY` — API key for Google Gemini / genai client (used in `identify_character.py`).
- (Frontend) `EXPO_PUBLIC_BACKENDURL` — backend base URL used by the mobile app to call API endpoints.

---

## Security & privacy notes

- Uploaded books are written to disk in `uploads/` and are processed locally; the current implementation stores intermediate and final artifacts locally under the backend root. If you intend to process sensitive content, review storage, retention, and deletion policies.
- The project may call 3rd-party APIs (e.g., language models, TTS providers). Ensure API keys are stored securely and that data sent to external services complies with privacy requirements.

---

## Diagnostics & debug artifacts

- If something fails during synthesis, useful artifacts are present for debugging:
  - `audio_segments/` — inspect WAV files for per-chunk synthesis correctness.
  - `audio_segments/concat_list.txt` — list used by ffmpeg for concatenation.
  - `character_voice_map.json` and `character_gender_map.json` — confirm voice assignments.
  - `speaker_attributed_book.jsonl` — the main per-chunk attribution used to synthesize audio.

Logging and `print` debug output appear in the backend module call sites (see `generate_audiobook.py` and `book_to_txt.py`) to help trace progress and errors.

---

## Where to look in the codebase

- Backend orchestration and API:
  - `Dokify_backend/main.py`

- Text extraction:
  - `Dokify_backend/book_to_txt.py`

- Character identification and voice mapping:
  - `Dokify_backend/identify_character.py`

- TTS and audio composition:
  - `Dokify_backend/generate_audiobook.py`

- Frontend:
  - `Dokify/app/` — primary app source (file-based routing)
  - `Dokify/app/(authenticated)/(tabs)/generate.tsx` — UI for uploading and generating audiobooks
  - `Dokify/components/`, `Dokify/context/`, `Dokify/hooks/` — reusable components and state

---

If you want, I can:

- Produce a concise diagram or flowchart of the backend pipeline.
- Extract a minimal contract for the `/uploadfile/` request and give example JSON shapes (without runtime instructions).
- Summarize the backend dependencies with likely pip package names.

Tell me which of the above you’d like next.
