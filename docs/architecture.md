# Pranayama Breathing Exercise — Software Architecture

**Version:** 1.0
**Date:** 2026-03-15
**Type:** Single-file web application (HTML + embedded CSS + JavaScript)
**Dependencies:** None (pure vanilla, no frameworks, no external assets)

---

## 1. Overview

The application uses a state-machine-driven architecture. All code resides in a single `.html` file organized into IIFE modules on a global `App` namespace.

```
+-----------------------------------------------------+
|                    index.html                         |
|                                                       |
|  +----------+  +--------------+  +---------------+   |
|  |  Config   |  |    Session   |  |    Timer      |   |
|  |  Module   |--|   (State     |--|    Engine     |   |
|  |           |  |   Machine)   |  |               |   |
|  +----------+  +------+-------+  +---------------+   |
|                        |                              |
|         +--------------+-------------+                |
|         |              |             |                |
|  +------v-----+ +------v------+ +---v------------+   |
|  |   UI /     | |   Audio     | |    Events      |   |
|  | Animation  | | Controller  | |   (DOM wiring) |   |
|  | Controller | | (Web Audio) | |                |   |
|  +------------+ +-------------+ +----------------+   |
+-----------------------------------------------------+
```

---

## 2. State Machine Design

### 2.1 States

| State | Description | Exit Condition |
|-------|-------------|----------------|
| `IDLE` | Waiting for START | User clicks Start |
| `BREATHING_IN` | Inhale of power breath | inhaleDuration elapsed |
| `BREATHING_OUT` | Exhale of power breath | exhaleDuration elapsed |
| `HOLD` | Breath retention after final exhale | User tap/click/Space |
| `RECOVERY_IN` | Deep recovery inhale | 3s elapsed |
| `RECOVERY_HOLD` | Hold recovery breath | 15s elapsed |
| `RECOVERY_OUT` | Recovery exhale | 3s elapsed |
| `ROUND_COMPLETE` | Brief pause, round summary | 3s auto-advance |
| `SESSION_COMPLETE` | All rounds finished | User clicks Reset |

### 2.2 Transition Diagram

```
IDLE --> BREATHING_IN (start)
BREATHING_IN --> BREATHING_OUT (inhale timer)
BREATHING_OUT --> BREATHING_IN (exhale timer, breath < max)
BREATHING_OUT --> HOLD (exhale timer, breath == max)
HOLD --> RECOVERY_IN (user tap)
RECOVERY_IN --> RECOVERY_HOLD (3s)
RECOVERY_HOLD --> RECOVERY_OUT (15s)
RECOVERY_OUT --> ROUND_COMPLETE (3s, round < total)
RECOVERY_OUT --> SESSION_COMPLETE (3s, round == total)
ROUND_COMPLETE --> BREATHING_IN (3s, next round)
SESSION_COMPLETE --> IDLE (reset)
```

### 2.3 Implementation

Central `transition(newState)` function:
```javascript
function transition(newState) {
    state = newState;
    App.UI.render(newState);
    App.Events.emit('stateChange', {state: newState});
}
```

---

## 3. Module Structure

### 3.1 App.Config
- Manages all user-configurable parameters with defaults and validation
- Reads from / writes to DOM input elements
- Persists to `localStorage`
- `getHoldTarget(round)`: computes `startHold + (round-1) * increment`

### 3.2 App.Session (State Machine)
- Central orchestrator owning session state
- Drives transitions, coordinates Timer, UI, and Audio
- State: `state`, `currentRound`, `breathCount`, `holdAchieved`
- Methods: `start()`, `reset()`, `endHold()`, phase begin functions

### 3.3 App.Timer
- `requestAnimationFrame` loop with `performance.now()` delta
- `startPhase(durationMs, onExpire, onTick)`: fixed-duration with callback
- `startPhase(null, null, onTick)`: free-running for HOLD phase
- `stop()`: cancels current timer

### 3.4 App.UI
- All DOM manipulation, CSS class toggling, counter/timer text updates
- `render(state)`: master dispatch by state, updates circle scale/color, shows/hides elements
- `updateHoldTimer(secs, target)`: updates hold display
- `updateRecoveryCountdown(rem)`: updates recovery countdown
- `showRoundSummary(summary)`: displays round completion data

