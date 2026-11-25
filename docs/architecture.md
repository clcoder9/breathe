# Pranayama Breathing Exercise — Software Architecture

**Version:** 3.0
**Date:** 2026-11-25
**Type:** Single-file Progressive Web Application (HTML + embedded CSS + JavaScript + Service Worker)
**Dependencies:** Local `three.module.min.js` (3D liquid-metal sphere) & `docs/voice/voice_data.js` (20 offline neural TTS clips); zero external network runtime dependencies.

---

## 1. Overview

The application uses a state-machine-driven architecture contained in a single `index.html` file organized into IIFE modules on a global `App` namespace, backed by an offline-first Service Worker (`sw.js` — `pranayama-v30`).

```
+-----------------------------------------------------------------------------+
|                                 index.html                                  |
|                                                                             |
|  +-------------+  +---------------+  +---------------+  +----------------+  |
|  | App.Config  |  |  App.Presets  |  | App.Routines  |  | App.Favorites  |  |
|  | & Validation|--| (20 Built-in  |--| (2-6 Stage    |--| (4 Pinned Home |  |
|  +------+------+  |  & Custom)    |  |  Sequencer)   |  |  Chips)        |  |
|         |         +-------+-------+  +-------+-------+  +--------+-------+  |
|         +-----------------+------------------+-------------------+          |
|                                     |                                       |
|                            +--------v--------+                              |
|                            |   App.Session   |                              |
|                            | (17-State FSM)  |                              |
|                            +--------+--------+                              |
|                                     |                                       |
|   +------------+------------+-------+-----+---------------+--------------+  |
|   |            |            |             |               |              |  |
| +-v--------+ +-v--------+ +-v-----------+ +-v----------+ +v------------+ +v-+
| |App.Timer | | App.UI   | |App.Audio /  | |App.Liquid  | |App.Biofeed- | |S |
| |(rAF+tOut)| |& Palettes| |Pacer/Voice/ | |(Three.js   | |back (BLE    | |t |
| |          | |& Dialog  | |Ambience     | | throttled) | | 0x180D/2A37)| |a |
| +----------+ +----------+ +-------------+ +------------+ +-------------+ |ts|
+-----------------------------------------------------------------------------+
```

---

## 2. State Machine Design

### 2.1 States (17 Total)

| State | Description | Exit Condition |
|-------|-------------|----------------|
| `IDLE` | Waiting for START or BOLT test; shows pinned favorite chips | User clicks Start or Measure BOLT |
| `GET_READY` | Countdown before Round 1 (`3s`) | Countdown elapsed |
| `BREATHING_IN` | Inhale phase (`standard`, `doubleInhale`, `alternateNostril`, `kapalabhati`, `bhramari`) | `inhaleDuration` elapsed, `Hold Now`, or `Finish & Save` |
| `PAUSE_AFTER_INHALE` | Top hold (`0–30s`) | `pauseAfterInhale` elapsed or `Hold Now` |
| `BREATHING_OUT` | Exhale phase (standard, nostril-panned, Kapalabhati pump, or Bhramari 136.1 Hz hum) | `exhaleDuration` elapsed or `Hold Now` |
| `PAUSE_AFTER_EXHALE` | Bottom pause (`0–30s`) | `pauseAfterExhale` elapsed or `Hold Now` |
| `HOLD` | Breath retention after final exhale (or early `Hold Now`) | User tap/click/Space, or `Finish & Save` |
| `RECOVERY_IN` | Deep recovery inhale (`3s`) | `3s` elapsed |
| `RECOVERY_HOLD` | Hold recovery breath (`5–60s`) with live SVG ring countdown | Configured duration elapsed |
| `RECOVERY_OUT` | Recovery exhale (`3s`) | `3s` elapsed |
| `ROUND_COMPLETE` | Brief pause & round summary (`3s`) | Auto-advance |
| `STAGE_TRANSITION` | Calm singing-bowl bridge (`3–10s`) between Multi-Phase Routine stages | Bridge elapsed |
| `SESSION_COMPLETE` | Session finished (full or via `Finish & Save`) | Victory modal shown; Reset returns to `IDLE` |
| `PAUSED` | Suspended active phase; preserves marked urge, elapsed hold, and stops active pacer audio | `Resume` or `Finish & Save` |
| `SLEEPING` | Gentle post-session sleep wind-down | User clicks End Sleep |
| `BOLT_PREP` | Guided `8s` normal inhale/exhale with voice cues before BOLT hold (`PREPARING…` lock) | `8s` elapsed |
| `BOLT_HOLD` | Count-up CO₂ tolerance hold until first definite urge to breathe | User tap/click/Space |

