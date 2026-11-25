# Domain Analysis: Pranayama & Evidence-Based Breathwork Protocols

**Document Type:** Business Domain Analysis
**Version:** 3.0
**Date:** 2026-11-25
**Purpose:** Physiological and functional foundation for the guided breathwork web application

---

## 1. Domain Overview

The application supports 11 core evidence-based breathwork protocols, a 7-Day Guided Journey, Apnea Tables, Multi-Phase Routines, BOLT CO₂ Tolerance testing, and BLE Heart Rate / HRV Diving-Reflex biofeedback:

1. **Pranayama / Wim Hof Method (WHM)** & **Quick Energize** — Rhythmic hyperventilation followed by empty-lung breath retention (`HOLD`) and recovery breath (`RECOVERY_HOLD`).
2. **Kapalabhati (Breath of Fire)** — Rapid `1.0 Hz` active abdominal pump exhales (`0.4s` crisp exhale + `0.6s` passive recoil inhale) followed by retention and recovery.
3. **Bhramari (Humming Bee)** — Calm `4s` nasal inhale followed by `8s` resonant humming exhale (`136.1 Hz` pitch guide) to elevate paranasal nitric oxide and vagal tone.
4. **Coherent (Resonance) Breathing (`coherent`)** — Continuous `5.5s` inhale / `5.5s` exhale (`~5.5 breaths/min`) maximizing HRV and baroreflex resonance.
5. **Physiological Sigh (`physio_sigh`)** — Two-stage double inhale (`68%` primary + `32%` top-off sip) + `6.5s` smooth exhale.
6. **Nadi Shodhana (`nadi_shodhana`)** — Alternate nostril `4-4-4` cycle with visual + stereo L/R audio cues for eyes-closed practice.
7. **Box Breathing (`box`), 4-7-8 (`fourSevenEight`), A52 (`a52`), Sleep Wind-Down (`sleep_winddown`)** — Structured cadence protocols (`0–30s` configurable holds/pauses).
8. **BOLT Score & BLE Autonomic Biofeedback** — Resting exhale CO₂ tolerance grading paired with live BLE `0x180D` BPM, RMSSD HRV, and Mammalian Diving Reflex bradycardia tracking during holds.

---

## 2. Protocol Reference Matrix

| Protocol | Inhale | Top Pause | Exhale | Bottom Pause | Retention Hold | Mechanic (`breathStyle`) |
|---|---|---|---|---|---|---|
| **Pranayama** | `1.5s` | `0s` | `1.5s` | `0s` | `60s` (+`15s`/round) | `standard` |
| **Quick Energize** | `1.2s` | `0s` | `1.2s` | `0s` | `45s` (+`15s`/round) | `standard` |
| **Kapalabhati** | `0.6s` | `0s` | `0.4s` | `0s` | `45s` (+`15s`/round) | `kapalabhati` |
| **Bhramari** | `4.0s` | `0s` | `8.0s` | `1.0s` | `0s` | `bhramari` |
| **Box Breathing** | `4.0s` | `4.0s` | `4.0s` | `4.0s` | `0s` | `standard` |
| **4-7-8 Relax** | `4.0s` | `7.0s` | `8.0s` | `0s` | `0s` | `standard` |
| **A52 Cadence** | `5.0s` | `0s` | `5.0s` | `2.0s` | `0s` | `standard` |
| **Sleep Wind-Down** | `4.0s` | `0s` | `8.0s` | `2.0s` | `0s` (`slowdown`) | `standard` |
| **Coherent Breathing** | `5.5s` | `0s` | `5.5s` | `0s` | `0s` | `standard` |
| **Physiological Sigh** | `3.5s` | `0s` | `6.5s` | `1.0s` | `0s` | `doubleInhale` |
| **Nadi Shodhana** | `4.0s` | `4.0s` | `4.0s` | `0s` | `0s` | `alternateNostril` |

---

## 3. Adaptive Hold Target & BOLT Calibration

- **Fixed Mode (`holdMode: 'fixed'`)**: `holdStartTime + (round - 1) * holdIncrement`.
- **Adaptive Mode (`holdMode: 'adaptive'`)**: Evaluated independently of prior `0s` preset values. Takes `baseline = max(recentBest(5), clamp(round(latestBolt * 2.2), 30, 240))`; final round aims at `baseline + 5s`, starting Round 1 at `70%` and scaling linearly across rounds (or `max(30, holdStartTime)` if no baseline exists).

---

## 4. Safety Considerations

- Mandatory first-run safety modal and persistent footer warning (seated/lying only; never near water or driving).
- Guarded `Finish & Save` prevents accidental empty logs while allowing graceful early exit after meaningful effort (`≥1` hold, `round > 1`, active hold `≥1s`, or `≥5` breaths).
- `BOLT_PREP` locks premature start clicks while preserving `Escape`/`Reset` abort and spoken breath pacing.
