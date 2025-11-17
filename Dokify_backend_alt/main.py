import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import uuid
import warnings
from collections import defaultdict
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

import gender_guesser.detector as gender
import numpy as np
import pdfplumber
import soundfile as sf
import spacy
import torch
from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pdf2image import convert_from_path
from PyPDF2 import PdfReader
from transformers import pipeline

try:
    import pydub

    pydub_available = True
except ImportError:
    pydub_available = False
    print("⚠️ pydub not available - audio format conversion limited")

# Suppress warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="Dokify AudioBook Generator", version="1.0.0")

# Enable CORS for all origins
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
COVERS_DIR = "covers"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(COVERS_DIR, exist_ok=True)

# Global variables for models
bark_models_loaded = False
emotion_classifier = None
nlp = None
gender_detector = None
device = "cuda" if torch.cuda.is_available() else "cpu"


# Job status tracking
class JobStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# In-memory job tracking (in production, use Redis or database)
active_jobs = {}
job_results = {}


def setup_pytorch_compatibility():
    """Fix PyTorch 2.6 compatibility issues with Bark"""
    if not hasattr(torch, "_original_load_saved"):
        torch._original_load_saved = torch.load

        def patched_load(*args, **kwargs):
            kwargs["weights_only"] = False
            return torch._original_load_saved(*args, **kwargs)

        torch.load = patched_load
        print("✓ PyTorch 2.6 patch applied (weights_only=False)")

    # Increase recursion limit for complex models
    sys.setrecursionlimit(5000)


def map_voices_to_characters_with_gender(
    characters: Dict[str, int], protagonist: str = "John Doe"
) -> Dict[str, str]:
    """Map voices to characters based on gender detection"""
    global gender_detector
    if gender_detector is None:
        gender_detector = gender.Detector(case_sensitive=False)

    # Voice presets organized by gender
    male_voices = [
        "v2/en_speaker_0",
        "v2/en_speaker_2",
        "v2/en_speaker_4",
        "v2/en_speaker_6",
        "v2/en_speaker_8",
    ]
    female_voices = [
        "v2/en_speaker_1",
        "v2/en_speaker_3",
        "v2/en_speaker_5",
        "v2/en_speaker_7",
        "v2/en_speaker_9",
    ]

    character_voices = {}
    male_idx = 0
    female_idx = 0

    # Sort characters by mention count (most frequent first)
    sorted_chars = sorted(characters.items(), key=lambda x: x[1], reverse=True)

    for char_name, count in sorted_chars:
        # Detect gender
        first_name = char_name.split()[0] if char_name else "Unknown"
        detected_gender = gender_detector.get_gender(first_name)

        # Assign voice based on gender
        if detected_gender in ["male", "mostly_male"]:
            if male_idx < len(male_voices):
                character_voices[char_name] = male_voices[male_idx]
                male_idx += 1
            else:
                # Fallback to any available voice
                character_voices[char_name] = male_voices[male_idx % len(male_voices)]
                male_idx += 1
        else:  # female, mostly_female, andy, unknown
            if female_idx < len(female_voices):
                character_voices[char_name] = female_voices[female_idx]
                female_idx += 1
            else:
                # Fallback to any available voice
                character_voices[char_name] = female_voices[
                    female_idx % len(female_voices)
                ]
                female_idx += 1

    # Add narrator voice
    character_voices["NARRATOR"] = "v2/en_speaker_9"

    print(f"✓ Voice mapping completed for {len(character_voices)} characters")
    return character_voices