---

## 3. Module Structure

### 3.1 `App.ModalFocus` & `App.ConfirmDialog`
- **`App.ModalFocus`**: Traps `Tab` / `Shift+Tab` inside visible overlays (`Stats`, `Victory`, `BOLT`) and restores previous focus on close.
- **`App.ConfirmDialog`**: Uses native `<dialog id="app-confirm-dialog">` (`showModal()`, `method="dialog"`, `returnValue` reset) for delete confirmations and `Merge` vs. `Replace` backup imports.

### 3.2 `App.Config` & `App.Theme`
- Manages 31 parameters with range clamping (`inhale/exhale 0.3–15s`, `pauses 0–30s`, `holdStart 0–600s`, `holdIncrement 0–120s`, `palette`, etc.) in `whm_config`.
- `getHoldTarget(round)`: Evaluates `holdMode === 'adaptive'` first so BOLT calibration works regardless of previous preset (`0s` holds), combining `App.History.recentBest(5)` and `App.Bolt.getLatest()`.
- `App.Theme`: Manages `dark | light | oled` display modes (`prefers-color-scheme` live listener + Night OLED) orthogonally from 5 accent color palettes (`ocean`, `ember`, `forest`, `amethyst`, `monochrome`), syncing CSS tokens and `COLORS`.

### 3.3 `App.Presets`, `App.Favorites` & `App.Routines`
- **`App.Presets`**: 20 built-in presets (`pranayama`, `energize`, `box`, `fourSevenEight`, `a52`, `coherent`, `physio_sigh`, `nadi_shodhana`, `kapalabhati`, `bhramari`, `sleep_winddown`, `journey_d1..7`, `apnea_co2`, `apnea_o2`) + custom presets (`whm_custom_presets`).
- **`App.Favorites`**: Manages up to 4 pinned chips (`whm_favorites`, default `['pranayama', 'coherent', 'physio_sigh']`) rendered in `#favorite-chips-bar`.
- **`App.Routines`**: 3 signature routines (`r:morning_charge`, `r:deep_reset`, `r:evening_slumber`) + custom 2–6 stage routines (`whm_routines`).

### 3.4 `App.Biofeedback`
- Connects via Web Bluetooth (`navigator.bluetooth.requestDevice` filtering service `heart_rate` `0x180D`, characteristic `heart_rate_measurement` `0x2A37`).
- `parseHeartRate(dataView)` decodes 8-bit/16-bit BPM and `1/1024s` RR-intervals; `ingestPacket()` filters ectopic/motion artifacts (`300–2200ms`, `<28%` jump), tracks rolling RMSSD (ms), RSA Coherence (`%`), and Diving-Reflex hold drops (`maxHoldDrop`), unlocking `bio_diver` at `≥10 BPM` drop.

### 3.5 `App.History`, `App.Achievements`, `Stats`, Audio & Visuals
- **`App.History`**: Stores up to 200 sessions (`whm_history`), supports `deleteSession(ts)`, `clearAll()`, and Backup `version: 4` export/import (`merge` deduplicating by `ts`, or `replace`).
- **`Stats`**: Renders BOLT card + chart, KPI summary tiles, **52-week consistency SVG heatmap** (`buildHeatmap`), peak hold/urge chart, round averages, protocol-filtered & paginated sticky-header history table, 7-Day Journey tracker, and 15 achievement badges.
- **`App.Audio` / `App.Pacer` / `App.Voice` / `App.Ambience`**: Stereo-panned ticks & pacer (`StereoPannerNode`), `playPump()`, `playHum(136.1 Hz)`, `App.Pacer.stop()`, 20 embedded `en-US-JennyNeural` clips + `SpeechSynthesis` fallback, post-SW audio cache warming (`earlyFetch(true)`), and non-destructive preview ducking.
- **`App.Liquid`**: Three.js WebGL sphere throttled to ~24fps in `IDLE`/`SESSION_COMPLETE` and paused behind open modals.
