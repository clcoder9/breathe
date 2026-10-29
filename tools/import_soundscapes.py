#!/usr/bin/env python3
"""Import and master soundscapes from input_sounds/ into music/

Features:
- Supports both Meditative/Harmonic synthesized tracks and CC0 Nature field recordings:
  - Adaptive Pranayama: active-flow, deep-retention
  - Meditative/Harmonic: singing-bowls, theta-drone, harmonic-pad, velvet-noise
  - Nature Soundscapes: ocean, rain, stream, forest, fire, wind
- Trims field recording head/tail edges if long (>70s) to avoid mic handling artifacts
- Applies 2.5s circular crossfade so every track loops seamlessly without pops/gaps
- Applies EBU R128 loudness normalization (-18 LUFS) for balanced volume alongside voice cues
- Encodes clean 44.1 kHz 128 kbps stereo MP3s into music/
- Automatically bumps sw.js cache version so browsers load the new audio immediately
"""

import re
import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_DIR = BASE_DIR / "input_sounds"
OUTPUT_DIR = BASE_DIR / "music"
SW_FILE = BASE_DIR / "sw.js"

TRACK_MAPPINGS = {
    "active-flow": ["active-flow", "active_flow"],
    "deep-retention": ["deep-retention", "deep_retention"],
    "singing-bowls": ["singing-bowls", "singing_bowls", "bowls"],
    "theta-drone": ["theta-drone", "theta_drone", "theta"],
    "harmonic-pad": ["harmonic-pad", "harmonic_pad", "harmonic"],
    "velvet-noise": ["velvet-noise", "velvet_noise", "velvet", "delta"],
    "ocean": ["ocean", "ocean_raw", "waves", "surf"],
    "rain": ["rain", "rain_raw", "rainfall"],
    "stream": ["stream", "stream_raw", "brook", "creek"],
    "forest": ["forest", "forest_raw", "woods", "birds"],
    "fire": ["fire", "fire_raw", "campfire", "fireplace"],
    "wind": ["wind", "wind_raw", "breeze"],
}

SUPPORTED_EXTS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac", ".opus", ".webm"}


def match_track_type(filename: str):
    stem = Path(filename).stem.lower().replace(" ", "_")
    for track_key, keywords in TRACK_MAPPINGS.items():
        if stem == track_key or stem == track_key.replace("-", "_"):
            return track_key
        for kw in keywords:
            if stem == kw or stem.startswith(kw + "_"):
                return track_key
    return None


def get_duration(file_path: Path) -> float:
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(file_path)
        ]
        out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
        return float(out)
    except Exception as e:
        print(f"Warning: Could not get duration for {file_path.name}: {e}")
        return 0.0


def process_audio(input_file: Path, output_file: Path, is_raw_field: bool = False) -> bool:
    duration = get_duration(input_file)
    if duration <= 0:
        print(f"  [!] Skipping {input_file.name}: invalid or zero duration")
        return False

    # For raw field recordings, trim first 3s and cap window at 66s to extract the cleanest steady middle section
    start_offset = 0.0
    end_time = duration
    if is_raw_field and duration > 20.0:
        start_offset = min(3.0, duration * 0.08)
        end_time = min(duration - min(2.0, duration * 0.05), start_offset + 66.0)

    usable_dur = end_time - start_offset
    crossfade = 2.5 if usable_dur >= 15.0 else max(0.5, usable_dur * 0.15)

    print(
        f"  Processing '{input_file.name}' -> '{output_file.name}' "
        f"(Window: {start_offset:.1f}s..{end_time:.1f}s, Loop Crossfade: {crossfade:.1f}s)"
    )

    # Filter chain:
    # 1. Trim to [start_offset .. end_time]
    # 2. Gentle highpass at 35Hz (removes DC offset & mic rumble) + EBU R128 loudnorm (-18 LUFS)
    # 3. Circular acrossfade so the end of the file flows gaplessly into the start
    filter_complex = (
        f"[0:a]atrim=start={start_offset:.3f}:end={end_time:.3f},asetpts=PTS-STARTPTS,"
        f"highpass=f=35,loudnorm=I=-18:TP=-1.5:LRA=11,asplit=2[a1][a2]; "
        f"[a1]atrim=start={crossfade:.3f}:end={usable_dur:.3f},asetpts=PTS-STARTPTS[body]; "
        f"[a2]atrim=start=0:end={crossfade:.3f},asetpts=PTS-STARTPTS[head]; "
        f"[body][head]acrossfade=d={crossfade:.3f}:c1=qsin:c2=qsin[out]"
    )

    temp_out = output_file.with_name(f"temp_{output_file.name}")
    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_file),
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-ar", "44100",
        "-ac", "2",
        "-b:a", "128k",
        str(temp_out)
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"  [ERROR] FFmpeg failed on {input_file.name}: {res.stderr[:250]}")
            if temp_out.exists():
                temp_out.unlink()
            return False

        if output_file.exists():
            output_file.unlink()
        temp_out.rename(output_file)
        new_size = output_file.stat().st_size
        print(f"  [OK] Saved '{output_file.name}' ({new_size:,} bytes)")
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to process {input_file.name}: {e}")
        if temp_out.exists():
            temp_out.unlink()
        return False


def bump_service_worker_cache():
    if not SW_FILE.exists():
        return
    content = SW_FILE.read_text(encoding="utf-8")
    m = re.search(r"var CACHE_NAME = 'pranayama-v(\d+)';", content)
    if m:
        curr_ver = int(m.group(1))
        new_ver = curr_ver + 1
        new_content = content.replace(m.group(0), f"var CACHE_NAME = 'pranayama-v{new_ver}';")
        SW_FILE.write_text(new_content, encoding="utf-8")
        print(f"[SW] Bumped service worker cache from v{curr_ver} to v{new_ver}")


def main():
    print("=" * 64)
    print("   Breathe Soundscape Importer & Seamless Loop Optimizer")
    print("=" * 64)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not INPUT_DIR.exists():
        print(f"Error: {INPUT_DIR} does not exist.")
        sys.exit(1)

    target_filter = [a.lower() for a in sys.argv[1:]]
    candidates = sorted(
        [f for f in INPUT_DIR.iterdir() if f.is_file() and f.suffix.lower() in SUPPORTED_EXTS],
        key=lambda p: p.name
    )

    processed = 0
    seen_types = set()
    for cand in candidates:
        track_type = match_track_type(cand.name)
        if not track_type or track_type in seen_types:
            continue
        if target_filter and track_type not in target_filter:
            continue

        is_raw = "_raw" in cand.stem.lower()
        target_file = OUTPUT_DIR / f"{track_type}.mp3"
        if process_audio(cand, target_file, is_raw_field=is_raw):
            seen_types.add(track_type)
            processed += 1

    if processed > 0:
        bump_service_worker_cache()
        print(f"\n[DONE] Mastered {processed} soundscape(s) into music/")
    else:
        print("\n[!] No tracks were processed.")


if __name__ == "__main__":
    main()