async def setup_models():
    """Initialize all ML models asynchronously"""
    global bark_models_loaded, emotion_classifier, nlp, gender_detector

    print("Setting up PyTorch compatibility...")
    setup_pytorch_compatibility()

    # Set cache directories to writable locations
    cache_dir = os.path.join(os.getcwd(), "cache")
    os.makedirs(cache_dir, exist_ok=True)

    # Set environment variables for all model caches
    os.environ["TRANSFORMERS_CACHE"] = cache_dir
    os.environ["HF_HOME"] = cache_dir
    os.environ["TORCH_HOME"] = cache_dir
    os.environ["HUGGINGFACE_HUB_CACHE"] = cache_dir
    os.environ["XDG_CACHE_HOME"] = cache_dir

    print(f"✓ Cache directory set to: {cache_dir}")
    print(f"Using device: {device}")

    # Load spaCy model with fallback
    if nlp is None:
        print("Loading spaCy model...")
        try:
            nlp = spacy.load("en_core_web_sm")
            print("✓ spaCy model loaded")
        except OSError:
            print("⚠️ spaCy en_core_web_sm model not found, trying to download...")
            try:
                subprocess.run(
                    ["python", "-m", "spacy", "download", "en_core_web_sm"], check=True
                )
                nlp = spacy.load("en_core_web_sm")
                print("✓ spaCy model downloaded and loaded")
            except Exception as e:
                print(f"⚠️ Failed to download spaCy model: {e}")
                print("Using blank spaCy model (limited functionality)")
                nlp = spacy.blank("en")

    # Initialize gender detector
    if gender_detector is None:
        gender_detector = gender.Detector(case_sensitive=False)
        print("✓ Gender detector initialized")

    # Load emotion classifier
    if emotion_classifier is None:
        emotion_classifier = setup_emotion_analyzer()

    # Load Bark models
    if not bark_models_loaded:
        try:
            print("Loading Bark TTS models...")
            print("(First run downloads ~10GB of models - takes 3-5 minutes)")

            # Set Bark environment variables
            os.environ["SUNO_USE_SMALL_MODELS"] = "True"
            os.environ["SUNO_OFFLOAD_CPU"] = "True"

            from bark import SAMPLE_RATE, generate_audio, preload_models

            preload_models()
            bark_models_loaded = True
            print("✓ Bark TTS models loaded")
        except Exception as e:
            print(f"⚠️ Could not load Bark models: {e}")

    # Check for fallback TTS options
    global fallback_tts_available
    try:
        # Check if espeak is available
        subprocess.run(["espeak", "--version"], capture_output=True, check=True)
        fallback_tts_available = True
        print("✓ Fallback TTS (espeak) available")
    except:
        try:
            # Check if festival is available
            subprocess.run(["festival", "--version"], capture_output=True, check=True)
            fallback_tts_available = True
            print("✓ Fallback TTS (festival) available")
        except:
            print("⚠️ No fallback TTS available")
            fallback_tts_available = False


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using pdfplumber"""
    full_text = ""

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
                    if page_num % 10 == 0:
                        print(f"  Processed {page_num} pages...")

        print("✓ Extracted text from PDF")
        return full_text
    except Exception as e:
        print(f"✗ Error extracting text: {e}")
        return ""


def clean_text(text: str) -> str:
    """Clean text while preserving dialogue markers"""
    # Remove page numbers
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.MULTILINE)

    # Remove excessive whitespace
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    text = re.sub(r" +", " ", text)

    # Remove headers/footers
    text = re.sub(r"Page \d+", "", text, flags=re.IGNORECASE)

    # Keep dialogue markers - only remove truly unwanted characters
    text = re.sub(r'[^\w\s\.\,\!\?\;\:\'\"\-\(\)\n""' "]", "", text)

    # Normalize quotes
    text = text.replace('"', '"').replace('"', '"')
    text = text.replace(""", "'").replace(""", "'")

    return text.strip()


def identify_characters(text: str) -> Dict[str, int]:
    """Identify character names using spaCy NER with fallback for blank model"""
    global nlp

    # Limit text length for processing
    max_length = 1000000
    if len(text) > max_length:
        text = text[:max_length]

    doc = nlp(text)

    characters = defaultdict(int)

    # Check if spaCy model has NER capability
    if nlp.has_pipe("ner"):
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                name = ent.text.strip()
                if len(name) > 2:
                    characters[name] += 1
    else:
        # Fallback: simple pattern matching for capitalized words
        print("⚠️ Using basic pattern matching for character detection")
        import re

        # Find capitalized words that might be names
        potential_names = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", text)
        for name in potential_names:
            if len(name) > 2 and name not in [
                "The",
                "This",
                "That",
                "Then",
                "There",
                "They",
                "Chapter",
            ]:
                characters[name] += 1

    # Filter main characters (mentioned at least 3 times)
    main_characters = {name: count for name, count in characters.items() if count >= 3}
    main_characters = dict(
        sorted(main_characters.items(), key=lambda x: x[1], reverse=True)
    )

    print(f"✓ Identified {len(main_characters)} main characters:")
    for idx, (char, count) in enumerate(list(main_characters.items())[:10]):
        print(f"  {idx + 1}. {char}: {count} mentions")

    return main_characters


def setup_emotion_analyzer():
    """Initialize emotion detection with fallback"""
    print("Loading emotion analysis model on GPU...")
    try:
        # Try with local_files_only first to avoid re-downloading
        emotion_classifier = pipeline(
            "text-classification",
            model="bhadresh-savani/distilbert-base-uncased-emotion",  # Alternative model
            top_k=1,
            device=0 if torch.cuda.is_available() else -1,
        )
        print(f"✓ Emotion analyzer loaded on {device.upper()}")
        return emotion_classifier
    except Exception as e:
        print(f"⚠️  Could not load emotion model: {e}")
        print("  Continuing without emotion analysis")
        return None


def analyze_emotion(text, emotion_classifier):
    """Analyze emotion of a text segment"""
    if emotion_classifier is None:
        return "neutral"

    try:
        text = text[:512]
        result = emotion_classifier(text)
        emotion = result[0][0]["label"]
        return emotion
    except:
        return "neutral"


def has_dialogue(text: str) -> bool:
    """Check if text segment contains dialogue"""
    dialogue_patterns = [
        r'"[^"]*"',  # Text in double quotes
        r"'[^']*'",  # Text in smart quotes
        r'"[^"]*"',  # Text in curly quotes
        r'"\w',  # Quote followed by word
        r'\w"',  # Word followed by quote
        r"said\s+\w+",  # "said John"
        r"\w+\s+said",  # "John said"
        r"asked\s+\w+",  # "asked Mary"
        r"\w+\s+asked",  # "Mary asked"
        r"replied\s+\w+",  # "replied Bob"
    ]

    for pattern in dialogue_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def advanced_detect_speaker(segment, characters, last_speaker="NARRATOR"):
    """
    AGGRESSIVE speaker detection that works even with corrupted quotes
    """
    segment_lower = segment.lower()

    print(f"  [DEBUG] Analyzing: {segment[:80]}...")

    # Strategy 1: Look for ANY dialogue verb + character name (before OR after)
    dialogue_verbs = [
        "said",
        "asked",
        "replied",
        "shouted",
        "whispered",
        "exclaimed",
        "muttered",
        "called",
        "yelled",
        "cried",
        "answered",
        "continued",
        "added",
        "wondered",
        "thought",
    ]

    for char in characters:
        char_lower = char.lower()

        # Check if character name + verb appears ANYWHERE in segment
        for verb in dialogue_verbs:
            # Pattern 1: "Character verb"
            if f"{char_lower} {verb}" in segment_lower:
                print(f"  [MATCH] Found '{char} {verb}' pattern")
                return char

            # Pattern 2: "verb Character"
            if f"{verb} {char_lower}" in segment_lower:
                print(f"  [MATCH] Found '{verb} {char}' pattern")
                return char

    # Strategy 2: Look for character name + colon (direct speech marker)
    for char in characters:
        if f"{char}:" in segment or f"{char.lower()}:" in segment_lower:
            print(f"  [MATCH] Found '{char}:' pattern")
            return char

    # Strategy 3: If segment has exclamation/question AND single character mentioned
    has_excitement = "!" in segment or "?" in segment

    if has_excitement:
        mentioned = []
        for char in characters:
            # More flexible matching
            if char.lower() in segment_lower:
                mentioned.append(char)

        if len(mentioned) == 1:
            print(f"  [MATCH] Excited dialogue with single character: {mentioned[0]}")
            return mentioned[0]

        # If multiple mentioned, prioritize the one closest to dialogue markers
        if mentioned:
            # Find first mentioned character
            first_char = None
            first_pos = len(segment)
            for char in mentioned:
                pos = segment_lower.find(char.lower())
                if pos < first_pos:
                    first_pos = pos
                    first_char = char
            print(f"  [MATCH] Multiple characters, using first: {first_char}")
            return first_char

    # Strategy 4: Character mentioned + common speech indicators
    speech_indicators = [
        "look",
        "see",
        "do you",
        "what",
        "where",
        "how",
        "this is",
        "that",
        "we",
        "lets",
        "come on",
    ]

    for char in characters:
        if char.lower() in segment_lower:
            for indicator in speech_indicators:
                if indicator in segment_lower:
                    print(f"  [MATCH] {char} + speech indicator '{indicator}'")
                    return char

    # Strategy 5: Pure dialogue (no attribution) - alternate speakers
    if ("!" in segment or "?" in segment) and last_speaker != "NARRATOR":
        # Rotate to next character
        char_list = list(characters.keys())
        if last_speaker in char_list and len(char_list) > 1:
            current_idx = char_list.index(last_speaker)
            next_idx = (current_idx + 1) % len(char_list)
            next_char = char_list[next_idx]
            print(f"  [MATCH] Alternating dialogue: {last_speaker} → {next_char}")
            return next_char

    # Default to narrator
    print(f"  [NO MATCH] Using NARRATOR")
    return "NARRATOR"


def detect_speaker(segment, characters, last_speaker="NARRATOR"):
    """ULTRA-ROBUST speaker detection"""

    # First, check if this is actually dialogue
    is_dialogue = has_dialogue(segment)

    print(f"  [DEBUG] Dialogue detected: {is_dialogue}")
    print(f"  [DEBUG] Segment: {segment[:100]}...")

    # Strategy 1: Look for "Character said/asked" patterns
    for char in characters:
        # Pattern: Name + dialogue verb
        patterns = [
            rf"\b{re.escape(char)}\b[,\s]+(said|asked|replied|shouted|whispered|exclaimed|muttered|called)",
            rf"\b{re.escape(char)}\b\s*:",  # "Character:"
            rf"(said|asked|replied)\s+{re.escape(char)}\b",  # "said Character"
        ]

        for pattern in patterns:
            if re.search(pattern, segment, re.IGNORECASE):
                print(f"  [DEBUG] Found pattern match for: {char}")
                return char

    # Strategy 2: If character name appears in segment with dialogue, they're likely speaking
    if is_dialogue:
        mentioned_chars = []
        for char in characters:
            if re.search(rf"\b{re.escape(char)}\b", segment, re.IGNORECASE):
                mentioned_chars.append(char)

        if len(mentioned_chars) == 1:
            print(f"  [DEBUG] Single character in dialogue: {mentioned_chars[0]}")
            return mentioned_chars[0]

        # If multiple characters, take the first one mentioned
        if mentioned_chars:
            print(f"  [DEBUG] Multiple characters, using first: {mentioned_chars[0]}")
            return mentioned_chars[0]

    # Strategy 3: Contextual - if previous segment was a character, alternate
    if is_dialogue and last_speaker != "NARRATOR":
        char_list = list(characters.keys())
        if last_speaker in char_list:
            try:
                current_idx = char_list.index(last_speaker)
                next_idx = (current_idx + 1) % len(char_list)
                next_char = char_list[next_idx]
                print(f"  [DEBUG] Alternating from {last_speaker} to {next_char}")
                return next_char
            except:
                pass

    # Default to NARRATOR
    print(f"  [DEBUG] Defaulting to NARRATOR")
    return "NARRATOR"


def enhanced_segment_for_tts(text, max_length=150):
    """Smart segmentation that preserves character attribution"""

    # Split on sentence boundaries but try to keep attribution with dialogue
    segments = []

    # First split by paragraphs (double newlines)
    paragraphs = text.split("\n\n")

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If paragraph is short enough, keep it as one segment
        if len(para) <= max_length:
            segments.append(para)
        else:
            # Split long paragraphs by sentences
            sentences = re.split(r"(?<=[.!?])\s+", para)
            current_segment = ""

            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue

                # Try to keep character attribution with their dialogue
                if (
                    len(current_segment) + len(sentence) > max_length
                    and current_segment
                ):
                    segments.append(current_segment.strip())
                    current_segment = sentence
                else:
                    current_segment += " " + sentence if current_segment else sentence

            if current_segment:
                segments.append(current_segment.strip())

    print(f"✓ Text split into {len(segments)} segments (dialogue-aware)")
    return segments


def generate_fallback_audio(
    text: str, output_path: str, speaker: str = "default"
) -> bool:
    """Generate audio using system TTS as fallback when Bark fails"""
    global fallback_tts_available

    if not fallback_tts_available:
        return False

    try:
        # Create temporary text file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write(text)
            temp_text_file = f.name

        # Try espeak first
        try:
            # Convert to WAV using espeak
            cmd = [
                "espeak",
                "-f",
                temp_text_file,
                "-w",
                output_path,
                "-s",
                "150",  # Speed
                "-a",
                "100",  # Amplitude
            ]

            # Add voice variation based on speaker
            if "female" in speaker.lower() or speaker in ["Mia", "Emma", "Sarah"]:
                cmd.extend(["-v", "en+f3"])  # Female voice
            else:
                cmd.extend(["-v", "en+m3"])  # Male voice

            subprocess.run(cmd, check=True, capture_output=True)
            os.unlink(temp_text_file)
            return True

        except subprocess.CalledProcessError:
            # Try festival as backup
            try:
                cmd = ["festival", "--tts", temp_text_file]
                result = subprocess.run(cmd, check=True, capture_output=True)
                # Festival outputs to stdout, need to redirect to file
                with open(output_path, "wb") as f:
                    f.write(result.stdout)
                os.unlink(temp_text_file)
                return True
            except:
                os.unlink(temp_text_file)
                return False

    except Exception as e:
        print(f"Fallback TTS error: {e}")
        return False


async def generate_audiobook(
    text: str,
    single_voice: bool = False,  # Multi-voice is default
    voice_preset: str = "v2/en_speaker_9",
    output_format: str = "m4a",
    user_id: str = "anonymous",
) -> str:
    """Generate audiobook from text"""
    global bark_models_loaded

    if not bark_models_loaded:
        await setup_models()

    # Create user directory
    user_dir = os.path.join(AUDIO_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)

    output_filename = f"audiobook_{uuid.uuid4().hex[:8]}.wav"
    output_path = os.path.join(user_dir, output_filename)

    # Try Bark TTS first
    bark_success = False
    if bark_models_loaded:
        try:
            from bark import SAMPLE_RATE, generate_audio

            bark_success = True
        except ImportError as e:
            print(f"⚠️ Bark TTS not available: {e}")
            bark_success = False

    # If Bark is not available, try fallback TTS
    if not bark_success:
        print("Attempting fallback TTS generation...")
        if generate_fallback_audio(text, output_path, "narrator"):
            print(f"✓ Fallback TTS audiobook generated: {output_path}")
            return output_filename

        # If fallback TTS also fails, create a placeholder
        print("⚠️ All TTS methods failed, creating placeholder audio")
        return output_filename

    print("Starting audiobook generation...")

    # Clean and prepare text
    cleaned_text = clean_text(text)

    if single_voice:
        # Single voice mode - use narrator voice for everything
        voice_preset = "v2/en_speaker_9"

        # Split text into manageable chunks
        import textwrap

        chunks = textwrap.wrap(cleaned_text, 300)

        audio_segments = []
        total_chunks = len(chunks)

        for i, chunk in enumerate(chunks):
            print(f"Generating audio chunk {i + 1}/{total_chunks}...")

            try:
                audio_array = generate_audio(chunk, history_prompt=voice_preset)
                audio_segments.append(audio_array)

                # Small delay to prevent overloading
                await asyncio.sleep(0.1)

            except Exception as e:
                print(f"Error generating chunk {i + 1}: {e}")
                # Generate silence as fallback
                silence = np.zeros(int(SAMPLE_RATE * 0.5))
                audio_segments.append(silence)

    else:
        # Multi-voice mode
        characters = identify_characters(cleaned_text)
        character_voices = map_voices_to_characters_with_gender(characters)

        # Segment text with speaker attribution
        segments = enhanced_segment_for_tts(cleaned_text, max_length=150)

        audio_segments = []
        total_segments = len(segments)
        last_speaker = "NARRATOR"

        print(f"\nGenerating audio for {total_segments} segments...")
        print("\n" + "=" * 60)
        print("SPEAKER DETECTION WITH DEBUG")
        print("=" * 60)

        for idx, segment in enumerate(segments):
            if not segment.strip() or len(segment) < 10:
                continue

            print(f"\n[{idx + 1}/{total_segments}] Processing...")
            print(f"  Text preview: {segment[:100]}...")

            # Detect speaker with enhanced debugging
            speaker = advanced_detect_speaker(segment, characters, last_speaker)
            voice_preset = character_voices.get(
                speaker, character_voices.get("NARRATOR", "v2/en_speaker_9")
            )

            # Update last speaker
            if speaker != "NARRATOR":
                last_speaker = speaker

            # Analyze emotion
            emotion = analyze_emotion(segment, emotion_classifier)

            # Add emotion tags
            emotion_tags = {
                "anger": "[intense] ",
                "fear": "[nervous] ",
                "joy": "[laughs] ",
                "sadness": "[sighs] ",
                "surprise": "[gasps] ",
            }

            emotion_prefix = emotion_tags.get(emotion.lower(), "")
            enhanced_text = emotion_prefix + segment[:200]

            print(f"  🎭 FINAL Speaker: {speaker}")
            print(f"  🎤 Voice: {voice_preset}")
            print(f"  😊 Emotion: {emotion}")

            # Generate audio
            try:
                import time

                start_time = time.time()

                audio_array = generate_audio(enhanced_text, history_prompt=voice_preset)

                elapsed = time.time() - start_time
                audio_segments.append(audio_array)

                print(f"  ✓ Generated in {elapsed:.1f}s")

                # Small delay between generations
                await asyncio.sleep(0.1)

            except Exception as e:
                print(f"  ✗ Error generating segment {idx + 1}: {e}")
                # Generate silence as fallback
                silence = np.zeros(int(SAMPLE_RATE * 0.5))
                audio_segments.append(silence)

    # Combine all audio segments
    print("Combining audio segments...")
    if audio_segments:
        # Add small silence between segments
        silence_gap = np.zeros(int(SAMPLE_RATE * 0.3))

        combined_audio = []
        for i, segment in enumerate(audio_segments):
            combined_audio.append(segment)
            if i < len(audio_segments) - 1:  # Don't add silence after last segment
                combined_audio.append(silence_gap)

        final_audio = np.concatenate(combined_audio)

        # Ensure user directory exists
        user_dir = os.path.join(AUDIO_DIR, user_id)
        os.makedirs(user_dir, exist_ok=True)

        # Generate unique filename
        unique_id = str(uuid.uuid4().hex)[:8]

        if output_format.lower() == "mp3":
            output_file = os.path.join(user_dir, f"audiobook_{unique_id}.mp3")
            # Convert to mp3 using pydub
            try:
                from pydub import AudioSegment

                # Save as wav first
                temp_wav = output_file.replace(".mp3", ".wav")
                sf.write(temp_wav, final_audio, SAMPLE_RATE)
                # Convert to mp3
                audio = AudioSegment.from_wav(temp_wav)
                audio.export(output_file, format="mp3")
                os.remove(temp_wav)  # Clean up temp file
            except ImportError:
                # Fallback to wav if pydub not available
                output_file = output_file.replace(".mp3", ".wav")
                sf.write(output_file, final_audio, SAMPLE_RATE)
        else:
            # Default to wav
            output_file = os.path.join(user_dir, f"audiobook_{unique_id}.wav")
            sf.write(output_file, final_audio, SAMPLE_RATE)

        print(f"✓ Audiobook generated: {output_file}")
        return output_file

    else:
        raise RuntimeError("No audio segments generated")


def extract_pdf_metadata(pdf_path: str) -> tuple[str, str]:
    """Extract title and author from PDF metadata"""
    try:
        reader = PdfReader(pdf_path)
        info = reader.metadata or {}
        title = (
            getattr(info, "title", None)
            or os.path.splitext(os.path.basename(pdf_path))[0]
        )
        author = getattr(info, "author", None) or "Unknown Author"
        return title, author
    except Exception:
        return os.path.splitext(os.path.basename(pdf_path))[0], "Unknown Author"


def extract_cover_image(pdf_path: str) -> str:
    """Extract cover image from PDF first page"""
    try:
        images = convert_from_path(pdf_path, first_page=1, last_page=1)
        if images:
            cover_filename = (
                f"{os.path.splitext(os.path.basename(pdf_path))[0]}_cover.jpg"
            )
            cover_path = os.path.join(COVERS_DIR, cover_filename)
            images[0].save(cover_path, "JPEG")
            return f"/covers/{cover_filename}"
    except Exception as e:
        print(f"Could not extract cover: {e}")

    # Fallback placeholder
    return "https://covers.openlibrary.org/b/id/8231856-L.jpg"


def append_audiobook_entry(
    audio_file_path: str,
    title: str,
    author: str,
    cover_image_url: str,
    description: str = "",
):
    """Add audiobook entry to audiobooks.json"""
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

    # Generate new ID
    new_id = str(len(audiobooks) + 1)

    # Store user-specific relative path
    audio_rel = f"{os.path.basename(os.path.dirname(audio_file_path))}/{os.path.basename(audio_file_path)}"

    chapter = {"title": title, "audioUrl": audio_rel, "duration": "Unknown"}

    entry = {
        "id": new_id,
        "title": title,
        "author": author,
        "duration": "Unknown",
        "coverImage": cover_image_url,
        "description": description,
        "audioUrl": audio_rel,
        "bookmarked": False,
        "chapters": [chapter],
    }

    audiobooks.append(entry)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(audiobooks, f, indent=2)


def run_audiobook_generation_sync(
    job_id: str, file_path: str, single_voice: bool, output_format: str, user_id: str
):
    """Run audiobook generation in background thread"""
    try:
        # Update job status
        active_jobs[job_id]["status"] = JobStatus.PROCESSING
        active_jobs[job_id]["progress"] = "Extracting PDF metadata..."

        # Extract metadata
        title, author = extract_pdf_metadata(file_path)
        cover_image_url = extract_cover_image(file_path)

        active_jobs[job_id]["progress"] = f"Processing book: {title} by {author}"
        print(f"Processing book: {title} by {author}")

        # Extract text
        active_jobs[job_id]["progress"] = "Extracting text from PDF..."
        text = extract_text_from_pdf(file_path)
        if not text:
            raise RuntimeError("Could not extract text from PDF")

        # Generate audiobook (this is the long-running part)
        active_jobs[job_id]["progress"] = (
            "Generating audiobook (this may take several minutes)..."
        )

        # Run generation in new event loop since we're in a thread
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            audio_file_path = loop.run_until_complete(
                generate_audiobook(
                    text, single_voice, "v2/en_speaker_9", output_format, user_id
                )
            )
        finally:
            loop.close()

        # Add to audiobooks database
        active_jobs[job_id]["progress"] = "Finalizing audiobook..."
        append_audiobook_entry(audio_file_path, title, author, cover_image_url, "")

        # Mark job as completed
        active_jobs[job_id]["status"] = JobStatus.COMPLETED
        active_jobs[job_id]["progress"] = "Audiobook generation completed!"
        job_results[job_id] = {
            "audio_file": audio_file_path,
            "title": title,
            "author": author,
            "cover_image": cover_image_url,
        }

    except Exception as e:
        print(f"Error in audiobook generation: {e}")
        active_jobs[job_id]["status"] = JobStatus.FAILED
        active_jobs[job_id]["error"] = str(e)
        active_jobs[job_id]["progress"] = f"Failed: {str(e)}"


async def generate_audiobook_pipeline(
    file_path: str,
    single_voice: bool = False,  # Multi-voice mode by default
    output_format: str = "m4a",
    user_id: str = "anonymous",
) -> str:
    """Start audiobook generation as background task and return job ID"""
    # Create unique job ID
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    # Initialize job tracking
    active_jobs[job_id] = {
        "status": JobStatus.PENDING,
        "progress": "Initializing...",
        "created_at": datetime.now().isoformat(),
        "user_id": user_id,
    }

    # Start background thread
    thread = threading.Thread(
        target=run_audiobook_generation_sync,
        args=(job_id, file_path, single_voice, output_format, user_id),
    )
    thread.daemon = True
    thread.start()

    return job_id


# API Routes


@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    print("Initializing Dokify AudioBook Generator...")
    await setup_models()
    print("Server ready!")


@app.get("/")
async def root():
    return {"message": "Dokify AudioBook Generator API", "version": "1.0.0"}


@app.post("/uploadfile/")
async def upload_book(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    protagonist: str = Form("John Doe"),
    single_voice: bool = Form(False),  # Multi-voice mode by default
    output_format: str = Form("m4a"),
    user_id: str = Form("anonymous"),
):
    """Upload and process book for audiobook generation"""
    filename = file.filename or "uploaded_book"

    # Get effective user ID from headers or form
    header_user = request.headers.get("x-user-id")
    auth_header = request.headers.get("authorization")

    if not header_user and auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            header_user = parts[1]

    effective_user_id = header_user or (
        user_id if user_id and user_id != "anonymous" else None
    )

    if not effective_user_id:
        print(f"Unauthorized upload attempt: missing user id for filename={filename}")
        raise HTTPException(
            status_code=401, detail="Authentication required: user id missing"
        )

    print(f"Received upload for user_id={effective_user_id}, filename={filename}")

    # Save file to user-specific directory
    user_upload_dir = os.path.join(UPLOAD_DIR, effective_user_id)
    os.makedirs(user_upload_dir, exist_ok=True)

    file_path = os.path.join(user_upload_dir, filename)
    content = await file.read()

    with open(file_path, "wb") as f:
        f.write(content)

    # Start background processing and get job ID
    job_id = await generate_audiobook_pipeline(
        file_path,
        single_voice,
        output_format,
        effective_user_id,
    )

    return {
        "message": "Audiobook generation started",
        "filename": filename,
        "job_id": job_id,
        "status_url": f"/job/{job_id}/status",
        "user_id": effective_user_id,
    }


@app.get("/audiobook/{user_id}/{filename}")
async def get_audiobook_file(user_id: str, filename: str):
    """Serve audiobook file"""
    file_path = os.path.join(AUDIO_DIR, user_id, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audiobook file not found")

    media_type = "audio/mpeg" if filename.endswith(".mp3") else "audio/wav"
    return FileResponse(file_path, media_type=media_type, filename=filename)


@app.get("/covers/{filename}")
async def get_cover_image(filename: str):
    """Serve cover image"""
    file_path = os.path.join(COVERS_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Cover image not found")

    return FileResponse(file_path, media_type="image/jpeg", filename=filename)


@app.get("/audiobooks/")
async def get_books():
    """Get list of all audiobooks"""
    json_path = os.path.join(os.path.dirname(__file__), "audiobooks.json")

    if not os.path.exists(json_path):
        return {"books": []}

    with open(json_path, "r", encoding="utf-8") as f:
        try:
            books_data = json.load(f)
        except Exception:
            books_data = []

    return {"books": books_data}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "bark": bark_models_loaded,
            "spacy": nlp is not None,
            "emotion": emotion_classifier is not None,
            "gender": gender_detector is not None,
        },
        "device": device,
        "active_jobs": len(active_jobs),
        "completed_jobs": len(job_results),
    }


@app.get("/job/{job_id}/status")
async def get_job_status(job_id: str):
    """Get status of audiobook generation job"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job_info = active_jobs[job_id].copy()

    # Add result info if completed
    if job_id in job_results:
        job_info["result"] = job_results[job_id]

    return job_info


@app.get("/jobs/")
async def list_jobs(user_id: Optional[str] = None):
    """List all jobs, optionally filtered by user_id"""
    jobs = {}

    for job_id, job_info in active_jobs.items():
        if user_id is None or job_info.get("user_id") == user_id:
            job_copy = job_info.copy()
            if job_id in job_results:
                job_copy["result"] = job_results[job_id]
            jobs[job_id] = job_copy

    return {"jobs": jobs, "total": len(jobs)}


@app.delete("/job/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a job (only works for pending jobs)"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job_status = active_jobs[job_id]["status"]

    if job_status == JobStatus.PROCESSING:
        return {
            "message": "Cannot cancel job that is already processing",
            "job_id": job_id,
        }

    if job_status in [JobStatus.COMPLETED, JobStatus.FAILED]:
        return {"message": "Job already finished", "job_id": job_id}

    # Mark as failed/cancelled
    active_jobs[job_id]["status"] = JobStatus.FAILED
    active_jobs[job_id]["error"] = "Cancelled by user"
    active_jobs[job_id]["progress"] = "Cancelled"

    return {"message": "Job cancelled", "job_id": job_id}


@app.get("/job/{job_id}/result")
async def get_job_result(job_id: str):
    """Get the result of a completed job"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job_status = active_jobs[job_id]["status"]

    if job_status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Job not completed yet. Current status: {job_status.value}",
        )

    if job_id not in job_results:
        raise HTTPException(status_code=404, detail="Job result not found")

    return job_results[job_id]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
