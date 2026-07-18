import './style.css'
import questionsData from './questions.json'
import type { Question } from './types'
import { startCamera } from './camera'
import { HandTracker } from './handTracking'
import { DwellController } from './overlay'
import { Quiz } from './quiz'

const $ = <T extends HTMLElement>(selector: string): T =>
  document.querySelector(selector) as T

const video = $<HTMLVideoElement>('#camera')
const screens = {
  start: $('#screen-start'),
  loading: $('#screen-loading'),
  quiz: $('#screen-quiz'),
  result: $('#screen-result'),
}
const questionText = $('#question-text')
const progressEl = $('#progress')
const answerButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('.answer'),
)
const feedbackEl = $('#feedback')
const feedbackTitle = $('#feedback-title')
const feedbackText = $('#feedback-text')
const resultScore = $('#result-score')
const startError = $('#start-error')

const FEEDBACK_MS = 3000

const quiz = new Quiz(questionsData as Question[])
const dwell = new DwellController($('#cursor'))
// Debug-Modus ohne Kamera: Maus steuert den Cursor (http://localhost:5173/?mouse)
const useMouse = new URLSearchParams(location.search).has('mouse')

let locked = false

function show(name: keyof typeof screens): void {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('hidden', key !== name)
  }
}

async function begin(): Promise<void> {
  show('loading')
  startError.classList.add('hidden')
  try {
    if (useMouse) {
      window.addEventListener('mousemove', (e) =>
        dwell.setPointer({ x: e.clientX, y: e.clientY, visible: true }),
      )
    } else {
      const tracker = new HandTracker(video)
      await Promise.all([startCamera(video), tracker.init()])
      tracker.onPointer = (p) => dwell.setPointer(p)
      tracker.start()
    }
    dwell.start()
    startQuiz()
  } catch (err) {
    console.error(err)
    show('start')
    startError.textContent =
      err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte erlaube den Zugriff und versuche es erneut.'
        : `Start fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`
    startError.classList.remove('hidden')
  }
}

function startQuiz(): void {
  quiz.reset()
  show('quiz')
  renderQuestion()
}

function renderQuestion(): void {
  const q = quiz.current
  questionText.textContent = q.question
  progressEl.textContent = `Frage ${quiz.index + 1} von ${quiz.questions.length} · ${quiz.score} Punkte`
  answerButtons.forEach((btn, i) => {
    btn.textContent = q.answers[i]
    btn.classList.remove('correct', 'wrong', 'hovered')
  })
  feedbackEl.classList.add('hidden')
  locked = false
  dwell.enabled = true
}

function onAnswer(answerIndex: number): void {
  if (locked) return
  locked = true
  dwell.enabled = false

  const q = quiz.current
  const correct = quiz.answer(answerIndex)
  answerButtons[q.correctIndex].classList.add('correct')
  if (!correct) answerButtons[answerIndex].classList.add('wrong')

  feedbackTitle.textContent = correct ? 'Richtig! 🎉' : 'Leider falsch 😕'
  feedbackText.textContent = q.explanation
  feedbackEl.classList.remove('hidden')
  feedbackEl.classList.toggle('is-correct', correct)

  setTimeout(() => {
    if (quiz.next()) {
      renderQuestion()
    } else {
      showResult()
    }
  }, FEEDBACK_MS)
}

function showResult(): void {
  const total = quiz.questions.length
  resultScore.textContent = `Du hast ${quiz.score} von ${total} Fragen richtig beantwortet!`
  show('result')
  dwell.enabled = true
}

$('#btn-start').addEventListener('click', begin)
$('#btn-restart').addEventListener('click', startQuiz)
answerButtons.forEach((btn, i) => btn.addEventListener('click', () => onAnswer(i)))
