export interface Question {
  question: string
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
