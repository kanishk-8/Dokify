import asyncio
import json
from gliner import GLiNER
from google import genai
import os
import time
from dotenv import load_dotenv

load_dotenv()


# List of available KittenTTS voices
KITTTENTTS_VOICES = [
    "expr-voice-2-m",
    "expr-voice-2-f",
    "expr-voice-3-m",
    "expr-voice-3-f",
    "expr-voice-4-m",
    "expr-voice-4-f",
    "expr-voice-5-m",
    "expr-voice-5-f",
]

# Set your Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)
# See: https://github.com/googleapis/python-genai/blob/main/docs/index.html#_snippet_0

# Simple rate limiter for Gemini calls:
# Minimum interval (seconds) between consecutive Gemini requests to reduce 429s.
_gemini_last_call = 0.0
_gemini_min_interval = float(os.getenv("GEMINI_MIN_INTERVAL", "1.0"))


def gemini_speaker_emotion(chunk, character_names):
    """
    Ask Gemini to attribute speaker & emotion for the chunk, with retries and backoff.
    If Gemini fails or returns nothing parseable after retries, fall back to heuristics.
    """
    prompt = (
        f"Given the following text from a novel:\n{chunk}\n"
        f"Possible speakers: {', '.join(character_names)}.\n"
        'Who is speaking? What is their emotion? Respond in JSON: {"speaker": "Name", "emotion": "emotion"}'
    )

    max_retries = 3
    base_backoff = 1.0

    for attempt in range(1, max_retries + 1):
        try:
            # Respect the simple in-process rate limiter to avoid hitting rapid quota limits.
            now = time.time()
            elapsed = now - _gemini_last_call
            if elapsed < _gemini_min_interval:
                to_wait = _gemini_min_interval - elapsed
                # sleep a small amount to space out requests
                time.sleep(to_wait)
            response = client.models.generate_content(
                model="gemini-2.0-flash-001",
                contents=prompt,
            )
            # record last call time only when a request was actually sent
            _gemini_last_call = time.time()

            # Parse JSON object from response text if present
            import re
            import json as pyjson

            text = response.text if response.text is not None else ""
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    result = pyjson.loads(match.group(0))
                    speaker = result.get(
                        "speaker", character_names[0] if character_names else "Unknown"
                    )
                    emotion = result.get("emotion", "neutral")
                    return speaker, emotion
                except Exception as parse_e:
                    print(
                        f"Gemini parse error (attempt {attempt}): {parse_e}; response snippet: {text[:200]}"
                    )
                    # Treat as non-fatal; fallthrough to either retry or fallback
            else:
                # No JSON found in response body — log and either retry or fallback
                print(
                    f"Gemini returned no JSON (attempt {attempt}). Response snippet: {text[:200]}"
                )

        except Exception as e:
            # Log error and examine message for retry hints
            err_str = str(e)
            print(f"Gemini API error (attempt {attempt}/{max_retries}): {err_str}")

            # Try to extract 'Please retry in Xs' from the error message if present
            retry_seconds = None
            try:
                import re as _re

                m = _re.search(r"Please retry in (\d+\.?\d*)s", err_str)
                if m:
                    retry_seconds = float(m.group(1))
            except Exception:
                retry_seconds = None

            # If this was the last attempt, break to fallback
            if attempt >= max_retries:
                print(
                    "Gemini API retries exhausted, falling back to heuristic attribution."
                )
                break

            # Decide how long to sleep before next attempt
            if retry_seconds:
                sleep_time = retry_seconds
            else:
                # exponential backoff with jitter
                sleep_time = base_backoff * (2 ** (attempt - 1))
            print(
                f"Retrying Gemini after {sleep_time:.1f}s (attempt {attempt + 1}/{max_retries})"
            )
            time.sleep(sleep_time)
            continue

    # Fallback heuristics if Gemini unavailable or unparseable
    # Count occurrences of each character name in the chunk
    if not character_names:
        # No known characters; pick a safe default
        return "Unknown", "neutral"

    name_counts = {name: chunk.count(name) for name in character_names}
    likely_names = [name for name, count in name_counts.items() if count > 0]

    if likely_names:
        # Pick the character with the highest count (most mentions)
        speaker = max(likely_names, key=lambda n: name_counts[n])
        return speaker, "neutral"
    else:
        # If no character name found, pick one at random for variety
        import random

        speaker = random.choice(character_names)
        return speaker, "neutral"


async def process_book_and_identify_characters(book_text_path: str):
    """
    Processes a text file, identifies characters, assigns KittenTTS voices, and yields progress asynchronously.
    Produces a JSONL file mapping text segments to characters and their emotions.
    Also creates a character-to-voice map and gender map.
    """
    with open(book_text_path, "r", encoding="utf-8") as f:
        full_text = f.read()

    # Sentence-based chunking for better multi-voice mapping
    import nltk

    nltk.download("punkt")
    nltk.download("punkt_tab")
    from nltk.tokenize import sent_tokenize

    text_chunks = [chunk.strip() for chunk in sent_tokenize(full_text) if chunk.strip()]

    # Step 1: Extract character names with Gliner
    model = GLiNER.from_pretrained("urchade/gliner_medium-v2.1")
    entities = model.predict_entities(full_text, labels=["PERSON"])
    print("DEBUG: GLiNER entities output:", entities)
    character_names = list(
        {e["text"] for e in entities if e["label"] == "PERSON" and "text" in e}
    )
    if not character_names:
        character_names = [
            f"Character_{i}"
            for i in range(min(len(KITTTENTTS_VOICES), len(text_chunks)))
        ]
    character_voice_map = {}
    character_gender_map = {}

    # Assign voices and genders to characters
    # Use Gemini to guess gender if possible, fallback to round-robin
    def guess_gender(character):
        # Simple heuristic: if name ends with 'a', 'i', 'e', 'y', assume female, else male
        if character.lower().endswith(("a", "i", "e", "y")):
            return "female"
        return "male"

    male_voices = [v for v in KITTTENTTS_VOICES if v.endswith("-m")]
    female_voices = [v for v in KITTTENTTS_VOICES if v.endswith("-f")]
    male_idx = 0
    female_idx = 0

    for idx, character in enumerate(character_names):
        gender = guess_gender(character)
        character_gender_map[character] = gender
        if gender == "female":
            voice = female_voices[female_idx % len(female_voices)]
            female_idx += 1
        else:
            voice = male_voices[male_idx % len(male_voices)]
            male_idx += 1
        character_voice_map[character] = voice

    # Save character-to-voice mapping after assignment
    with open("character_voice_map.json", "w", encoding="utf-8") as voice_file:
        json.dump(character_voice_map, voice_file)

    with open("speaker_attributed_book.jsonl", "w", encoding="utf-8") as jsonl_file:
        for i, chunk in enumerate(text_chunks):
            # Use Gemini for speaker attribution and emotion detection
            character, emotion = gemini_speaker_emotion(chunk, character_names)
            # Use pre-assigned voice for the character
            voice = character_voice_map.get(
                character, female_voices[0]
            )  # fallback to first female voice
            entry = {
                "chunk_index": i,
                "character": character,
                "emotion": emotion,
                "text": chunk,
                "voice": voice,
            }
            jsonl_file.write(json.dumps(entry) + "\n")
            await asyncio.sleep(0.05)
            yield entry

    # Write character voice and gender maps
    with open("character_voice_map.json", "w", encoding="utf-8") as voice_file:
        json.dump(character_voice_map, voice_file)
    with open("character_gender_map.json", "w", encoding="utf-8") as gender_file:
        json.dump(character_gender_map, gender_file)
