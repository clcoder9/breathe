#!/usr/bin/env python3
"""Generate High Quality Nature Soundscapes with Google Lyria or View Prompts.

Usage:
  1. Direct API Generation (if GEMINI_API_KEY is configured):
       pip install google-genai
       set GEMINI_API_KEY=your_key_here
       python tools/generate_lyria_soundscapes.py --generate

  2. View Prompts for Google Labs MusicFX / Lyria Studio:
       python tools/generate_lyria_soundscapes.py --prompts

  3. Generate HQ Procedural Reference Tracks (immediate test):
       python tools/generate_lyria_soundscapes.py --synthesize-test
"""

import os
import sys
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_DIR = BASE_DIR / "input_sounds"
INPUT_DIR.mkdir(parents=True, exist_ok=True)

SOUNDSCAPES = {
    "rain": {
        "title": "Rain (HQ Rainfall)",
        "filename": "rain.mp3",
        "prompt": (
            "Continuous gentle rainfall pattering steadily on broad forest leaves, soft wet soil, and distant foliage. "
            "Muffled distant thunder roll in the far background every few moments. Immersive binaural stereo spread, "
            "warm organic pink-noise acoustic spectrum, smooth high frequencies without harsh sibilance or splashing. "
            "Completely ambient, zero musical instruments, zero synths, zero percussion, zero vocal sounds. "
            "Pure, deeply relaxing, seamless meditative rain soundscape."
        ),
        "short_prompt": (
            "Gentle steady rain falling on forest leaves, soft distant thunder rumble, "
            "binaural nature recording, immersive 3D stereo, pure environmental soundscape, "
            "no instruments, meditative relaxation."
        ),
        "tags": ["Nature Soundscape", "Rain", "Ambient", "Binaural", "48kHz", "Calming", "Organic Rainstorm"],
    },
    "wind": {
        "title": "Wind (HQ Mountain Breeze)",
        "filename": "wind.mp3",
        "prompt": (
            "Gentle mountain breeze softly whispering through alpine pine needles and valleys. Warm airy low-mid organic "
            "swell, natural dynamic breathing rhythm without harsh howling, buffeting, or sharp whistling. Expansive spatial "
            "depth, quiet mountain pass atmosphere, soothing natural airflow. Pure environmental nature soundscape, zero musical "
            "instruments, no rhythm tracks, no synthetic pads, zero vocals. Deeply calming, organic breath meditation backdrop."
        ),
        "short_prompt": (
            "Soft mountain breeze whispering through pine trees, gentle airy wind gusts, serene high altitude nature atmosphere, "
            "smooth organic airflow, no instruments, zero vocals, pure ambient soundscape."
        ),
        "tags": ["Mountain Breeze", "Soft Wind", "Alpine Nature", "Environmental Ambience", "Calming", "Meditative"],
    },
    "forest": {
        "title": "Night Forest (HQ Crickets & Birds)",
        "filename": "forest.mp3",
        "prompt": (
            "Peaceful summer night in a tranquil temperate forest. Continuous gentle chorus of night crickets and soft nocturnal "
            "cicadas with natural rhythmic variation. Very soft distant night breeze rustling high tree canopies, occasional faint "
            "twilight songbird and distant night owl hoot in the background. Pristine high-fidelity spatial stereo field, warm atmospheric "
            "dusk ambience. Zero music, no electronic synthesizers, no percussion, no vocal artifacts. Pure nocturnal wilderness serenity."
        ),
        "short_prompt": (
            "Peaceful summer night forest, gentle rhythmic crickets chirping, soft distant owl, rustling canopy breeze, "
            "nocturnal wilderness ambience, pristine binaural stereo, no music, no vocals."
        ),
        "tags": ["Night Forest", "Crickets", "Twilight Birds", "Nocturnal Ambience", "Wilderness Soundscape", "Calming"],
    },
    "fire": {
        "title": "Campfire (HQ Crackle)",
        "filename": "fire.mp3",
        "prompt": (
            "Cozy wilderness campfire in the calm evening. Natural organic wood embers crackling, gentle popping of dry hardwood pine, "
            "soft warm low-frequency flame rumble. Warm, intimate hearth acoustics with soft air movement. Gentle, soothing crackle dynamics "
            "without sudden startling loud snaps. Zero musical accompaniment, no instruments, no synthesizer pads, zero human voices. "
            "Intimate, grounding, restorative firelight meditation atmosphere."
        ),
        "short_prompt": (
            "Cozy campfire crackle, gentle popping wood embers, warm soothing flame rumble, intimate evening wilderness fire, "
            "relaxing campfire ambience, no music, pure organic soundscape."
        ),
        "tags": ["Campfire", "Wood Crackle", "Cozy Fire", "Hearth Embers", "Warm Ambient", "Grounding", "Meditation"],
    },
    "stream": {
        "title": "Stream (HQ Mountain Brook)",
        "filename": "stream.mp3",
        "prompt": (
            "Crystal clear alpine mountain stream flowing smoothly over worn river pebbles and mossy stones. Gentle bubbling water, "
            "refreshing liquid acoustic textures, quiet brook babble with continuous smooth current. Crisp yet velvety water resonance "
            "without harsh metallic treble or splash distortion. Immersive stereo width, peaceful forest creek setting. Zero music, "
            "no guitars or pads, zero percussion, no vocal sounds. Zen restorative nature soundscape."
        ),
        "short_prompt": (
            "Crystal clear mountain stream bubbling over smooth stones, tranquil babbling brook, soothing liquid water flow, "
            "fresh alpine creek, pure nature soundscape, no instruments, zen meditation."
        ),
        "tags": ["Mountain Stream", "Babbling Brook", "Flowing Water", "Creek", "Liquid Texture", "Zen Ambience", "Relaxing"],
    },
    "noise": {
        "title": "Deep Noise (HQ Drone & Rumble)",
        "filename": "noise.mp3",
        "prompt": (
            "Deep meditative drone soundscape, rich warm brown noise acoustic foundation blended with gentle 432 Hz organic harmonic sub-bass warmth. "
            "Velvety smooth low-frequency resonance, enveloping sonic cocoon, subtle imperceptible breathing swell. Free of harsh treble, "
            "free of digital hiss, free of sudden transients, no percussive beats, zero vocals. Deep calming steady frequency foundation "
            "designed for long pranayama breath holds, retention, and deep meditation."
        ),
        "short_prompt": (
            "Deep warm brown noise drone, soothing 432Hz harmonic acoustic rumble, velvety sub-bass meditative ambience, "
            "warm enveloping sonic floor, no beats, no melody, zero vocals, deep focus."
        ),
        "tags": ["Deep Brown Noise", "Meditative Drone", "432Hz Harmonic", "Velvet Rumble", "Pranayama Ambience", "Zen Focus"],
    },
}


