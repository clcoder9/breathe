# Soundscape Input Directory (`input_sounds/`)

This directory is the dedicated intake folder for new high-quality nature soundscapes and ambient audio tracks generated with **Google Lyria**, **MusicFX**, **Google AI Test Kitchen**, or external high-fidelity recordings.

---

## 🚀 Quick Workflow

1. **Generate** or download your soundscapes using the Lyria prompts below.
2. **Save or drag & drop** the audio files into this folder (`input_sounds/`):
   - `rain.mp3` *(or `rain.wav`)*
   - `wind.mp3` *(or `wind.wav`)*
   - `forest.mp3` *(or `forest.wav`)*
   - `fire.mp3` *(or `fire.wav`)*
   - `stream.mp3` *(or `stream.wav`)*
   - `noise.mp3` *(or `noise.wav`)*
   - *(Optional: `ocean.mp3`)*
3. **Run the importer** from the project root:
   ```bash
   python tools/import_soundscapes.py
   ```
   **What the importer does automatically:**
   - Detects all supported audio formats (`.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.aac`, `.opus`).
   - Generates a **seamless circular crossfade loop** so the track loops gaplessly in WebAudio/HTML5 without any audible click, pop, or abrupt break.
   - Applies **EBU R128 loudness normalization (-18 LUFS)** for smooth, balanced volume that matches breath coaching cues.
   - Encodes as clean 44.1 kHz 128 kbps stereo MP3 directly into `music/`.
   - Automatically increments the Service Worker cache version in `sw.js` so web browsers and PWAs immediately refresh and load the new sounds without stale caching.

---

## 🎨 Google Lyria & MusicFX Prompts

Copy and paste these engineered prompts directly into **Google Labs MusicFX** ([https://labs.google/fx/tools/music-fx](https://labs.google/fx/tools/music-fx)), **Lyria Studio**, or the **Gemini API**:

### 1. Rain (HQ Rainfall)
- **Target File**: `input_sounds/rain.mp3`
- **Full Prompt**:
  > Continuous gentle rainfall pattering steadily on broad forest leaves, soft wet soil, and distant foliage. Muffled distant thunder roll in the far background every few moments. Immersive binaural stereo spread, warm organic pink-noise acoustic spectrum, smooth high frequencies without harsh sibilance or splashing. Completely ambient, zero musical instruments, zero synths, zero percussion, zero vocal sounds. Pure, deeply relaxing, seamless meditative rain soundscape.
- **Short Prompt**:
  > Gentle steady rain falling on forest leaves, soft distant thunder rumble, binaural nature recording, immersive 3D stereo, pure environmental soundscape, no instruments, meditative relaxation.

### 2. Wind (HQ Mountain Breeze)
- **Target File**: `input_sounds/wind.mp3`
- **Full Prompt**:
  > Gentle mountain breeze softly whispering through alpine pine needles and valleys. Warm airy low-mid organic swell, natural dynamic breathing rhythm without harsh howling, buffeting, or sharp whistling. Expansive spatial depth, quiet mountain pass atmosphere, soothing natural airflow. Pure environmental nature soundscape, zero musical instruments, no rhythm tracks, no synthetic pads, zero vocals. Deeply calming, organic breath meditation backdrop.
- **Short Prompt**:
  > Soft mountain breeze whispering through pine trees, gentle airy wind gusts, serene high altitude nature atmosphere, smooth organic airflow, no instruments, zero vocals, pure ambient soundscape.

### 3. Night Forest (HQ Crickets & Birds)
- **Target File**: `input_sounds/forest.mp3`
- **Full Prompt**:
  > Peaceful summer night in a tranquil temperate forest. Continuous gentle chorus of night crickets and soft nocturnal cicadas with natural rhythmic variation. Very soft distant night breeze rustling high tree canopies, occasional faint twilight songbird and distant night owl hoot in the background. Pristine high-fidelity spatial stereo field, warm atmospheric dusk ambience. Zero music, no electronic synthesizers, no percussion, no vocal artifacts. Pure nocturnal wilderness serenity.
- **Short Prompt**:
  > Peaceful summer night forest, gentle rhythmic crickets chirping, soft distant owl, rustling canopy breeze, nocturnal wilderness ambience, pristine binaural stereo, no music, no vocals.

### 4. Campfire (HQ Crackle)
- **Target File**: `input_sounds/fire.mp3`
- **Full Prompt**:
  > Cozy wilderness campfire in the calm evening. Natural organic wood embers crackling, gentle popping of dry hardwood pine, soft warm low-frequency flame rumble. Warm, intimate hearth acoustics with soft air movement. Gentle, soothing crackle dynamics without sudden startling loud snaps. Zero musical accompaniment, no instruments, no synthesizer pads, zero human voices. Intimate, grounding, restorative firelight meditation atmosphere.
- **Short Prompt**:
  > Cozy campfire crackle, gentle popping wood embers, warm soothing flame rumble, intimate evening wilderness fire, relaxing campfire ambience, no music, pure organic soundscape.

### 5. Stream (HQ Mountain Brook)
- **Target File**: `input_sounds/stream.mp3`
- **Full Prompt**:
  > Crystal clear alpine mountain stream flowing smoothly over worn river pebbles and mossy stones. Gentle bubbling water, refreshing liquid acoustic textures, quiet brook babble with continuous smooth current. Crisp yet velvety water resonance without harsh metallic treble or splash distortion. Immersive stereo width, peaceful forest creek setting. Zero music, no guitars or pads, zero percussion, no vocal sounds. Zen restorative nature soundscape.
- **Short Prompt**:
  > Crystal clear mountain stream bubbling over smooth stones, tranquil babbling brook, soothing liquid water flow, fresh alpine creek, pure nature soundscape, no instruments, zen meditation.

### 6. Deep Noise (HQ Ambient Drone & Rumble)
- **Target File**: `input_sounds/noise.mp3`
- **Full Prompt**:
  > Deep meditative drone soundscape, rich warm brown noise acoustic foundation blended with gentle 432 Hz organic harmonic sub-bass warmth. Velvety smooth low-frequency resonance, enveloping sonic cocoon, subtle imperceptible breathing swell. Free of harsh treble, free of digital hiss, free of sudden transients, no percussive beats, zero vocals. Deep calming steady frequency foundation designed for long pranayama breath holds, retention, and deep meditation.
- **Short Prompt**:
  > Deep warm brown noise drone, soothing 432Hz harmonic acoustic rumble, velvety sub-bass meditative ambience, warm enveloping sonic floor, no beats, no melody, zero vocals, deep focus.
