import type { Pointer } from './types'

/** Verweildauer bis eine Antwort als gewählt gilt */
const DWELL_MS = 1500
/** Trefferzone um die Karten herum ("in der Nähe" reicht) */
const HIT_PADDING = 28
/** Pause nach einer Auswahl, damit nicht sofort erneut ausgelöst wird */
const COOLDOWN_MS = 800
const RING_RADIUS = 20
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const CURSOR_HALF = 24

/**
 * Bewegt den Finger-Cursor, testet ihn gegen alle sichtbaren `.dwell-target`-
 * Elemente und löst nach DWELL_MS Verweilen einen Klick auf dem Ziel aus.
 */
export class DwellController {
  enabled = false

  private pointer: Pointer = { x: 0, y: 0, visible: false }
  private ringEl: SVGCircleElement
  private target: HTMLElement | null = null
  /** Nach einer Auswahl gesperrt, bis der Finger das Element einmal verlässt */
  private blockedTarget: HTMLElement | null = null
  private dwellStart = 0
  private cooldownUntil = 0
  private raf = 0

  constructor(private cursorEl: HTMLElement) {
    this.ringEl = cursorEl.querySelector('.ring') as SVGCircleElement
    this.ringEl.style.strokeDasharray = String(RING_CIRCUMFERENCE)
    this.ringEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE)
  }

  setPointer(p: Pointer): void {
    this.pointer = p
  }

  start(): void {
    if (!this.raf) this.tick()
  }

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick)
    this.update(performance.now())
  }

  private update(now: number): void {
    const p = this.pointer
    this.cursorEl.classList.toggle('hidden', !p.visible)
    if (p.visible) {
      this.cursorEl.style.transform = `translate(${p.x - CURSOR_HALF}px, ${p.y - CURSOR_HALF}px)`
    }

    const active = this.enabled && p.visible && now >= this.cooldownUntil
    let target = active ? this.hitTest(p.x, p.y) : null
    if (this.blockedTarget) {
      if (target === this.blockedTarget) {
        target = null
      } else if (active) {
        this.blockedTarget = null
      }
    }

    if (target !== this.target) {
      this.target?.classList.remove('hovered')
      this.target = target
      this.dwellStart = now
      target?.classList.add('hovered')
    }

    let progress = 0
    if (this.target) {
      progress = Math.min(1, (now - this.dwellStart) / DWELL_MS)
      if (progress >= 1) {
        const el = this.target
        el.classList.remove('hovered')
        this.target = null
        this.blockedTarget = el
        this.cooldownUntil = now + COOLDOWN_MS
        progress = 0
        el.click()
      }
    }
    this.ringEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress))
  }

  /** Nächstgelegenes sichtbares Ziel, dessen (erweiterte) Fläche den Punkt enthält */
  private hitTest(x: number, y: number): HTMLElement | null {
    let best: HTMLElement | null = null
    let bestDist = Infinity
    for (const el of document.querySelectorAll<HTMLElement>('.dwell-target')) {
      if (el.offsetParent === null) continue
      const r = el.getBoundingClientRect()
      if (
        x < r.left - HIT_PADDING ||
        x > r.right + HIT_PADDING ||
        y < r.top - HIT_PADDING ||
        y > r.bottom + HIT_PADDING
      ) {
        continue
      }
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dist = (x - cx) ** 2 + (y - cy) ** 2
      if (dist < bestDist) {
        bestDist = dist
        best = el
      }
    }
    return best
  }
}
