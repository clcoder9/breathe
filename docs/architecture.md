# Pranayama Breathing Exercise — Software Architecture

**Version:** 2.5
**Date:** 2026-11-14
**Type:** Single-file Progressive Web Application (HTML + embedded CSS + JavaScript + Service Worker)
**Dependencies:** Local `three.module.min.js` (3D particle sphere) & `docs/voice/voice_data.js` (offline neural TTS clips); zero external network runtime dependencies.

---

## 1. Overview

The application uses a state-machine-driven architecture contained in a single `index.html` file organized into IIFE modules on a global `App` namespace, backed by an offline-first Service Worker (`sw.js` — `pranayama-v25`).

```
+-----------------------------------------------------------------------+
|                              index.html                               |
|                                                                       |
|  +-------------+  +---------------+  +------------+  +-------------+  |
|  | App.Config  |  |  App.Presets  |  |  App.Bolt  |  | App.History |  |
|  | (Settings & |--| (10 Built-in  |--| (CO2 Test  |--| & Stats /   |  |
|  |  Validation)|  |  & Custom)    |  |  & Tiers)  |  | Achievements|  |
|  +------+------+  +-------+-------+  +-----+------+  +------+------+  |
|         |                 |                |                |         |
|         +-----------------+--------+-------+----------------+         |
|                                    |                                  |
|                           +--------v--------+                         |
|                           |   App.Session   |                         |
|                           | (14-State FSM)  |                         |
|                           +--------+--------+                         |
|                                    |                                  |
|     +---------------+--------------+--------------+---------------+   |
|     |               |              |              |               |   |
| +---v--------+ +----v-----+ +------v------+ +-----v------+ +------v-+ |
| | App.Timer  | |  App.UI  | |  App.Audio  | | App.Liquid | |App.Wake| |
| | (rAF loop) | |  & Scene | | Pacer/Voice | | (3D Three/ | |  Lock  | |
| |            | |          | |  /Ambience  | |  WebGL)    | |        | |
| +------------+ +----------+ +-------------+ +------------+ +--------+ |
+-----------------------------------------------------------------------+
```

---

## 2. State Machine Design

### 2.1 States (14 Total)

| State | Description | Exit Condition |
|-------|-------------|----------------|
| `IDLE` | Waiting for START or BOLT test | User clicks Start or Measure BOLT |
| `PREPARE` | Optional countdown before Round 1 (`prepareDuration`) | Countdown elapsed |
| `BREATHING_IN` | Inhale phase (Standard, 2-stage Double Inhale, or Alternate Nostril) | `inhaleDuration` elapsed, Flow release, `Hold Now`, or `Finish & Save` |
| `PAUSE_AFTER_INHALE` | Box/4-7-8/Nadi Shodhana top hold | `pauseAfterInhale` elapsed or `Hold Now` |
| `BREATHING_OUT` | Exhale phase | `exhaleDuration` elapsed, Flow release, or `Hold Now` |
| `PAUSE_AFTER_EXHALE` | Bottom pause between breaths | `pauseAfterExhale` elapsed or `Hold Now` |
| `HOLD` | Breath retention after final exhale (or early `Hold Now`) | User tap/click/Space, or auto-expire in Box mode |
| `RECOVERY_IN` | Deep recovery inhale | 3s elapsed |
| `RECOVERY_HOLD` | Hold recovery breath (`recoveryHoldDuration`) | Configured duration elapsed |
| `RECOVERY_OUT` | Recovery exhale | 3s elapsed |
| `ROUND_COMPLETE` | Brief pause & round summary | 3s auto-advance |
| `SESSION_COMPLETE` | Session finished (full or via `Finish & Save`) | Victory modal shown; Reset returns to `IDLE` |
| `SLEEPING` | Gentle post-session sleep wind-down | User clicks/taps to wake |
| `BOLT_PREP` | Guided 8-second normal inhale/exhale before BOLT hold | 8s elapsed |
| `BOLT_HOLD` | Count-up CO₂ tolerance hold until first definite urge to breathe | User tap/click/Space |

---

## 3. Module Structure

### 3.1 `App.Events`
- Lightweight pub/sub bus (`on`, `off`, `emit`) decoupling state transitions from UI/audio reactions.

