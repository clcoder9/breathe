# Pranayama Breathing Exercise — Requirements Analysis

**Document ID:** REQ-WHM-001
**Version:** 1.0
**Date:** 2026-03-15

---

## 1. Project Overview

### Purpose
A client-side, single-file HTML application that guides users through the Pranayama Method (WHM) breathing technique with configurable parameters, visual animation, and audio cues.

### Goals
- G-01: Deliver a zero-dependency, single HTML file that runs offline in any modern browser
- G-02: Guide users through configurable WHM breathing sessions with visual and audio cues
- G-03: Provide a distraction-free, calming dark-themed UI
- G-04: Allow full customization of session parameters

### Out of Scope
- User accounts, profiles, or session history
- Backend services or APIs
- Mobile native application packaging
- Medical advice or biometric input

---

## 2. Functional Requirements

### 2.1 Session Configuration

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Settings panel where user configures all session parameters before starting | Must Have |
| FR-002 | Configure total number of rounds (1–10) | Must Have |
| FR-003 | Configure breaths per round (10–60) | Must Have |
| FR-004 | Configure breath hold start time in seconds (10–300) | Must Have |
| FR-005 | Configure breath hold increment per round (0–60) | Must Have |
| FR-006 | Configure inhale duration in seconds (1.0–6.0) | Must Have |
| FR-007 | Configure exhale duration in seconds (1.0–6.0) | Must Have |
| FR-008 | Display default values on first load | Must Have |
| FR-009 | Validate inputs and prevent start if invalid | Must Have |

### 2.2 Session Control

| ID | Requirement | Priority |
|---|---|---|
| FR-010 | START button begins a configured session | Must Have |
| FR-011 | RESET button terminates session and returns to settings | Must Have |
| FR-012 | Disable settings inputs while session is in progress | Should Have |
| FR-013 | Display current round / total rounds throughout session | Must Have |
| FR-014 | Display session-complete state after final round | Must Have |

### 2.3 Power Breathing Phase

| ID | Requirement | Priority |
|---|---|---|
| FR-015 | Animate visual element for inhale/exhale synchronized to tempo | Must Have |
| FR-016 | Display current breath count (e.g., "14 / 30") | Must Have |
| FR-017 | Display phase label ("INHALE" / "EXHALE") | Must Have |
| FR-018 | Reset breath count to 1 at each new round | Must Have |

### 2.4 Breath Retention Phase

| ID | Requirement | Priority |
|---|---|---|
| FR-019 | Auto-transition from power breathing to hold after configured breaths | Must Have |
| FR-020 | Display timer counting up during hold | Must Have |
| FR-021 | Calculate hold per round: start_time + (round-1) * increment | Must Have |
| FR-022 | Play sound at hold start | Must Have |
| FR-023 | Play sound at hold end | Must Have |
| FR-024 | Allow user to end hold early (tap/click/Space) | Must Have |

### 2.5 Recovery Breath Phase

| ID | Requirement | Priority |
|---|---|---|
| FR-025 | Auto-transition from hold to recovery | Must Have |
| FR-026 | Prompt deep inhale at recovery start | Must Have |
| FR-027 | Display 15-second countdown during recovery hold | Must Have |
| FR-028 | Prompt exhale after recovery hold | Must Have |
| FR-029 | Begin next round or show session complete after recovery | Must Have |

### 2.6 Audio

| ID | Requirement | Priority |
|---|---|---|
| FR-030 | Generate all audio via Web Audio API (no external files) | Must Have |
| FR-031 | Hold start and end sounds must be audibly distinct | Should Have |
| FR-032 | Session complete sound | Should Have |

---

## 3. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-P01 | Smooth animations with no perceptible frame drops |
| NFR-P02 | Timer accuracy within ±100ms over a 5-minute hold |
| NFR-P03 | Total file size under 200 KB |
| NFR-U01 | First-time user can start session within 30 seconds |
| NFR-U02 | Touch targets minimum 44x44 pixels |
| NFR-U03 | Primary text legible at arm's length (min 24px) |
| NFR-C01 | Works in Chrome 120+, Firefox 121+, Safari 17+, Edge 120+ |
| NFR-C02 | Functions fully offline once loaded |
| NFR-A01 | Keyboard accessible (Space, Escape) |
| NFR-A02 | Respects prefers-reduced-motion |

---

## 4. Feature Decomposition

### Epic: WHM-E01 — Pranayama Breathing Session Application

| Feature | Description | Priority |
|---|---|---|
| WHM-F01 | Session Configuration Panel | Must Have |
| WHM-F02 | Power Breathing Phase Guidance | Must Have |
| WHM-F03 | Breath Retention Phase Guidance | Must Have |
| WHM-F04 | Recovery Breath Phase Guidance | Must Have |
| WHM-F05 | Audio Notification System | Must Have |

---

## 5. User Stories

