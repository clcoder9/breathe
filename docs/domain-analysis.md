# Domain Analysis: Pranayama & Evidence-Based Breathwork Protocols

**Document Type:** Business Domain Analysis
**Version:** 2.5
**Date:** 2026-11-14
**Purpose:** Physiological and functional foundation for the guided breathwork web application

---

## 1. Domain Overview

The application supports multiple evidence-based breathwork modalities across autonomic nervous system regulation, respiratory alkalosis/hypoxia training, and vagal tone stimulation:

1. **Pranayama / Wim Hof Method (WHM)** — Rhythmic hyperventilation followed by empty-lung breath retention (`HOLD`) and a 15-second recovery breath (`RECOVERY_HOLD`). Expels CO₂ to temporarily suppress the ventilatory drive and extend retention times.
2. **Coherent (Resonance) Breathing (`coherent`)** — Continuous `5.5s` inhale and `5.5s` exhale (`~5.5 breaths/min`) with no pauses or retention. Maximizes Heart Rate Variability (HRV) and baroreflex resonance.
3. **Physiological Sigh (`physio_sigh`)** — Two-stage double inhale through the nose (`68%` primary deep inhale into the belly/chest + `32%` sharp top-off sip at peak inflation to pop open collapsed alveoli) followed by an extended `6.5s` smooth exhale. Rapidly offloads CO₂ and down-regulates acute sympathetic arousal.
4. **Nadi Shodhana / Alternate Nostril Breathing (`nadi_shodhana`)** — Classical yogic pranayama alternating left and right nostrils (`Inhale Left → Hold Both → Exhale Right → Inhale Right → Hold Both → Exhale Left`) on a `4-4-4` cadence to balance hemispheric autonomic tone.
5. **Box Breathing (`box`) & 4-7-8 Relax (`relax478`)** — Structured cadence breathing with top/bottom pauses (`PAUSE_AFTER_INHALE`, `PAUSE_AFTER_EXHALE`) for focus and parasympathetic activation.
6. **BOLT Score (Body Oxygen Level Test)** — Functional CO₂ tolerance measurement taken after a normal, unforced exhale until the *first definite physical urge to breathe* (diaphragm contraction or swallow impulse).

---

## 2. Protocol Reference Matrix

| Protocol | Inhale | Top Pause | Exhale | Bottom Pause | Retention Hold | Mechanic (`breathStyle`) |
|---|---|---|---|---|---|---|
| **Standard WHM** | `2.0s` | `0s` | `2.0s` | `0s` | `60s` (+`15s`/round) | `standard` |
| **Gentle Start** | `2.5s` | `0s` | `2.5s` | `0s` | `30s` (+`10s`/round) | `standard` |
| **Deep Retention** | `2.5s` | `0s` | `2.5s` | `0s` | `90s` (+`30s`/round) | `standard` |
| **Quick Energize** | `1.5s` | `0s` | `1.5s` | `0s` | `45s` (+`15s`/round) | `standard` |
| **Box Breathing** | `4.0s` | `4.0s` | `4.0s` | `4.0s` | `0s` (in-cycle holds) | `standard` |
| **4-7-8 Relax** | `4.0s` | `7.0s` | `8.0s` | `0s` | `0s` (in-cycle hold) | `standard` |
| **Sleep Wind-Down** | `4.0s` | `2.0s` | `6.0s` | `2.0s` | `0s` | `standard` |
| **Coherent Breathing** | `5.5s` | `0s` | `5.5s` | `0s` | `0s` | `standard` |
| **Physiological Sigh** | `3.5s` (2-stage) | `0s` | `6.5s` | `1.0s` | `0s` | `doubleInhale` |
| **Nadi Shodhana** | `4.0s` | `4.0s` | `4.0s` | `0s` | `0s` | `alternateNostril` |

---

## 3. Hold Target Calculation & BOLT Calibration

### Fixed Hold Mode (`holdMode: 'fixed'`)
```
holdTarget(round) = holdStartTime + (round - 1) * holdIncrement
```

### Adaptive Hold Mode (`holdMode: 'adaptive'`)
Uses the higher of:
- `recentBest(5)`: maximum hold achieved across the last 5 sessions
- `boltBaseline`: `Math.round(latestBoltScore * 2.2)`

Round 1 starts at `80%` of the combined baseline (clamped to `[20s, 300s]`), and each subsequent round adds `15%` of the baseline:
```
baseline = max(recentBest(5), round(latestBoltScore * 2.2))
start = clamp(round(baseline * 0.8), 20, 300)
increment = max(5, round(baseline * 0.15))
holdTarget(round) = start + (round - 1) * increment
```

### BOLT Score Tiers
| BOLT Score | Tier | Physiological Interpretation & Adaptive Round 1 Target |
|---|---|---|
| `< 15s` | **Developing** | High chemoreceptor sensitivity to CO₂; start with gentle `20–30s` holds |
| `15 – 24s` | **Functional** | Everyday nasal breathing comfort; adaptive Round 1 holds `~30–45s` |
| `25 – 39s` | **Advanced** | Strong CO₂ tolerance and low breathlessness; adaptive Round 1 holds `~45–70s` |
| `40s+` | **Elite** | Exceptional respiratory efficiency and calm ventilatory response; adaptive Round 1 holds `70s+` |

---

## 4. Safety Considerations

| Risk | Application Response |
|---|---|
| Shallow-water blackout / loss of consciousness | Mandatory first-run safety disclaimer modal and persistent footer warning: practice only seated or lying down, never in or near water or while driving. |
| Forced breath counts or retention | Users can transition to retention early via **`HOLD NOW`** (`H`), end holds at any moment via tap/`Space`, or finish a multi-round session early via **`FINISH & SAVE`** (`F`) without losing progress. |
| BOLT vs. Maximum Hold confusion | `BOLT_PREP` and `BOLT_HOLD` explicitly instruct users to stop at the *first definite physical urge to breathe*, not a maximum willpower hold. |