### 3.2 `App.Config`
- Manages 30+ user-configurable parameters with range clamping and `localStorage` persistence (`whm_config`).
- Supports `breathsPerRound`, `holdStartTime`, `holdIncrement`, `holdMode` (`fixed` | `adaptive`), `rounds`, `inhaleDuration` (`0.5–15s`), `exhaleDuration` (`0.5–15s`), `pauseAfterInhale`, `pauseAfterExhale`, `recoveryHoldDuration`, `prepareDuration`, `breathStyle` (`standard` | `doubleInhale` | `alternateNostril`), audio/ambience mixes, and visual theme settings.
- `getHoldTarget(round)`: computes target hold per round. In `adaptive` mode, combines `App.History.recentBest(5)` and `App.Bolt.latest()` (`Math.round(boltScore * 2.2)`) to calibrate Round 1 at 80% of baseline with +15% per subsequent round.

### 3.3 `App.Presets`
- Built-in protocols:
  - `standard` (Standard Pranayama)
  - `beginner` (Gentle Start)
  - `deep` (Deep Retention)
  - `energize` (Quick Energize)
  - `box` (Box Breathing 4-4-4-4)
  - `relax478` (4-7-8 Relax)
  - `sleep` (Sleep Wind-Down)
  - `coherent` (Coherent Breathing 5.5s / 5.5s Resonance)
  - `physio_sigh` (Physiological Sigh — 2-stage `doubleInhale` + long exhale)
  - `nadi_shodhana` (Nadi Shodhana — `alternateNostril` 4-4-4 cycle)
  - `custom` (User-saved configurations)

### 3.4 `App.Bolt`
- Manages BOLT (Body Oxygen Level Test) CO₂ tolerance score history in `localStorage` (`whm_bolt_history`).
- Methods: `load()`, `record(scoreSec)`, `latest()`, `best()`, `getTier(score)`, `replaceAll(arr)`.
- Tiers: `<15s` Developing, `15–24s` Functional, `25–39s` Advanced, `40s+` Elite.

### 3.5 `App.History` & `App.Achievements` & `Stats`
- Stores completed sessions in `whm_history` (up to 200 entries), tracking `rounds`, `holds`, `roundTargets`, `totalBreaths`, `preset`, and `feeling`.
- Export/Import JSON backup (`version: 3`) bundles `history`, `config`, `customPreset`, `favorites`, and `boltHistory`.
- Renders the Statistics modal: summary KPIs, 52-week consistency heatmap, 7-day Guided Journey tracker, 10 achievement badges, BOLT score progression chart, and recent session hold chart.

### 3.6 `App.Timer`
- `requestAnimationFrame` loop using `performance.now()` deltas with pause/resume support (`pause()`, `resume()`, `isPaused()`).

### 3.7 `App.Audio`, `App.Pacer`, `App.Voice`, `App.Ambience`, `App.Haptics`
- **`App.Audio`**: Web Audio API singing-bowl synthesizer with harmonic partials, singing-bowl resonance, and milestone chimes.
- **`App.Pacer`**: Filtered pink-noise breath pacer (`playInhale`, `playExhale`, `playSip` for 2-stage Physiological Sigh).
- **`App.Voice`**: Offline neural TTS playback via `VOICE_CLIPS` base64 MP3 map with Web Speech API fallback.
- **`App.Ambience`**: Dual-layer soundscape engine mixing procedural Web Audio generators (`drone`, `binaural`, `brown`, `wind`) and streamed/cached MP3 nature/music loops (`amb1` + `amb2`).

### 3.8 `App.Liquid` & `App.Scene`
- **`App.Liquid`**: Three.js 3D particle sphere (`three.module.min.js`) with custom vertex/fragment shaders and Fibonacci sphere distribution that morphs with breathing phases, hold turbulence, and audio reactivity.
- **`App.Scene`**: Procedural Canvas2D background renderer (`aurora`, `stars`, `ripples`, `geometry`, `fireflies`, `mist`).

### 3.9 `App.Session`
- Central state machine orchestrating breathing rounds, Flow Mode (hold-to-inhale, release-to-exhale), `holdNow()` (early transition from breathing to retention), `finishAndSave()` (early session completion saving completed rounds/holds), and `startBolt()` / `endBolt()` (guided CO₂ tolerance test).
- Preserves exact per-round hold targets in `roundTargets[]` so post-session Victory analytics match in-session targets even after `App.History.record()` updates adaptive baselines.

### 3.10 `App.UI`
- Master DOM & SVG renderer (`render(state)`), handling the SVG progress ring (`stroke-dashoffset`), 2-stage Physiological Sigh progress (`INHALE 1/2` → `SIP IN 2/2`), Nadi Shodhana nostril indicator badge (`#nostril-indicator`) and directional SVG arc (`#nostril-arc`), Victory Modal (`showVictoryModal`), and BOLT Result Modal (`showBoltModal`).