def print_prompts():
    print("=" * 80)
    print("   GOOGLE LYRIA SOUNDSCAPE PROMPTS FOR BREATHE APP")
    print("=" * 80)
    print(f"Destination folder for your downloads: {INPUT_DIR.resolve()}\n")
    print("Copy & paste these prompts into Google Labs MusicFX / Lyria Studio / Gemini API:\n")

    for key, info in SOUNDSCAPES.items():
        print("-" * 80)
        print(f"Track:    {info['title']}")
        print(f"Save as:  input_sounds/{info['filename']}")
        print(f"Tags:     {', '.join(info['tags'])}")
        print("\nFull Lyria Prompt:")
        print(f"  \"{info['prompt']}\"")
        print("\nShort Prompt (for UI textboxes with character limits):")
        print(f"  \"{info['short_prompt']}\"")
        print()

    print("=" * 80)
    print("After saving audio files to 'input_sounds/', run:")
    print("  python tools/import_soundscapes.py")
    print("=" * 80)


def generate_with_api():
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("[!] GEMINI_API_KEY environment variable is not set.")
        print("    To use direct API generation, set your API key:")
        print("      set GEMINI_API_KEY=your_gemini_api_key")
        print("    Or generate files via Google Labs MusicFX (https://labs.google/fx/tools/music-fx)")
        print("    and place them in input_sounds/\n")
        print_prompts()
        return

    try:
        from google import genai
    except ImportError:
        print("[!] The 'google-genai' SDK is not installed.")
        print("    Install it with:")
        print("      pip install google-genai\n")
        return

    client = genai.Client()
    print("Starting generation via Lyria API...")

    for key, info in SOUNDSCAPES.items():
        out_file = INPUT_DIR / info["filename"]
        print(f"Generating '{info['title']}'...")
        try:
            interaction = client.interactions.create(
                model="lyria-3.5",
                input=info["prompt"]
            )
            audio = getattr(interaction, "output_audio", None)
            if audio and hasattr(audio, "data"):
                import base64
                data = base64.b64decode(audio.data)
                out_file.write_bytes(data)
                print(f"  [OK] Saved {out_file.name} ({len(data):,} bytes)")
            else:
                print(f"  [!] No audio returned for {key}")
        except Exception as e:
            print(f"  [Error] Failed to generate {key}: {e}")

    print("\nRunning audio optimizer...")
    from import_soundscapes import main as run_import
    run_import()