### WHM-US-01: Configure Session Parameters

> As a Practitioner, I want to configure rounds, breaths, hold duration, and tempo so that the session matches my experience level.

```
Given I have opened the application for the first time
When the settings panel is rendered
Then I see labeled input fields for all 6 parameters with default values pre-filled
And a START button is visible and enabled
```

```
Given I enter 0 in the "Rounds" field (below minimum of 1)
When I click START
Then the session does not start
And the field value is clamped to the valid range
```

### WHM-US-02: Start and Stop a Session

> As a Practitioner, I want to start and stop a session so that I have full control over the exercise.

```
Given all configuration fields contain valid values
When I click START
Then Round 1 Power Breathing begins immediately
And settings inputs become disabled
And the round indicator shows "Round 1 of N"
```

```
Given a session is in progress
When I click RESET or press Escape
Then the session halts immediately
And the application returns to IDLE with settings re-enabled
```

### WHM-US-03: Visual Breathing Animation

> As a Practitioner, I want to see a visual animation that expands on inhale and contracts on exhale so I can breathe in sync.

```
Given I am in the power breathing phase
When the inhale sub-phase begins
Then a circular element smoothly expands over the configured inhale duration
And the label reads "INHALE"
```

```
Given I am in the exhale sub-phase
Then the element smoothly contracts over the configured exhale duration
And the label reads "EXHALE"
```

### WHM-US-04: Track Breath Count

> As a Practitioner, I want to see a running breath count so I know when the hold approaches.

```
Given I am in round 1 power breathing
When breath 1 begins
Then the counter shows "1 / 30"
```

```
Given round 1 completes and round 2 starts
Then the counter resets to "1 / 30"
```

### WHM-US-05: Guided Breath Retention

> As a Practitioner, I want a timer during breath hold so I can track my progress.

```
Given hold start is 60s and increment is 15s
When round 1 retention begins
Then timer counts up from 0, target shows 60s

When round 2 retention begins
Then target shows 75s
```

```
Given the hold phase is active
When I tap the circle or press Space
Then the hold ends and recovery begins
```

### WHM-US-06: Audio Cues at Hold Transitions

> As a Practitioner, I want sounds at hold start/end so I can close my eyes during holds.

```
Given audio is enabled
When breath retention begins
Then a distinct double-beep plays within 200ms
```

```
Given breath retention ends
Then a distinct triple-beep plays, different from the start tone
```

### WHM-US-07: Recovery Breath Guidance

> As a Practitioner, I want to be guided through the recovery breath so I complete each round correctly.

```
Given retention has ended
When recovery begins
Then "RECOVERY INHALE" is displayed with the circle expanding
```

```
Given recovery inhale completes
Then a 15-second countdown begins with "HOLD" displayed
And after 15s the round transitions to the next round or session complete
```

### WHM-US-08: Round Progress Indicator

> As a Practitioner, I want to see which round I'm on throughout the session.

```
Given a 3-round session
When any phase of round 2 is active
Then "Round 2 / 3" is displayed persistently
```

### WHM-US-09: Gradual Breathing Progress Indicator

> As a Practitioner, I want to see a gradual visual indicator during inhale and exhale phases so I can pace my breathing by seeing how much time remains.

```
Given I am in the power breathing phase
When the inhale sub-phase begins
Then the SVG progress ring fills gradually from 0% to 100% over the configured inhale duration
And a countdown shows the remaining seconds (e.g., "1.3s")
And the ring reaches exactly 100% at the end of the inhale
```

```
Given the inhale sub-phase has completed
When the exhale sub-phase begins
Then the SVG progress ring drains gradually from 100% to 0% over the configured exhale duration
And the countdown shows the remaining seconds
And the transition from exhale to the next inhale resets the ring to 0% without a visible jump
```

```
Given the user has configured inhale duration to X seconds (1–6) and exhale duration to Y seconds (1–6)
When the session runs
Then the ring fill takes exactly X seconds during inhale
And the ring drain takes exactly Y seconds during exhale
```

```
Given the hold phase is active
When the timer counts up toward the target
Then the ring fills gradually toward 100% proportional to elapsed time / target time
And reaching the target turns the ring green (hold-target-reached)
```

```
Given the user's OS has "prefers-reduced-motion" enabled
When a breathing phase is active
Then CSS transitions and decorative animations are disabled
And the ring progress and countdown text continue to update (informational, not decorative)
```

---

## 6. Hold Duration Calculation

| Round | Index (0-based) | Start=60s, Incr=15s | Start=90s, Incr=0s |
|---|---|---|---|
| 1 | 0 | 60s | 90s |
| 2 | 1 | 75s | 90s |
| 3 | 2 | 90s | 90s |
| 4 | 3 | 105s | 90s |

Formula: `holdDuration = holdStart + (roundNumber - 1) * holdIncrement`
