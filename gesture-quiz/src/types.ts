interface BaseQuestion {
  question: string
  explanation: string
}

/** Auswahlfrage (Finger/Dwell); 'truefalse' zusätzlich per Nicken/Kopfschütteln */
export interface ChoiceQuestion extends BaseQuestion {
  type?: 'choice' | 'truefalse'
  answers: string[]
  correctIndex: number
}

/** Zuordnungsfrage: Begriffe per Drag & Drop in zwei Kategorien ziehen */
export interface MatchQuestion extends BaseQuestion {
  type: 'match'
  categories: [string, string]
  terms: { text: string; category: 0 | 1 }[]
}

export type Question = ChoiceQuestion | MatchQuestion

export interface Pointer {
  /** x in Viewport-Pixeln, bereits gespiegelt (Selfie-Ansicht) */
  x: number
  y: number
  visible: boolean
  /**
   * Pinch-Maß: Abstand Daumen-/Zeigefingerspitze relativ zur Handgröße.
   * Klein (< ~0.3) = Finger zusammen („greifen“). undefined, wenn unbekannt.
   */
  pinch?: number
}

/** Pro Videoframe ermittelter Mimik-Zustand (nur flüchtige Werte, keine Identifikation) */
export interface FaceState {
  visible: boolean
  /** Blendshape-Scores 0..1 */
  smile: number
  jawOpen: number
  browUp: number
  browDown: number
  eyeBlink: number
  /** Blinzeln pro Auge (anatomisch: linkes/rechtes Auge der Person) */
  eyeBlinkLeft: number
  eyeBlinkRight: number
  /** Nasenspitze in normalisierten Videokoordinaten (für Nick-/Schüttelerkennung) */
  noseX: number
  noseY: number
  /** 4x4-Kopftransformation (column-major) für die Avatar-Kopfdrehung */
  headMatrix?: ArrayLike<number>
}
