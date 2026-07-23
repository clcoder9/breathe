export interface Question {
  question: string
  /**
   * 'truefalse'-Fragen (answers = ["Wahr", "Falsch"]) können zusätzlich per
   * Nicken/Kopfschütteln beantwortet werden. Ohne Angabe: normale Auswahlfrage.
   */
  type?: 'choice' | 'truefalse'
  answers: string[]
  correctIndex: number
  explanation: string
}

export interface Pointer {
  /** x in Viewport-Pixeln, bereits gespiegelt (Selfie-Ansicht) */
  x: number
  y: number
  visible: boolean
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
  /** Nasenspitze in normalisierten Videokoordinaten (für Nick-/Schüttelerkennung) */
  noseX: number
  noseY: number
  /** 4x4-Kopftransformation (column-major) für die Avatar-Kopfdrehung */
  headMatrix?: ArrayLike<number>
}
