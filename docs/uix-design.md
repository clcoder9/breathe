# UIX Design Specification
## Pranayama Breathing Exercise — Single-Page Web Application

**Version:** 1.0
**Date:** 2026-03-15

---

## 1. Design Principles

| Principle | Application |
|-----------|-------------|
| **Distraction-free** | Minimal chrome, dark background suppresses visual noise |
| **Rhythm reinforcement** | The breathing circle IS the metronome |
| **Legibility first** | Maximum contrast, oversized type for counters and labels |
| **Single focal point** | Breathing circle dominates; settings recede during session |
| **Calm progression** | Color transitions between phases are smooth, never jarring |

---

## 2. Color Palette

### Background & Surface

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#0A0E1A` | Page background (deep navy) |
| `--color-surface` | `#111827` | Settings panel background |
| `--color-surface-raised` | `#1F2937` | Input fields, cards |
| `--color-border` | `#374151` | Input borders, dividers |

### Phase Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-inhale` | `#22D3EE` | Circle during INHALE (bright cyan) |
| `--color-exhale` | `#0E7490` | Circle during EXHALE (darker teal) |
| `--color-hold` | `#F59E0B` | Circle + timer during HOLD (warm amber) |
| `--color-recovery` | `#A78BFA` | Circle during RECOVERY (soft violet) |
| `--color-complete` | `#34D399` | Completion state (emerald green) |
| `--color-idle` | `#64748B` | Idle state (slate) |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | `#F1F5F9` | Headings, display numbers |
| `--color-text-secondary` | `#94A3B8` | Settings labels, secondary text |
| `--color-text-muted` | `#475569` | Placeholder text, disabled state |

---

## 3. Typography

