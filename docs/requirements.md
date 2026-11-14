# Pranayama Breathing Exercise — Requirements Analysis

**Document ID:** REQ-WHM-002
**Version:** 2.5
**Date:** 2026-11-14

---

## 1. Project Overview

### Purpose
A client-side, single-file Progressive Web Application (`index.html` + `sw.js`) that guides users through Pranayama (Wim Hof Method), Coherent Breathing, Physiological Sigh, Nadi Shodhana (Alternate Nostril), Box Breathing, and 4-7-8 breathwork protocols, complete with a guided BOLT (CO₂ tolerance) assessment, 3D particle visualization, multi-layered ambient soundscapes, and local progress analytics.

### Goals
- **G-01**: Deliver an offline-first single-file HTML application with zero external runtime network dependencies.
- **G-02**: Guide users through configurable multi-protocol breathing sessions with synchronized 3D/SVG visuals, neural voice cues, breath pacers, and singing bowls.
- **G-03**: Provide flexible session control (`Pause/Resume`, `Hold Now`, `Finish & Save`, and `Flow Mode`).
- **G-04**: Measure and track CO₂ tolerance via a guided BOLT score flow that calibrates adaptive breath-hold targets.

---

## 2. Functional Requirements

### 2.1 Session Configuration & Presets

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Tabbed settings drawer (`Session`, `Holds`, `Sound`, `Visuals`) for configuring all parameters | Must Have |
| FR-002 | Configure total number of rounds (`1–10`) and breaths per round (`1–100`) | Must Have |
| FR-003 | Configure breath hold start time (`0–600s`), increment (`0–120s`), and hold mode (`fixed` or `adaptive`) | Must Have |
| FR-004 | Configure inhale and exhale durations (`0.5–15.0s` in `0.5s` steps) and post-inhale / post-exhale pauses (`0–30s`) | Must Have |
| FR-005 | Configure breath mechanic style (`standard`, `doubleInhale`, `alternateNostril`) | Must Have |
| FR-006 | Provide 10 built-in presets (`Standard`, `Gentle`, `Deep`, `Energize`, `Box`, `4-7-8`, `Sleep`, `Coherent`, `Physio Sigh`, `Nadi Shodhana`) plus savable `Custom` preset and up to 3 pinned favorite chips | Must Have |

### 2.2 Session Control

| ID | Requirement | Priority |
|---|---|---|
| FR-010 | `START` button (or `Space` in `IDLE`) begins a configured session | Must Have |
| FR-011 | `PAUSE / RESUME` button (or `P` key) pauses and resumes active phases accurately | Must Have |
| FR-012 | `HOLD NOW` button (`#hold-now-btn` or `H` key) during active breathing transitions immediately into the retention phase when `holdTarget > 0` | Must Have |
| FR-013 | `FINISH & SAVE` button (`#btn-finish` or `F` key) when paused or after ≥1 completed round/hold ends the session gracefully, records completed rounds/holds to history, and opens the Victory Modal | Must Have |
| FR-014 | `STOP` button (or `Escape` key) aborts the session and returns to `IDLE` | Must Have |
| FR-015 | `Flow Mode` allows user-paced breathing (hold `Space`/pointer to inhale, release to exhale) with keyboard auto-repeat suppression | Should Have |

### 2.3 Breathwork Protocol Mechanics

| ID | Requirement | Priority |
|---|---|---|
| FR-020 | **Coherent Breathing (`coherent`)**: `5.5s` inhale, `5.5s` exhale, `0s` pauses, `0s` hold, 50 breaths (5.5 BPM cardiac coherence) | Must Have |
| FR-021 | **Physiological Sigh (`physio_sigh`)**: 2-stage `doubleInhale` (`0–68%` primary inhale `INHALE 1/2` to 76% scale, followed by `68–100%` top-off sip `SIP IN 2/2` to 100% scale with secondary pacer sip & haptic cue) + `6.5s` long exhale | Must Have |
| FR-022 | **Nadi Shodhana (`nadi_shodhana`)**: `alternateNostril` cycle alternating nostril sides each breath (`Odd`: In Left → Hold Both → Out Right; `Even`: In Right → Hold Both → Out Left) with `#nostril-indicator` badge and directional SVG semicircle arc (`#nostril-arc`) | Must Have |

### 2.4 Guided BOLT Score (CO₂ Tolerance) Flow

| ID | Requirement | Priority |
|---|---|---|
| FR-030 | Launchable from both the Statistics Modal (`#btn-start-bolt-stats`) and Settings → Holds tab (`#btn-start-bolt-settings`) | Must Have |
| FR-031 | `BOLT_PREP` guides a calm 8-second normal breath in and out before retention | Must Have |
| FR-032 | `BOLT_HOLD` counts up in seconds until the user taps/presses `Space` at the first definite physical urge to breathe | Must Have |
| FR-033 | Records score to `whm_bolt_history`, displays `#bolt-overlay` with tier classification (`Developing`, `Functional`, `Advanced`, `Elite`), and offers 1-click **"Use Adaptive Hold Targets"** calibration | Must Have |
| FR-034 | Displays BOLT summary card and historical progression chart in the Statistics Modal, and includes `boltHistory` in JSON exports/imports | Must Have |

### 2.5 Audio & Ambience

| ID | Requirement | Priority |
|---|---|---|
| FR-040 | Synthesize singing bowls, milestone chimes, and pink-noise breath pacer via Web Audio API | Must Have |
| FR-041 | Support offline neural TTS voice cues (`docs/voice/voice_data.js`) with portable Python generation scripts (`gen_voice.py`, `compress_voice.py`) | Should Have |
| FR-042 | Support dual-layer ambient soundscapes (`amb1` + `amb2`) with independent volume sliders in both Settings and the Quick Sound Popover (`#qs-vol-amb2`) | Must Have |
