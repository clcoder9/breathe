# Breathe Soundscape Pipeline (`input_sounds/` & `music/`)

This directory is the intake and build staging folder for Breathe's soundscapes. All output files are mastered into `music/` at `44.1 kHz`, `128 kbps` stereo MP3, normalized to **-18 LUFS (EBU R128)** with a **2.5-second equal-power circular crossfade** for gapless looping.

---

## Soundscape Lineup & Protocol Mapping

### 1. Breathwork & Meditative Soundscapes (`tools/build_soundscapes.py`)
Synthesized via multi-layer physical modal modeling, harmonic overtone voicing, and binaural entrainment:

- **Adaptive Pranayama (`pranayama`)**:
  - `music/active-flow.mp3`: Warm `110 Hz / 165 Hz / 220 Hz` harmonic pulse contoured to support active Pranayama breathing.
  - `music/deep-retention.mp3`: Consonant `55 Hz / 110 Hz` sub-aquatic `4.0 Hz` Theta binaural pad with distant singing bowl washes that crossfades in during retention holds.
- **Tibetan Singing Bowls (`bowls` → `music/singing-bowls.mp3`)**:
  - Struck and rimmed hand-hammered bronze bowls (`1 : 2.756 : 5.404` modal partials with natural warm beating) for **Box Breathing (4-4-4-4)** and **A52 Cadence (5-5-2)**.
- **Theta Retention Drone (`theta` → `music/theta-drone.mp3`)**:
  - `108 Hz` fundamental + `54 Hz` sub-bass with a `4.5 Hz` Theta binaural frequency differential (`105.75 Hz` L / `110.25 Hz` R) for **Freediving Apnea Tables (O2 / CO2)** and deep breath holds.
- **Warm Harmonic Pad (`harmonic` → `music/harmonic-pad.mp3`)**:
  - Lush `432 Hz`-tuned `Cmaj9` ambient chordal bed with slow chorus drift for **Coherent Breathing**, **7-Day Journey**, and **Recovery**.
- **Deep Sleep Velvet (`delta` → `music/velvet-noise.mp3`)**:
  - Dual-channel decorrelated brown/pink velvet acoustic blanket with `2.0 Hz` Delta binaural sub-warmth for **4-7-8 Relaxing Breath** and **Sleep Mode**.

### 2. Nature Soundscapes (Verified CC0 / Public Domain Field Recordings)
Sourced from CC0 / Public Domain Mark field recordings on the Internet Archive (Radio Aporee collection):

- **Ocean Waves (`ocean` → `music/ocean.mp3`)**: Coastal surf rolling onto sand (`aporee_25434_29478`, Public Domain).
- **Gentle Rain (`rain` → `music/rain.mp3`)**: Gentle rain falling on forest leaves (`aporee_69982_81513`, Public Domain).
- **Mountain Stream (`stream` → `music/stream.mp3`)**: Alpine mountain stream in Hollersbach (`aporee_65017_75100`, Public Domain).
- **Woodland Birds & Breeze (`forest` → `music/forest.mp3`)**: Black Forest morning birds and canopy breeze (`aporee_44034_50101`, Public Domain).
- **Crackling Campfire (`fire` → `music/fire.mp3`)**: Evening wilderness campfire at dusk (`aporee_51228_58465`, Public Domain).
- **Alpine Pines Wind (`wind` → `music/wind.mp3`)**: Soft wind blowing through pine woods (`aporee_41242_47058`, Public Domain).

---

## Rebuilding or Importing Custom Tracks

1. To re-synthesize the meditative tracks into `input_sounds/`:
   ```bash
   python tools/build_soundscapes.py
   ```
2. To master any `.wav` / `.mp3` / `.flac` / `.ogg` files in `input_sounds/` into `music/` and bump the Service Worker cache in `sw.js`:
   ```bash
   python tools/import_soundscapes.py
   ```
