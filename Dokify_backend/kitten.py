from kittentts import KittenTTS
import soundfile as sf

# Load the KittenTTS model once globally
m = KittenTTS("KittenML/kitten-tts-nano-0.2")

import re

def synthesize_audio(text, voice, output_path, speed=1.25, emotion=None):
    """
    Synthesizes audio from text using KittenTTS and saves to output_path.
    - Sanitizes input (removes non-ASCII and keeps basic punctuation)
    - Handles errors gracefully
    - Supports speed parameter (default 1.25)
    The emotion argument is ignored (not supported by KittenTTS).
    """
    # Sanitize text: keep only basic characters and punctuation, limit length
    safe_text = re.sub(r'[^a-zA-Z0-9 .,?!\'"-]', '', text)
    safe_text = safe_text[:300]
    if not safe_text or len(safe_text.split()) < 3:
        print("DEBUG: Skipping synthesis due to insufficient content after sanitization.")
        return

    print(f"DEBUG: KittenTTS.generate called with text length: {len(safe_text)}, voice: {voice}, speed: {speed}")
    try:
        audio = m.generate(safe_text, voice=voice, speed=speed)
        sf.write(output_path, audio, 24000)
    except Exception as e:
        print(f"ERROR: KittenTTS synthesis failed: {e}")
