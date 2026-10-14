#!/usr/bin/env python3
"""Import and process nature soundscapes from input_sounds/ into music/

Features:
- Auto-detects tracks: rain, wind, forest, fire, stream, noise (and ocean)
- Formats supported: .mp3, .wav, .flac, .m4a, .ogg, .aac, .opus
- Applies circular crossfade so audio loops seamlessly without pops/gaps
- Applies EBU R128 loudness normalization (-18 LUFS) for consistent volume
- Encodes clean 44.1 kHz 128 kbps stereo MP3s
- Automatically bumps sw.js cache version so browsers load new audio
"""

import os
import sys
import re
import shutil
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_DIR = BASE_DIR / "input_sounds"
OUTPUT_DIR = BASE_DIR / "music"
BACKUP_DIR = BASE_DIR / "music" / "backups"
SW_FILE = BASE_DIR / "sw.js"

TRACK_MAPPINGS = {
    "rain": ["rain", "rainfall", "storm", "shower", "downpour"],
    "wind": ["wind", "breeze", "mountain_breeze", "mountain-breeze", "air"],
    "forest": ["forest", "night_forest", "night-forest", "cricket", "crickets", "birds", "woods"],
    "fire": ["fire", "campfire", "crackle", "fireplace", "hearth"],
    "stream": ["stream", "brook", "creek", "mountain_brook", "mountain-brook", "river", "water"],
    "noise": ["noise", "deep_noise", "deep-noise", "brown", "brown_noise", "drone"],
    "ocean": ["ocean", "waves", "sea", "surf"],
}

SUPPORTED_EXTS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac", ".opus", ".webm"}


def match_track_type(filename: str):
    stem = Path(filename).stem.lower().replace(" ", "_").replace("-", "_")
    for track_key, keywords in TRACK_MAPPINGS.items():
        if stem == track_key:
            return track_key
        for kw in keywords:
            kw_norm = kw.replace("-", "_")
            if kw_norm in stem:
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


def process_audio(input_file: Path, output_file: Path) -> bool:
    duration = get_duration(input_file)
    if duration <= 0:
        print(f"  [!] Skipping {input_file.name}: invalid or zero duration")
        return False

    crossfade = 2.0
    if duration < 5.0:
        crossfade = 0.5
    elif duration < 10.0:
        crossfade = 1.0

    print(f"  Processing '{input_file.name}' -> '{output_file.name}' (Length: {duration:.1f}s, Loop Crossfade: {crossfade:.1f}s)")

    # Circular crossfade filter graph:
    # 1. Body = [crossfade to duration]
    # 2. Head = [0 to crossfade]
    # 3. acrossfade body tail onto head start -> produces seamless loop of length (duration - crossfade)
    # 4. loudnorm normalizes volume to -18 LUFS
    filter_complex = (
        f"[0:a]loudnorm=I=-18:TP=-1.5:LRA=11,asplit=2[a1][a2]; "
        f"[a1]atrim=start={crossfade:.3f}:end={duration:.3f},asetpts=PTS-STARTPTS[body]; "
        f"[a2]atrim=start=0:end={crossfade:.3f},asetpts=PTS-STARTPTS[head]; "
        f"[body][head]acrossfade=d={crossfade:.3f}:c1=tri:c2=tri[out]"
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
            # Fallback if complex filter fails: run simple loudnorm without circular crossfade
            print("  [*] Complex loop filter failed, applying standard loudnorm...")
            fallback_cmd = [
                "ffmpeg", "-y",
                "-i", str(input_file),
                "-af", "loudnorm=I=-18:TP=-1.5:LRA=11",
                "-ar", "44100",
                "-ac", "2",
                "-b:a", "128k",
                str(temp_out)
            ]
            res_fb = subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res_fb.returncode != 0:
                print(f"  [ERROR] FFmpeg failed on {input_file.name}: {res_fb.stderr[:200]}")
                if temp_out.exists():
                    temp_out.unlink()
                return False

        # Backup existing target file
        if output_file.exists():
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            backup_target = BACKUP_DIR / f"{output_file.stem}_backup{output_file.suffix}"
            if not backup_target.exists():
                shutil.copy2(output_file, backup_target)

        # Replace target with new file
        if output_file.exists():
            output_file.unlink()
        temp_out.rename(output_file)
        new_size = output_file.stat().st_size
        print(f"  [OK] Successfully saved '{output_file.name}' ({new_size:,} bytes)")
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
    print("=" * 60)
    print("   Breathe Soundscape Importer & Loop Optimizer")
    print("=" * 60)

    target_filter = [a.lower() for a in sys.argv[1:] if not Path(a).is_dir()]
    dir_arg = [a for a in sys.argv[1:] if Path(a).is_dir()]
    input_dir = Path(dir_arg[0]) if dir_arg else INPUT_DIR
    if not input_dir.exists():
        print(f"Error: Directory '{input_dir}' not found.")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    candidates = [
        f for f in input_dir.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTS
    ]

    if target_filter:
        candidates = [
            f for f in candidates
            if match_track_type(f.name) in target_filter or any(tf in f.stem.lower() for tf in target_filter)
        ]

    if not candidates:
        print(f"No matching audio files found in: {input_dir}")
        print("\nDrop your generated soundscape files in that folder:")
        print("  - rain.mp3   (or rain.wav)")
        print("  - wind.mp3   (or wind.wav)")
        print("  - forest.mp3 (or forest.wav)")
        print("  - fire.mp3   (or fire.wav)")
        print("  - stream.mp3 (or stream.wav)")
        print("  - noise.mp3  (or noise.wav)")
        print("Then run this script again!")
        return

    processed = 0
    for cand in candidates:
        track_type = match_track_type(cand.name)
        if not track_type:
            print(f"[?] Unknown track name '{cand.name}'. Name it e.g. 'rain.mp3', 'wind.wav', etc.")
            continue

        target_file = OUTPUT_DIR / f"{track_type}.mp3"
        ok = process_audio(cand, target_file)
        if ok:
            processed += 1

    if processed > 0:
        bump_service_worker_cache()
        print(f"\n[DONE] Successfully imported {processed} soundscape(s) into music/")
    else:
        print("\n[!] No tracks were processed.")


if __name__ == "__main__":
    main()
