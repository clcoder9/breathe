# Domain Analysis: Pranayama Breathing Technique (WHM)

**Document Type:** Business Domain Analysis
**Date:** 2026-03-15
**Purpose:** Foundation for building a guided WHM breathing exercise web application

---

## 1. Domain Overview

The Pranayama Method (WHM) is a structured breathwork practice developed by Dutch athlete Pranayama. It combines a specific hyperventilation-and-retention breathing protocol with cold exposure and mindset training. This application covers only the **breathing exercise component**.

The core mechanism: controlled hyperventilation saturates the blood with oxygen and expels CO2. This shifts blood pH toward alkalinity (respiratory alkalosis), which temporarily suppresses the urge to breathe and enables unusually long breath holds. The recovery breath re-establishes normal gas exchange.

The protocol is organized into **rounds**. Each round consists of three sequential phases:

1. **Power Breath Phase** — a sequence of full, rhythmic inhale/exhale cycles
2. **Retention Phase** — a passive breath hold after the final exhale (lungs relatively empty)
3. **Recovery Phase** — a single deep inhale held briefly before releasing

After the recovery breath, the next round begins immediately.

---

## 2. Standard WHM Protocol (Reference Baseline)

| Parameter | Standard Value | Notes |
|---|---|---|
| Rounds per session | 3 rounds | Some practitioners do 4 |
| Power breaths per round | 30 to 40 breaths | Hof commonly uses 30 |
| Inhale style | Deep, full, through nose or mouth | Belly then chest |
| Exhale style | Passive, relaxed release | Not forced — just let go |
| Breath hold type | After exhale (empty retention) | Lungs not fully empty but not full |
| Round 1 hold duration | ~1:00 to 1:30 minutes | Increases per round |
| Round 2 hold duration | ~1:30 to 2:00 minutes | Typical increment +30s |
| Round 3 hold duration | ~2:00 to 2:30 minutes | Experienced: 3+ minutes |
| Recovery breath inhale | One deep inhale, hold 15 seconds | Squeeze up from belly |
| Recovery breath exhale | Full release | Round ends here |

The breath hold always occurs **after an exhale**, not after an inhale.

---

## 3. Domain Actors

### Primary Actor: Practitioner (User)
- Performs the WHM breathing session
- Requires audio and visual guidance to maintain rhythm
- Needs a visible seconds counter during breath holds
- Must never be forced to continue a hold — the hold is voluntary

### Secondary Actor: Application (Guided Session System)
- Provides timed cues for inhale and exhale tempo
- Counts power breaths and signals when the hold phase begins
- Runs the breath hold timer with visible second count
- Sounds audio notifications at hold start and hold end
- Tracks round progress and manages transitions between rounds

---

## 4. Key Domain Entities

```
Session
  - totalRounds: integer
  - rounds: Round[]

Round
  - roundNumber: integer (1-based)
  - breathCount: integer (target power breaths)
  - holdDurationSeconds: integer (computed: startHold + (roundNumber - 1) * holdIncrement)
  - recoveryHoldSeconds: integer (fixed, typically 15)
  - status: NOT_STARTED | POWER_BREATHING | HOLDING | RECOVERING | COMPLETE

BreathCycle (within Power Breath Phase)
  - cycleNumber: integer (1-based, resets each round)
  - inhaleDurationSeconds: float
  - exhaleDurationSeconds: float
  - phase: INHALE | EXHALE

SessionConfig (user-defined before session start)
  - breathsPerRound: integer
  - inhaleDurationSeconds: float
  - exhaleDurationSeconds: float
  - startHoldSeconds: integer
  - holdIncrementSeconds: integer
  - totalRounds: integer
  - recoveryHoldSeconds: integer
```

---

## 5. Configurable Parameters

| Parameter | Type | Range | Default |
|---|---|---|---|
| `breathsPerRound` | Integer | 20 to 40 | 30 |
| `inhaleDurationSeconds` | Float | 1.5 to 3.0 | 2.0 |
| `exhaleDurationSeconds` | Float | 1.5 to 3.0 | 2.0 |
| `startHoldSeconds` | Integer | 30 to 120 | 60 |
| `holdIncrementSeconds` | Integer | 0 to 30 | 15 |
| `totalRounds` | Integer | 1 to 5 | 3 |
| `recoveryHoldSeconds` | Integer | 10 to 20 | 15 |

Hold duration formula:
```
holdDuration(round) = startHoldSeconds + (round - 1) * holdIncrementSeconds
```

---

## 6. Process Flow

### State Transition Diagram

```
IDLE
  --> (user presses Start) --> POWER_BREATHING[round=1, breath=1, phase=INHALE]

POWER_BREATHING[phase=INHALE]
  --> (inhale timer expires) --> POWER_BREATHING[phase=EXHALE]

POWER_BREATHING[phase=EXHALE]
  --> (exhale timer expires AND breath < breathsPerRound) --> POWER_BREATHING[phase=INHALE, breath+1]
  --> (exhale timer expires AND breath == breathsPerRound) --> HOLDING

HOLDING
  --> (user ends hold) --> RECOVERING

RECOVERING
  --> (recovery complete AND round < totalRounds) --> POWER_BREATHING[round+1, breath=1]
  --> (recovery complete AND round == totalRounds) --> COMPLETE

COMPLETE
  --> (user restarts) --> IDLE
```

---

## 7. Audio Cue Requirements

| Event | Cue Type | Purpose |
|---|---|---|
| Hold phase begins | Double beep (800 Hz) | Signals user to stop breathing |
| Hold phase ends | Triple beep (600 Hz) | Signals recovery inhale |
| Session complete | Ascending triad | Nice-to-have |

Audio generated via Web Audio API (OscillatorNode) to keep app self-contained.

---

## 8. Safety Considerations

| Risk | Application Response |
|---|---|
| Loss of consciousness | Display safety warning. Always practice seated or lying down, never near water |
| Forced breath hold | Never prevent user from ending hold early. Provide visible exit interaction |
| Pre-existing conditions | Static disclaimer recommending medical consultation |

---

## 9. Glossary

| Term | Definition |
|---|---|
| Power breath | One inhale/exhale cycle during the hyperventilation phase |
| Retention / Breath hold | Period after final exhale where breathing stops |
| Empty retention | Breath hold after exhale (WHM hold type) |
| Recovery breath | Single deep inhale taken after hold; held briefly |
| Round | One complete cycle: power breaths + hold + recovery breath |
| Hold increment | Additional seconds added to target hold per round |
| WHM | Pranayama Method |
