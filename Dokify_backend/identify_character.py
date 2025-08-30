import asyncio
import json
from gliner import GLiNER
from google import genai
import os


# List of available KittenTTS voices
KITTTENTTS_VOICES = [
    'expr-voice-2-m', 'expr-voice-2-f',
    'expr-voice-3-m', 'expr-voice-3-f',
    'expr-voice-4-m', 'expr-voice-4-f',
    'expr-voice-5-m', 'expr-voice-5-f'
]

# Set your Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "YOUR_GEMINI_API_KEY"
client = genai.Client(api_key=GEMINI_API_KEY)
# See: https://github.com/googleapis/python-genai/blob/main/docs/index.html#_snippet_0

def gemini_speaker_emotion(chunk, character_names):
    prompt = (
        f"Given the following text from a novel:\n{chunk}\n"
        f"Possible speakers: {', '.join(character_names)}.\n"
        "Who is speaking? What is their emotion? Respond in JSON: {\"speaker\": \"Name\", \"emotion\": \"emotion\"}"
    )
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash-001',
            contents=prompt
        )
        # Gemini returns a text response, parse JSON from it
        import re
        import json as pyjson
        text = response.text if response.text is not None else ""
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            result = pyjson.loads(match.group(0))
            speaker = result.get("speaker", character_names[0])
            emotion = result.get("emotion", "neutral")
            return speaker, emotion
    except Exception as e:
        print(f"Gemini API error: {e}")
    # Fallback: simple heuristic
    for name in character_names:
        if name in chunk:
            return name, "neutral"
    return character_names[0], "neutral"

async def process_book_and_identify_characters(book_text_path: str):
    """
    Processes a text file, identifies characters, assigns KittenTTS voices, and yields progress asynchronously.
    Produces a JSONL file mapping text segments to characters and their emotions.
    Also creates a character-to-voice map and gender map.
    """
    with open(book_text_path, "r", encoding="utf-8") as f:
        full_text = f.read()

    text_chunks = full_text.split("\n\n")

    # Step 1: Extract character names with Gliner
    model = GLiNER.from_pretrained("urchade/gliner-english-base")
    entities = model.predict_entities(full_text, labels=["PERSON"])
    character_names = list({e['entity'] for e in entities if e['label'] == "PERSON"})
    if not character_names:
        character_names = [f"Character_{i}" for i in range(min(len(KITTTENTTS_VOICES), len(text_chunks)))]
    character_voice_map = {}
    character_gender_map = {}

    # Assign voices and genders to characters
    # Use Gemini to guess gender if possible, fallback to round-robin
    def guess_gender(character):
        # Simple heuristic: if name ends with 'a', 'i', 'e', 'y', assume female, else male
        if character.lower().endswith(('a', 'i', 'e', 'y')):
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

    with open("speaker_attributed_book.jsonl", "w", encoding="utf-8") as jsonl_file:
        for i, chunk in enumerate(text_chunks):
            # Use Gemini for speaker attribution and emotion detection
            character, emotion = gemini_speaker_emotion(chunk, character_names)
            # Assign voice based on detected character gender
            gender = character_gender_map.get(character, "male")
            if gender == "female":
                voice = female_voices[female_idx % len(female_voices)]
                female_idx += 1
            else:
                voice = male_voices[male_idx % len(male_voices)]
                male_idx += 1
            character_voice_map[character] = voice
            entry = {
                "chunk_index": i,
                "character": character,
                "emotion": emotion,
                "text": chunk,
                "voice": voice
            }
            jsonl_file.write(json.dumps(entry) + "\n")
            await asyncio.sleep(0.05)
            yield entry

    # Write character voice and gender maps
    with open("character_voice_map.json", "w", encoding="utf-8") as voice_file:
        json.dump(character_voice_map, voice_file)
    with open("character_gender_map.json", "w", encoding="utf-8") as gender_file:
        json.dump(character_gender_map, gender_file)