### 3.5 App.Audio
- Web Audio API with short-lived `OscillatorNode` + `GainNode`
- `AudioContext` created on first START click (browser autoplay policy)
- `beep(freq, dur, time, vol)`: general-purpose tone generator
- Semantic methods: `playHoldStart()`, `playHoldEnd()`, `playSessionComplete()`

### 3.6 App.Events
- Simple pub/sub event bus: `on(event, fn)`, `off(event, fn)`, `emit(event, data)`
- Decouples modules

---

## 4. Data Model

### Session Configuration (persisted to localStorage)
```javascript
{
    breathsPerRound: 30,
    holdStartTime: 60,      // seconds, round 1
    holdIncrement: 15,       // seconds added per round
    rounds: 3,
    inhaleDuration: 2,       // seconds
    exhaleDuration: 3        // seconds
}
```

### Session State (in-memory)
```javascript
{
    state: 'IDLE',
    currentRound: 0,         // 1-based during session
    breathCount: 0,          // current breath in round
    holdAchieved: 0          // actual hold time in seconds
}
```

---

## 5. Timing Strategy

- `requestAnimationFrame` with `performance.now()` provides sub-millisecond precision
- Fixed-duration phases: compare elapsed vs target, fire `onExpire` when reached
- Free-running phase (HOLD): no auto-expire, `onTick` updates display every frame
- No drift accumulation: each phase captures fresh start timestamp
- Background tab: rAF pauses (intentional — exercise needs attention), `performance.now()` still accurate on resume

---

## 6. Audio Strategy

- `AudioContext` lazy-created on first user gesture (START click)
- Each sound: `OscillatorNode` → per-beep `GainNode` → `destination`
- Linear gain ramps for click-free attack/release envelopes

| Cue | Frequency | Duration | Pattern |
|-----|-----------|----------|---------|
| Hold start | 800 Hz | 120ms | Double beep, 220ms gap |
| Hold end | 600 Hz | 120ms | Triple beep, 220ms gap |
| Recovery hold end | 400 Hz | 350ms | Single tone |
| Session complete | 523/659/784 Hz | 200/200/400ms | Ascending triad |

---

## 7. Animation Strategy

CSS transitions with dynamic duration via custom property:

```css
.circle-wrapper {
    transition: transform var(--phase-duration) ease-in-out;
}
```

JavaScript sets `--phase-duration` before toggling scale class:
```javascript
css('--phase-duration', config.inhaleDuration + 's');
setScale('scale-inhale');
```

Hold phase uses a CSS keyframe glow pulse (decorative, loops).
Idle phase uses a CSS keyframe scale pulse.

---

## 8. HTML Structure

```html
<body>
  <div id="disclaimer-overlay">   <!-- Safety modal, shown once -->
  <header id="settings-panel">    <!-- Sticky settings bar -->
  <main id="main">                <!-- Center breathing area -->
    <div id="round-indicator">
    <div class="circle-container">
      <div class="circle-glow">   <!-- Blurred background glow -->
      <div class="circle-wrapper"> <!-- Animated scale target -->
        <svg>                      <!-- Track + ring circles -->
        <div class="circle-content"> <!-- Counter/label/timer -->
      </div>
    </div>
  </main>
  <footer id="safety-footer">     <!-- Fixed safety reminder -->
  <script>                         <!-- All JS modules -->
</body>
```

---

## 9. Error Handling

| Scenario | Handling |
|----------|---------|
| AudioContext creation fails | Continue silently without audio |
| AudioContext suspended | Call `resume()` on user gesture |
| Invalid config value | Clamp to valid range |
| localStorage unavailable | Fall back to in-memory defaults |

---

## 10. Accessibility

- Keyboard: Space = start/end hold, Escape = stop
- ARIA live region on phase label for screen reader announcements
- `prefers-reduced-motion`: disables all CSS transitions/animations
- Color contrast: all text meets WCAG AA (4.5:1 minimum)
