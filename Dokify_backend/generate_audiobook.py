import asyncio
import os
import json
import ffmpeg
from kitten import synthesize_audio


async def process_audiobook_generation(
    voice_type: str,
    narrator_gender: str,
    output_format: str,
    book_file_path: str,
    use_emotion_tags: bool = False,
):
    """
    Generates audiobook audio from annotated book text with character voices & emotions.
    Yields progress updates asynchronously.
    """
    # Prepare directories
    os.makedirs("audio_segments", exist_ok=True)
    os.makedirs("generated_audiobooks", exist_ok=True)

    # Load character voice map
    voice_map_path = "character_voice_map.json"
    if os.path.exists(voice_map_path):
        with open(voice_map_path, "r", encoding="utf-8") as f_voice:
            character_voice_map = json.load(f_voice)
    else:
        character_voice_map = {}

    import re

    audio_segments = []

    # Synthesize audio segments
    with open(book_file_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            data = json.loads(line)
            text = data.get("text", "").strip()
            # Sanitize: remove non-ASCII and skip empty
            safe_text = re.sub(r"[^\x00-\x7F]+", "", text)
            if not safe_text:
                print(f"DEBUG: Skipping empty or invalid chunk at {i}")
                continue
            character = data.get("character")
            voice = data.get("voice") or character_voice_map.get(
                character, "expr-voice-2-m"
            )
            emotion = data.get("emotion") if use_emotion_tags else "neutral"

            print(
                f"DEBUG: Synthesizing audio for chunk {i}, text length: {len(safe_text)}, voice: {voice}, first 100 chars: {safe_text[:100]}"
            )
            segment_audio_path = f"audio_segments/segment_{i}.wav"
            # Attempt synthesis and handle failures gracefully. Only append segments that actually exist.
            try:
                synthesize_audio(safe_text, voice, segment_audio_path, emotion=emotion)
            except Exception as e:
                print(f"DEBUG: synthesize_audio failed for chunk {i}: {e}")
                # Skip this chunk and continue processing the rest
                continue

            # Verify the produced file exists and has content before appending.
            if (
                not os.path.exists(segment_audio_path)
                or os.path.getsize(segment_audio_path) == 0
            ):
                print(
                    f"DEBUG: synthesize_audio produced no file for chunk {i} (path: {segment_audio_path}), skipping."
                )
                # Remove any zero-length file if created
                try:
                    if (
                        os.path.exists(segment_audio_path)
                        and os.path.getsize(segment_audio_path) == 0
                    ):
                        os.remove(segment_audio_path)
                except Exception as e:
                    print(
                        f"DEBUG: failed to remove empty segment file for chunk {i}: {e}"
                    )
                continue

            audio_segments.append(segment_audio_path)

            await asyncio.sleep(0.05)
            yield {"progress": i + 1, "total": "unknown"}

    # Merge segments using ffmpeg-python
    # Create a text file listing all segment paths for ffmpeg concat
    concat_list_path = "audio_segments/concat_list.txt"
    with open(concat_list_path, "w", encoding="utf-8") as concat_file:
        for seg_path in audio_segments:
            concat_file.write(f"file '{os.path.abspath(seg_path)}'\n")

    final_audio_file = f"generated_audiobooks/audiobook.{output_format.lower()}"
    # Choose codec based on output format
    acodec = "aac" if output_format.lower() in ["m4a", "mp4"] else "mp3"

    # Debug: print concat list contents and check segment files
    print("==== DEBUG: concat_list.txt contents ====")
    with open(concat_list_path, "r", encoding="utf-8") as f:
        print(f.read())
    print("==== DEBUG: Segment file existence and info ====")
    for seg_path in audio_segments:
        exists = os.path.exists(seg_path)
        size = os.path.getsize(seg_path) if exists else 0
        print(f"{seg_path}: exists={exists}, size={size} bytes")
        if exists:
            try:
                import wave

                with wave.open(seg_path, "rb") as wav_file:
                    print(
                        f"  Channels: {wav_file.getnchannels()}, Sample rate: {wav_file.getframerate()}, Frames: {wav_file.getnframes()}"
                    )
            except Exception as e:
                print(f"  Error reading WAV file: {e}")

    (
        ffmpeg.input(concat_list_path, format="concat", safe=0)
        .output(final_audio_file, acodec=acodec)
        .run(overwrite_output=True)
    )

    yield {"completed": True, "audio_file": final_audio_file}
