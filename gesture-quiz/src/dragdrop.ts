import type { MatchQuestion, Pointer } from './types'

/** Pinch-Hysterese: greifen unter, loslassen über diesem Verhältnis */
const PINCH_GRAB = 0.32
const PINCH_RELEASE = 0.48
/** Dwell-Fallback: so lange über Chip/Zone halten = aufnehmen/ablegen */
const DWELL_PICK_MS = 1000
/** Trefferzone um Chips herum */
const CHIP_PADDING = 24
/** Nach dem Ablegen kurz gesperrt, damit nicht sofort erneut gegriffen wird */
const DROP_COOLDOWN_MS = 600

export interface DropResult {
  termIndex: number
  correct: boolean
  /** true, sobald alle Begriffe platziert sind */
  done: boolean
  correctCount: number
}

/**
 * Zuordnungsfragen: Begriff-Chips werden per Pinch (Daumen+Zeigefinger)
 * gegriffen und in einer Kategorie-Zone losgelassen. Fallback ohne Pinch:
 * 1 s über dem Chip verweilen = aufnehmen, 1 s über der Zone = ablegen.
 * Falsch abgelegte Begriffe springen rot markiert in die richtige Zone
 * (zeigt die Lösung, zählt aber keinen Punkt).
 */
export class DragController {
  onDrop: (r: DropResult) => void = () => {}

  private question?: MatchQuestion
  private chips: HTMLElement[] = []
  private zones: HTMLElement[] = []
  private placed = 0
  private correctCount = 0

  private pointer: Pointer = { x: 0, y: 0, visible: false }
  private carrying: HTMLElement | null = null
  private carryingIndex = -1
  private wasPinched = false
  private dwellTarget: HTMLElement | null = null
  private dwellStart = 0
  private cooldownUntil = 0
  private raf = 0

  constructor(
    private chipContainer: HTMLElement,
    zoneEls: HTMLElement[],
  ) {
    this.zones = zoneEls
  }

  /** Baut die Chips/Zonen für eine Frage auf und startet die Steuerung */
  begin(question: MatchQuestion, termOrder: number[]): void {
    this.question = question
    this.placed = 0
    this.correctCount = 0
    this.carrying = null
    this.wasPinched = false
    this.dwellTarget = null
    document.querySelectorAll('.term-chip').forEach((c) => c.remove())
    this.chipContainer.innerHTML = ''
    this.zones.forEach((zone, i) => {
      zone.querySelector('.zone-title')!.textContent = question.categories[i]
      zone.querySelector('.zone-items')!.innerHTML = ''
      zone.classList.remove('flash-good', 'flash-bad')
    })
    this.chips = termOrder.map((termIndex) => {
      const chip = document.createElement('div')
      chip.className = 'term-chip'
      chip.textContent = question.terms[termIndex].text
      chip.dataset.term = String(termIndex)
      this.chipContainer.appendChild(chip)
      return chip
    })
    if (!this.raf) this.tick()
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.carrying = null
  }

  setPointer(p: Pointer): void {
    this.pointer = p
  }

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick)
    const now = performance.now()
    const p = this.pointer
    if (!p.visible) {
      this.setDwellTarget(null, now)
      return
    }

    const pinched = p.pinch !== undefined && p.pinch < PINCH_GRAB
    const released = p.pinch === undefined || p.pinch > PINCH_RELEASE

    if (this.carrying) {
      // Chip folgt dem Cursor
      const rect = this.carrying.getBoundingClientRect()
      this.carrying.style.left = `${p.x - rect.width / 2}px`
      this.carrying.style.top = `${p.y - rect.height / 2}px`

      const zone = this.zoneAt(p.x, p.y)
      this.zones.forEach((z) => z.classList.toggle('zone-hover', z === zone))

      if (zone && this.wasPinched && released) {
        this.drop(zone, now)
      } else if (!this.wasPinched) {
        // Dwell-Fallback: über der Zone verweilen
        this.setDwellTarget(zone, now)
        if (zone && now - this.dwellStart >= DWELL_PICK_MS) this.drop(zone, now)
      } else if (this.wasPinched && released && !zone) {
        this.returnChip(now)
      }
      return
    }

    if (now < this.cooldownUntil) return
    const chip = this.chipAt(p.x, p.y)
    this.chips.forEach((c) => c.classList.toggle('chip-hover', c === chip && !c.dataset.placed))

    if (chip && !chip.dataset.placed) {
      if (pinched) {
        this.pickUp(chip, true)
      } else {
        this.setDwellTarget(chip, now)
        if (now - this.dwellStart >= DWELL_PICK_MS) this.pickUp(chip, false)
      }
    } else {
      this.setDwellTarget(null, now)
    }
  }

  private pickUp(chip: HTMLElement, viaPinch: boolean): void {
    this.carrying = chip
    this.carryingIndex = Number(chip.dataset.term)
    this.wasPinched = viaPinch
    this.dwellTarget = null
    chip.classList.add('chip-carrying')
    // Aus dem Stapel lösen und frei positionierbar machen
    const rect = chip.getBoundingClientRect()
    chip.style.position = 'fixed'
    chip.style.left = `${rect.left}px`
    chip.style.top = `${rect.top}px`
    document.body.appendChild(chip)
  }

  private drop(zone: HTMLElement, now: number): void {
    const chip = this.carrying!
    const q = this.question!
    const zoneIndex = this.zones.indexOf(zone)
    const correct = q.terms[this.carryingIndex].category === zoneIndex
    const targetZone = correct ? zone : this.zones[q.terms[this.carryingIndex].category]

    chip.classList.remove('chip-carrying', 'chip-hover')
    chip.classList.add(correct ? 'chip-correct' : 'chip-wrong')
    chip.dataset.placed = '1'
    chip.style.position = ''
    chip.style.left = ''
    chip.style.top = ''
    targetZone.querySelector('.zone-items')!.appendChild(chip)
    targetZone.classList.add(correct ? 'flash-good' : 'flash-bad')
    setTimeout(() => targetZone.classList.remove('flash-good', 'flash-bad'), 600)
    this.zones.forEach((z) => z.classList.remove('zone-hover'))

    this.carrying = null
    this.cooldownUntil = now + DROP_COOLDOWN_MS
    this.placed++
    if (correct) this.correctCount++
    this.onDrop({
      termIndex: this.carryingIndex,
      correct,
      done: this.placed >= q.terms.length,
      correctCount: this.correctCount,
    })
  }

  /** Loslassen außerhalb einer Zone: Chip zurück in den Stapel */
  private returnChip(now: number): void {
    const chip = this.carrying!
    chip.classList.remove('chip-carrying')
    chip.style.position = ''
    chip.style.left = ''
    chip.style.top = ''
    this.chipContainer.appendChild(chip)
    this.carrying = null
    this.cooldownUntil = now + DROP_COOLDOWN_MS
  }

  private setDwellTarget(el: HTMLElement | null, now: number): void {
    if (el !== this.dwellTarget) {
      this.dwellTarget = el
      this.dwellStart = now
    }
  }

  private chipAt(x: number, y: number): HTMLElement | null {
    for (const chip of this.chips) {
      if (chip.dataset.placed) continue
      const r = chip.getBoundingClientRect()
      if (
        x >= r.left - CHIP_PADDING &&
        x <= r.right + CHIP_PADDING &&
        y >= r.top - CHIP_PADDING &&
        y <= r.bottom + CHIP_PADDING
      ) {
        return chip
      }
    }
    return null
  }

  private zoneAt(x: number, y: number): HTMLElement | null {
    for (const zone of this.zones) {
      const r = zone.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return zone
    }
    return null
  }
}
