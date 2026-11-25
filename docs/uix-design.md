# UIX Design Specification
## Pranayama Breathing Exercise — Single-Page Web Application

**Version:** 3.0
**Date:** 2026-11-25

---

## 1. Design Principles

| Principle | Application |
|---|---|
| **Distraction-free** | Minimal chrome during active sessions; Zen mode hides top bar & footer |
| **Rhythm reinforcement** | The 3D liquid sphere (`App.Liquid`, GPU-throttled when idle) and SVG ring act as a unified visual metronome |
| **Legibility & Contrast** | `color-scheme` aware surfaces, WCAG 4.5:1 text / 3:1 UI boundaries, and Forced Colors support |
| **Protocol clarity** | Specialized cues for Physiological Sigh (`INHALE 1/2` → `SIP IN 2/2`), Nadi Shodhana (`#nostril-indicator` + `#nostril-arc` + L/R stereo audio), Kapalabhati (`PASSIVE IN` / `PUMP OUT`), and Bhramari (`HUM OUT`) |
| **Voluntary control** | Guarded `HOLD NOW`, `FINISH & SAVE`, `Pause/Resume` state restoration, and multi-phase `STAGE_TRANSITION` bridges |

---

## 2. Color Palettes & Display Modes

### Display Modes (`data-theme`)
- **Dark (Default)** (`#0A0E1A`), **Light** (`#F1F5F9`), and **Midnight OLED** (`#000000`), respecting `prefers-color-scheme` automatically unless overridden.

### Accent Palettes (`data-palette`)
- **Ocean (Default)**: Cyan `#22D3EE` / Teal `#0E7490` / Amber `#F59E0B`
- **Ember**: Coral `#FB923C` / Terracotta `#C2410C` / Gold `#FBBF24`
- **Forest**: Emerald `#34D399` / Deep Pine `#047857` / Amber `#FBBF24`
- **Amethyst**: Violet `#C084FC` / Indigo `#7E22CE` / Rose `#F472B6`
- **Monochrome**: Silver `#E2E8F0` / Slate `#64748B` high-contrast grayscale

---

## 3. Page Layout & Interactive Components

```
+-------------------------------------------------------------------+
|  TOP BAR: [Stats][🔥 Streak][♥ HR]   BREATHE   [🔊][🌗][⚙️]       |
+-------------------------------------------------------------------+
|  PINNED FAVORITE CHIPS (#favorite-chips-bar, Visible in IDLE)     |
|  [ ★ Pranayama ]  [ ★ Coherent Breathing ]  [ ★ Physio Sigh ]     |
+-------------------------------------------------------------------+
|            [ Stage 2/3 · Nadi Shodhana ] (#routine-stage-pill)    |
|                    Round 1 / 1   [ ◀ LEFT NOSTRIL ]               |
|                                                                   |
|              +-----------------------------+                      |
|              |   3D LIQUID SPHERE + SVG    |                      |
|              |   PROGRESS & NOSTRIL ARCS   |                      |
|              |      ♥ 58 BPM · -14 DR      |                      |
|              +-----------------------------+                      |
|                                                                   |
|                    [ HOLD NOW ] (#hold-now-btn)                   |
|         [ PAUSE ]   [ FINISH & SAVE ]   [ STOP ] (#action-bar)    |
+-------------------------------------------------------------------+
```

---

## 4. Settings Drawer Tabs (`Pattern`, `Holds`, `Routine`, `Audio`, `Ambience`, `Visuals`)
- Keyboard `ArrowLeft` / `ArrowRight` navigation across tabs; active tab marked with geometric `border-block-end: 2px solid var(--color-accent)` underline.
- **Routine Tab**: Select signature routines or build custom 2–6 stage chains with stage reorder (`↑`/`↓`), bridge duration (`3s`/`5s`/`10s`), Save, Pin, and Activate.
- **Native Confirmation Dialog (`<dialog id="app-confirm-dialog">`)**: Handles session/preset deletions and Backup v4 Merge vs. Replace prompts with `Esc` dismissal and scroll containment.

---

## 5. Keyboard Shortcuts

| Key | Context | Action |
|---|---|---|
| `Space` | `IDLE` / `HOLD` / `BOLT_HOLD` / Flow Mode | Start session, end retention hold, end BOLT test, or hold-to-inhale in Flow Mode (`ev.repeat` ignored; ignored during `BOLT_PREP`) |
| `P` | Active session / `PAUSED` | Toggle Pause / Resume |
| `H` | Active breathing phase (`holdTarget > 0`) | Trigger **`Hold Now`** |
| `F` | When `App.Session.canFinish()` is true | Trigger **`Finish & Save`** |
| `ArrowLeft` / `ArrowRight` | Focused Settings tab | Move between Settings categories |
| `Escape` | Active session / Open modal or drawer | Stop session or close topmost modal/drawer |
