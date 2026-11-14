# UIX Design Specification
## Pranayama Breathing Exercise — Single-Page Web Application

**Version:** 2.5
**Date:** 2026-11-14

---

## 1. Design Principles

| Principle | Application |
|-----------|-------------|
| **Distraction-free** | Minimal chrome during active sessions; settings drawer closes automatically |
| **Rhythm reinforcement** | The 3D particle sphere (`App.Liquid`) and SVG progress ring (`#circle-ring`) act as a unified visual metronome |
| **Legibility first** | Maximum contrast, tabular numerals, oversized phase and timer typography |
| **Protocol clarity** | Specialized visual indicators for 2-stage Physiological Sigh (`INHALE 1/2` → `SIP IN 2/2`) and Nadi Shodhana (`#nostril-indicator` badge + `#nostril-arc` directional SVG semicircle) |
| **Voluntary control** | Non-intrusive pill controls (`HOLD NOW`, `FINISH & SAVE`) empower practitioners to adapt sessions to their physiology |

---

## 2. Color Palette & Themes

### Theme Presets (`data-theme`)
- **Ocean (Default)**: Cyan (`#22D3EE`) inhale, Deep Teal (`#0E7490`) exhale, Warm Amber (`#F59E0B`) hold, Soft Violet (`#A78BFA`) recovery, Emerald (`#34D399`) complete.
- **Ember**: Warm coral/gold tones for grounding sessions.
- **Forest**: Emerald/sage palette for restorative breathing.
- **Amethyst**: Violet/indigo palette for evening and meditation protocols.
- **Monochrome**: High-contrast grayscale for zero-distraction practice.
- **Midnight OLED**: Pure `#000000` background for dark-room and sleep wind-down sessions.

### Core Tokens
| Token | Default Hex | Usage |
|-------|-------------|-------|
| `--color-bg` | `#0A0E1A` | Deep navy background |
| `--color-accent` | `var(--color-inhale)` | Primary UI accent, active controls, chart legend |
| `--color-inhale` | `#22D3EE` | Inhale phase & BOLT hold ring |
| `--color-exhale` | `#0E7490` | Exhale phase |
| `--color-hold` | `#F59E0B` | Retention hold phase |
| `--color-recovery` | `#A78BFA` | Recovery breath & BOLT prep phase |
| `--color-complete` | `#34D399` | Session/round completion & target-reached badge |

---

## 3. Page Layout & Interactive Components

```
+-------------------------------------------------------------------+
|  TOP BAR: [Brand / Streak Pill]   [Quick Sound] [Stats] [Settings]|
+-------------------------------------------------------------------+
|  FAVORITE PRESET CHIPS (Visible in IDLE)                          |
+-------------------------------------------------------------------+
|                    Round 2 / 3   [FLOW / ADAPTIVE]                |
|               [ ◀ LEFT NOSTRIL ] (#nostril-indicator)             |
|                                                                   |
|              +-----------------------------+                      |
|              |   3D LIQUID SPHERE + SVG    |                      |
|              |   PROGRESS & NOSTRIL ARCS   |                      |
|              |           12 / 30           |                      |
|              |      INHALE 1/2 (1.4s)      |                      |
|              +-----------------------------+                      |
|                                                                   |
|                    [ HOLD NOW ] (#hold-now-btn)                   |
|              status message / instruction                         |
|                                                                   |
|         [ PAUSE ]   [ FINISH & SAVE ]   [ STOP ] (#action-bar)    |
+-------------------------------------------------------------------+
```

---

## 4. Protocol-Specific Visual Feedback

### 4.1 Physiological Sigh (`doubleInhale`)
- **Stage 1 (`0% – 68%` of `inhaleDuration`)**:
  - Label displays `INHALE 1/2`.
  - Circle smoothly expands from `0.65` to `0.76` scale.
  - SVG progress ring fills from `0%` to `68%`.
- **Stage 2 (`68% – 100%` of `inhaleDuration`)**:
  - At the `68%` threshold, `App.Pacer.playSip()` and a brief haptic pulse fire.
  - Label updates to `SIP IN 2/2`.
  - Circle expands briskly from `0.76` to `1.0` full scale while the SVG ring completes `68% → 100%`.

### 4.2 Nadi Shodhana (`alternateNostril`)
- **Pill Badge (`#nostril-indicator`)**: Positioned above the breathing circle:
  - Odd breaths: `◀ LEFT NOSTRIL` (inhale) → `◆ BOTH NOSTRILS CLOSED` (hold) → `RIGHT NOSTRIL ▶` (exhale).
  - Even breaths: `RIGHT NOSTRIL ▶` (inhale) → `◆ BOTH NOSTRILS CLOSED` (hold) → `◀ LEFT NOSTRIL` (exhale).
- **Directional Semicircle (`#nostril-arc`)**:
  - Highlights the active left (`rotate(90deg)`) or right (`rotate(-90deg)`) half of the SVG ring (`stroke-dasharray: 276.46 552.92`) during unilateral nostril phases.

### 4.3 Guided BOLT Assessment (`BOLT_PREP` & `BOLT_HOLD`)
- **`BOLT_PREP`**: Violet ring (`#A78BFA`), 8s countdown (`4s` normal inhale, `4s` normal exhale).
- **`BOLT_HOLD`**: Cyan ring (`#22D3EE`), count-up timer (`0:00`) with prompt `"Tap circle or press Space at FIRST urge to breathe"`.
- **`#bolt-overlay` Modal**: Displays score in seconds, tier badge (`Developing`, `Functional`, `Advanced`, `Elite`), physiological interpretation, and a 1-click **"Use Adaptive Hold Targets"** action button.

---

## 5. Keyboard Shortcuts & Accessibility

| Key | Context | Action |
|-----|---------|--------|
| `Space` | `IDLE` / `HOLD` / `BOLT_HOLD` / Flow Mode | Start session, end retention hold, end BOLT test, or hold-to-inhale in Flow Mode (`ev.repeat` ignored) |
| `P` | Active session / `PAUSED` | Toggle Pause / Resume |
| `H` | Active breathing phase (`holdTarget > 0`) | Trigger **`Hold Now`** (immediate retention phase) |
| `F` | `PAUSED` or after ≥1 completed round/hold | Trigger **`Finish & Save`** (complete session and open Victory Modal) |
| `Escape` | Active session / Open modal or drawer | Stop session or close topmost modal/drawer |