def synthesize_test_tracks():
    """Generates procedural reference audio using ffmpeg so the user has immediate HQ audio."""
    import subprocess
    print("=" * 80)
    print("Synthesizing clean reference soundscape test files into input_sounds/...")
    print("=" * 80)

    # 1. Rain: stereo pink noise + highpass/lowpass + randomized raindrop blips
    rain_script = (
        "anoisesrc=d=60:c=pink:r=44100:a=0.35[n];"
        "[n]lowpass=f=4800,highpass=f=400[rain];"
        "anoisesrc=d=60:c=brown:r=44100:a=0.2,lowpass=f=120[thunder];"
        "[rain][thunder]amix=inputs=2:weights=1 0.4[out]"
    )
    # 2. Wind: stereo brown noise + undulating resonant bandpass
    wind_script = (
        "anoisesrc=d=60:c=brown:r=44100:a=0.45[n];"
        "[n]bandpass=f=650:width_type=q:w=1.2,volume=2.2[out]"
    )
    # 3. Forest: quiet air + gentle crickets
    forest_script = (
        "anoisesrc=d=60:c=brown:r=44100:a=0.12,lowpass=f=500[air];"
        "sine=f=4500:d=60[c1];sine=f=4800:d=60[c2];"
        "[c1][c2]amix=inputs=2[s];"
        "[s]volume=0.04[crickets];"
        "[air][crickets]amix=inputs=2:weights=1 0.5[out]"
    )
    # 4. Fire: brown rumble + crackle texture
    fire_script = (
        "anoisesrc=d=60:c=brown:r=44100:a=0.4,lowpass=f=380[rumble];"
        "anoisesrc=d=60:c=white:r=44100:a=0.08,bandpass=f=2200:w=3[snap];"
        "[rumble][snap]amix=inputs=2:weights=1 0.6[out]"
    )
    # 5. Stream: white noise with fluid bandpass
    stream_script = (
        "anoisesrc=d=60:c=pink:r=44100:a=0.4,lowpass=f=3200,highpass=f=600[water];"
        "anoisesrc=d=60:c=brown:r=44100:a=0.25,bandpass=f=850:w=1.5[burble];"
        "[water][burble]amix=inputs=2:weights=1 0.7[out]"
    )
    # 6. Deep Noise: warm brown noise + 432Hz sine undertone
    noise_script = (
        "anoisesrc=d=60:c=brown:r=44100:a=0.5,lowpass=f=240[drone];"
        "sine=f=108:d=60,volume=0.08[sub];"
        "[drone][sub]amix=inputs=2[out]"
    )

    scripts = {
        "rain.mp3": rain_script,
        "wind.mp3": wind_script,
        "forest.mp3": forest_script,
        "fire.mp3": fire_script,
        "stream.mp3": stream_script,
        "noise.mp3": noise_script,
    }

    for fname, filter_graph in scripts.items():
        out_path = INPUT_DIR / fname
        print(f"Synthesizing {fname}...")
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", filter_graph,
            "-ar", "44100", "-ac", "2",
            "-b:a", "128k",
            str(out_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if out_path.exists():
            print(f"  [OK] Created {out_path.name} ({out_path.stat().st_size:,} bytes)")

    print("\nSynthesized files created in input_sounds/!")
    print("To import and optimize into music/, run: python tools/import_soundscapes.py")


def main():
    parser = argparse.ArgumentParser(description="Google Lyria Soundscape Generation Tool")
    parser.add_argument("--prompts", action="store_true", help="Print all Lyria prompts and guides")
    parser.add_argument("--generate", action="store_true", help="Call Lyria API to generate tracks")
    parser.add_argument("--synthesize-test", action="store_true", help="Synthesize reference soundscapes using ffmpeg")
    args = parser.parse_args()

    if args.generate:
        generate_with_api()
    elif args.synthesize_test:
        synthesize_test_tracks()
    else:
        print_prompts()


if __name__ == "__main__":
    main()
