import type { FaceState } from './types'

/** Ab diesem Blendshape-Score gilt der Mund als Lächeln (reale Werte oft nur 0.3–0.5) */
const SMILE_ON = 0.35
/** Erst unter diesem Score wird der Trigger wieder scharfgestellt */
const SMILE_OFF = 0.2
/** So lange muss das Lächeln stabil anliegen, bevor ausgelöst wird */
const SMILE_HOLD_MS = 200
const SMILE_COOLDOWN_MS = 1000

/**
 * Feuert `onSmile` einmalig, wenn ein Lächeln kurz stabil anliegt.
 * Erneutes Auslösen erst, nachdem das Lächeln wieder verschwunden ist.
 */
export class SmileTrigger {
  onSmile: () => void = () => {}

  private since = 0
  private armed = true
  private cooldownUntil = 0

  update(smile: number, now: number): void {
    if (smile >= SMILE_ON) {
      if (!this.since) this.since = now
      if (
        this.armed &&
        now >= this.cooldownUntil &&
        now - this.since >= SMILE_HOLD_MS
      ) {
        this.armed = false
        this.cooldownUntil = now + SMILE_COOLDOWN_MS
        this.onSmile()
      }
    } else {
      this.since = 0
      if (smile <= SMILE_OFF) this.armed = true
    }
  }
}

/** Beobachtungsfenster für Kopfbewegungen */
const WINDOW_MS = 1000
/** Mindestauslenkung eines einzelnen Schwungs (normalisierte Videokoordinaten) */
const MIN_SWING = 0.012
/** Mindest-Gesamtauslenkung auf der dominanten Achse */
const MIN_RANGE = 0.02
/** So viele Richtungswechsel-Schwünge braucht ein Nicken/Schütteln */
const SWINGS_NEEDED = 3
/** Die dominante Achse muss sich so stark von der anderen abheben */
const DOMINANCE = 1.5
const GESTURE_COOLDOWN_MS = 1500

interface Sample {
  t: number
  x: number
  y: number
}

/**
 * Erkennt Nicken (vertikales Pendeln der Nasenspitze) und Kopfschütteln
 * (horizontales Pendeln) über Richtungswechsel innerhalb eines Zeitfensters.
 */
export class HeadGestureDetector {
  onNod: () => void = () => {}
  onShake: () => void = () => {}

  private samples: Sample[] = []
  private cooldownUntil = 0

  update(face: FaceState, now: number): void {
    if (!face.visible) {
      this.samples = []
      return
    }
    this.samples.push({ t: now, x: face.noseX, y: face.noseY })
    while (this.samples.length && this.samples[0].t < now - WINDOW_MS) {
      this.samples.shift()
    }
    if (now < this.cooldownUntil || this.samples.length < 4) return

    const xs = this.samples.map((s) => s.x)
    const ys = this.samples.map((s) => s.y)
    const xRange = Math.max(...xs) - Math.min(...xs)
    const yRange = Math.max(...ys) - Math.min(...ys)

    if (
      yRange >= MIN_RANGE &&
      yRange >= xRange * DOMINANCE &&
      countSwings(ys) >= SWINGS_NEEDED
    ) {
      this.fire(this.onNod, now)
    } else if (
      xRange >= MIN_RANGE &&
      xRange >= yRange * DOMINANCE &&
      countSwings(xs) >= SWINGS_NEEDED
    ) {
      this.fire(this.onShake, now)
    }
  }

  private fire(handler: () => void, now: number): void {
    this.samples = []
    this.cooldownUntil = now + GESTURE_COOLDOWN_MS
    handler()
  }
}

/** Zählt Schwünge (Bewegungen ≥ MIN_SWING mit wechselnder Richtung) */
function countSwings(values: number[]): number {
  let swings = 0
  let dir = 0
  let anchor = values[0]
  for (const v of values) {
    const delta = v - anchor
    if (dir === 0) {
      if (Math.abs(delta) >= MIN_SWING) {
        dir = Math.sign(delta)
        anchor = v
        swings = 1
      }
    } else if (Math.sign(delta) === dir) {
      anchor = v
    } else if (Math.abs(delta) >= MIN_SWING) {
      dir = -dir
      anchor = v
      swings++
    }
  }
  return swings
}
