import type { Question } from './types'

export class Quiz {
  questions: Question[]
  index = 0
  score = 0

  constructor(private allQuestions: Question[]) {
    this.questions = shuffle(allQuestions).map(shuffleAnswers)
  }

  get current(): Question {
    return this.questions[this.index]
  }

  /** Wertet die Antwort, erhöht ggf. den Punktestand. Liefert true bei richtiger Antwort. */
  answer(answerIndex: number): boolean {
    const correct = answerIndex === this.current.correctIndex
    if (correct) this.score++
    return correct
  }

  /** Wechselt zur nächsten Frage. Liefert false, wenn das Quiz vorbei ist. */
  next(): boolean {
    if (this.index + 1 >= this.questions.length) return false
    this.index++
    return true
  }

  reset(): void {
    this.questions = shuffle(this.allQuestions).map(shuffleAnswers)
    this.index = 0
    this.score = 0
  }
}

/** Mischt die Antwortpositionen einer Auswahlfrage (Wahr/Falsch bleibt fix) */
function shuffleAnswers(q: Question): Question {
  if (q.type === 'truefalse') return q
  const order = shuffle(q.answers.map((_, i) => i))
  return {
    ...q,
    answers: order.map((i) => q.answers[i]),
    correctIndex: order.indexOf(q.correctIndex),
  }
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
