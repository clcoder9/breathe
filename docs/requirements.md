# Pranayama Breathing Exercise — Requirements Analysis

**Document ID:** REQ-WHM-003
**Version:** 3.0
**Date:** 2026-11-25

---

## 1. Project Overview

### Purpose
A client-side, single-file Progressive Web Application (`index.html` + `sw.js`) that guides users through Pranayama (Wim Hof Method), Quick Energize, Kapalabhati (Breath of Fire), Bhramari (Humming Bee), Coherent Breathing, Physiological Sigh, Nadi Shodhana (Alternate Nostril), Box Breathing, 4-7-8, A52, Sleep Wind-Down, 7-Day Guided Journey, and Apnea Tables—complete with a Multi-Phase Routine Sequencer, guided BOLT (CO₂ tolerance) test, Web Bluetooth HR & HRV biofeedback, 3D liquid-metal visualization, dual-layer ambient soundscapes, and local progress analytics.

### Goals
- **G-01**: Deliver an offline-first single-file HTML application (`pranayama-v30`) with zero external runtime network dependencies.
- **G-02**: Guide users through configurable protocols and chained multi-phase routines with synchronized 3D/SVG visuals, 20 offline neural TTS clips, stereo breath pacers, humming pitch guides, and singing bowls.
- **G-03**: Provide flexible session control (`Pause/Resume`, `Hold Now`, `Finish & Save`, and `Flow Mode`).
- **G-04**: Measure and track CO₂ tolerance via a guided BOLT score flow and optional BLE Heart Rate / HRV Diving-Reflex biofeedback.

---

## 2. Functional Requirements

### 2.1 Session Configuration, Presets, Palettes & Favorites

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | 6-tab settings drawer (`Pattern`, `Holds`, `Routine`, `Audio`, `Ambience`, `Visuals`) for configuring all parameters | Must Have |
| FR-002 | Configure total number of rounds (`1–10`) and breaths per round (`1–500`) with breath step (`-15` to `+20`) | Must Have |
| FR-003 | Configure breath hold start time (`0–600s`), increment (`0–120s`), and hold mode (`fixed` or `adaptive`) | Must Have |
| FR-004 | Configure inhale and exhale durations (`0.3–15.0s`) and post-inhale / post-exhale pauses (`0–30s`) | Must Have |
| FR-005 | Configure breath mechanic style (`standard`, `doubleInhale`, `alternateNostril`, `kapalabhati`, `bhramari`) | Must Have |
| FR-006 | Provide 20 built-in presets (11 Core Protocols, 7-Day Journey, 2 Apnea Tables), 3 signature Multi-Phase Routines, savable `Custom` presets/routines, and up to 4 pinned favorite chips on the `IDLE` screen | Must Have |
| FR-007 | Support 5 accent color palettes (`ocean`, `ember`, `forest`, `amethyst`, `monochrome`) orthogonal to `Dark / Light / OLED` display modes | Must Have |

### 2.2 Session Control & Multi-Phase Routine Sequencer

| ID | Requirement | Priority |
|---|---|---|
| FR-010 | `START` button (or `Space` in `IDLE`) begins a configured session or active Multi-Phase Routine | Must Have |
| FR-011 | `PAUSE / RESUME` button (or `P` key) pauses and resumes active phases accurately while preserving marked urge state, hold progress, and stopping active pacer audio | Must Have |
| FR-012 | `HOLD NOW` button (`#hold-now-btn` or `H` key) during active breathing transitions immediately into retention when `holdTarget > 0` | Must Have |
| FR-013 | `FINISH & SAVE` button (`#btn-finish` or `F` key) is enabled once meaningful progress exists (`≥1` hold, `round > 1`, `stage > 0`, active hold `≥1s`, or `≥5` breaths), records actual completed rounds/breaths/holds, and opens the Victory Modal | Must Have |
| FR-014 | `STOP / RESET` button (or `Escape` key) aborts the session and returns to `IDLE` | Must Have |
| FR-015 | `Flow Mode` allows user-paced inhale/exhale tracking with window-level pointer release and keyboard auto-repeat suppression | Should Have |
| FR-016 | Multi-Phase Routine Builder (`App.Routines`) chains 2–6 protocols with configurable bridge transitions (`3s`/`5s`/`10s` in `STAGE_TRANSITION`) and saves one consolidated history entry | Must Have |

### 2.3 Breathwork Protocol Mechanics

| ID | Requirement | Priority |
|---|---|---|
| FR-020 | **Coherent Breathing (`coherent`)**: `5.5s` inhale, `5.5s` exhale, `0s` pauses, `0s` hold, 50 breaths | Must Have |
| FR-021 | **Physiological Sigh (`physio_sigh`)**: 2-stage `doubleInhale` (`0–68%` `INHALE 1/2`, `68–100%` `SIP IN 2/2`) + `6.5s` exhale | Must Have |
| FR-022 | **Nadi Shodhana (`nadi_shodhana`)**: `alternateNostril` cycle with `#nostril-indicator`, `#nostril-arc`, stereo L/R audio panning (`StereoPannerNode`), and neural left/right nostril voice cues | Must Have |
| FR-023 | **Kapalabhati (`kapalabhati`)**: `0.6s` passive inhale / `0.4s` active pump exhale (`1.0 Hz`) × 40 pumps + `45s` (`+15s`) retention hold & recovery | Must Have |
| FR-024 | **Bhramari (`bhramari`)**: `4s` inhale + `8s` humming exhale with synthesized `136.1 Hz` harmonic humming pitch guide + `1s` rest | Must Have |
| FR-025 | **Quick Energize (`energize`)** & **Sleep Wind-Down (`sleep_winddown`)**: Fast `1.2s`/`1.2s` + holds, and `4-8-2` vagal downshift with `slowdown` tempo ramp | Must Have |

### 2.4 Guided BOLT Score & Web Bluetooth Biofeedback

| ID | Requirement | Priority |
|---|---|---|
| FR-030 | Guided BOLT flow (`BOLT_PREP` with voice cues → `BOLT_HOLD`) calibrates `Adaptive` holds even when invoked from zero-hold cadence presets | Must Have |
| FR-031 | `App.Biofeedback` connects via Web Bluetooth (`0x180D` / `0x2A37`), computes live BPM, artifact-filtered RR-interval RMSSD HRV, RSA Coherence, and Diving-Reflex BPM drop during holds, with graceful fallback on unsupported browsers | Should Have |
| FR-032 | Displays 52-week consistency heatmap, protocol filter, paginated responsive history table, per-session delete, and Backup v4 (`Merge` / `Replace`) in `Stats` | Must Have |

### 2.5 Audio & Ambience

| ID | Requirement | Priority |
|---|---|---|
| FR-040 | Synthesize singing bowls, milestone chimes, stereo-panned breath pacer, Kapalabhati pump, and Bhramari 136.1 Hz hum via Web Audio API | Must Have |
| FR-041 | Support 20 offline neural TTS voice clips (`docs/voice/voice_data.js`) with `SpeechSynthesis` fallback | Must Have |
| FR-042 | Dual-layer ambient soundscapes (`amb1` + `amb2`) warmed in Service Worker cache, with non-destructive previewing during active sessions | Must Have |