Font stack (system-safe, no external dependency):
```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| display-xl | 96px | 200 | Hold timer countdown |
| display-lg | 72px | 300 | Breath count ("12 / 30") |
| display-md | 48px | 400 | Phase label ("INHALE") |
| heading-lg | 28px | 600 | Round indicator |
| body | 16px | 400 | Settings labels |
| label-sm | 13px | 500 | Input labels |

Phase labels use letter-spacing: 0.15em (wide tracking for calm pacing).

---

## 4. Page Layout

```
+-------------------------------------------------------------------+
|  SETTINGS PANEL (sticky top, #111827)                              |
|  [Breaths] [Hold Start] [Hold Incr] [Rounds] [Inhale] [Exhale]   |
|                                          [START]  [RESET]         |
+-------------------------------------------------------------------+
|                                                                    |
|                    Round 2 / 3                                     |
|                                                                    |
|              +-------------------------+                           |
|              |    BREATHING CIRCLE     |                           |
|              |    (animated SVG ring)  |                           |
|              |                         |                           |
|              |       12 / 30           |  <- Breath Counter        |
|              |       INHALE            |  <- Phase Label           |
|              +-------------------------+                           |
|                                                                    |
|              [status message / instruction]                        |
+-------------------------------------------------------------------+
|  Safety footer (fixed bottom)                                      |
+-------------------------------------------------------------------+
```

---

## 5. Breathing Circle Specification

### Structure (SVG-based)
- Track ring: static background circle, stroke `#1F2937`
- Animated ring: stroke color transitions per phase
- Glow: blurred duplicate behind ring, `filter: blur(45px)`, 18% opacity
- Center content: counter, phase label, or timer depending on state

### Scale States
| State | Scale | Duration |
|-------|-------|----------|
| Idle | 0.85 (pulsing) | 3s loop |
| Inhale | 1.0 | inhale tempo |
| Exhale | 0.65 | exhale tempo |
| Hold | 0.65 (static) | — |
| Recovery In | 1.0 | 3s |
| Recovery Hold | 1.0 (static) | — |
| Recovery Out | 0.65 | 3s |
| Complete | 0.9 | — |

### Dimensions per Breakpoint
| Breakpoint | Circle Size |
|------------|-------------|
| Desktop (>= 1024px) | 320px |
| Tablet (640–1023px) | 280px |
| Mobile (< 640px) | 240px |

---

## 6. Animation Strategy

CSS `transform: scale()` with dynamic `--phase-duration` custom property:

```css
.circle-wrapper {
  transition: transform var(--phase-duration) ease-in-out;
}
```

JavaScript sets `--phase-duration` before toggling scale classes, ensuring animation duration always matches user's configured tempo.

### Hold Phase
Subtle glow pulse animation (2.5s loop) to indicate "alive" state while circle is static.

### Idle Phase
Slow ambient scale pulse between 0.82 and 0.88 (4s loop).

---

## 7. State-Based UI Changes

| State | Circle Color | Center Content | Round Indicator |
|-------|-------------|----------------|-----------------|
| IDLE | Slate (#64748B) | Title + subtitle | Hidden |
| BREATHING_IN | Cyan (#22D3EE) | Counter + "INHALE" | "Round N/M" |
| BREATHING_OUT | Teal (#0E7490) | Counter + "EXHALE" | "Round N/M" |
| HOLD | Amber (#F59E0B) | Timer + "HOLD" + tap prompt | "Round N/M" |
| RECOVERY_IN | Violet (#A78BFA) | "RECOVERY INHALE" | "Round N/M" |
| RECOVERY_HOLD | Violet (#A78BFA) | Countdown + "HOLD" | "Round N/M" |
| RECOVERY_OUT | Violet (#A78BFA) | "RECOVERY EXHALE" | "Round N/M" |
| ROUND_COMPLETE | Green (#34D399) | Round summary | Hidden |
| SESSION_COMPLETE | Green (#34D399) | "COMPLETE" + message | Hidden |

---

## 8. Responsive Behavior

| Breakpoint | Settings Layout | Circle | Typography Scale |
|------------|----------------|--------|-----------------|
| Mobile (<640px) | 3-column grid, stacked | 240px | Reduced via clamp() |
| Tablet (640-1023) | Flex wrap | 280px | Medium |
| Desktop (1024+) | Single horizontal row | 320px | Full |

---

## 9. Accessibility

- **ARIA live regions**: Phase label (`aria-live="polite"`), round indicator
- **Keyboard**: Space = start/end hold, Escape = stop, Tab through settings
- **Focus indicators**: 2px solid teal outline on all interactive elements
- **Color independence**: Phase changes communicated by text AND color
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all transitions/animations

---

## 10. Gradual Breathing Progress Indicator

### Mechanism
The existing SVG `.circle-ring` uses `stroke-dasharray` / `stroke-dashoffset` to show a progress arc that fills or drains during each breathing phase. The ring starts at 12 o'clock (`transform: rotate(-90deg)`).

### Behavior per Phase

| Phase | Ring Direction | Duration Source | Countdown |
|-------|---------------|-----------------|-----------|
| INHALE | Fills 0% → 100% | Configured inhale duration | Shows remaining seconds (e.g., "1.3s") |
| EXHALE | Drains 100% → 0% | Configured exhale duration | Shows remaining seconds |
| HOLD | Fills toward 100% | Hold target time | Existing hold timer |
| RECOVERY IN | Fills 0% → 100% | 3s fixed | None |
| RECOVERY OUT | Drains 100% → 0% | 3s fixed | None |
| IDLE / COMPLETE | Static (empty / full) | N/A | None |

### Visual Details
- **Circumference**: `2 × π × 88 = 552.92 px`
- **Animation driver**: `requestAnimationFrame` tick callbacks (not CSS animation), ensuring smooth sub-16ms updates synchronized with configured durations
- **Countdown text**: `#breath-time-remaining` element, styled at `0.82rem`, muted color, tabular-nums for stable digit widths
- **Color**: Ring inherits `--current-phase-color` (cyan for inhale, teal for exhale, amber for hold)
- **Reduced motion**: Ring progress remains functional (informational, not decorative); CSS transitions on stroke are disabled
