import './style.css'
import questionsData from './questions.json'
import type { FaceState, Question } from './types'
import { startCamera } from './camera'
import { HandTracker } from './handTracking'
import { FaceTracker } from './faceTracking'
import { SmileTrigger, HeadGestureDetector } from './expressions'
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
const answersEl = $('#answers')
const answerButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('#answers .answer'),
)
const tfAnswersEl = $('#tf-answers')
const tfButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('#tf-answers .answer'),
)
const feedbackEl = $('#feedback')
const feedbackTitle = $('#feedback-title')
const feedbackText = $('#feedback-text')
const resultScore = $('#result-score')
const resultSmiles = $('#result-smiles')
const startError = $('#start-error')
const faceEmojiEl = $('#face-emoji')
const confettiEl = $('#confetti')

const FEEDBACK_MS = 3000

const quiz = new Quiz(questionsData as Question[])
const dwell = new DwellController($('#cursor'))
// Debug-Modus ohne Kamera: Maus steuert den Cursor (http://localhost:5173/?mouse)
// Tasten: L = Lächeln, J = Nicken (Wahr), N = Kopfschütteln (Falsch)
const useMouse = new URLSearchParams(location.search).has('mouse')

const smileTrigger = new SmileTrigger()
const headGestures = new HeadGestureDetector()

let locked = false
let faceEnabled = false
let smileCount = 0
/** Während des Feedbacks zu einer richtigen Antwort wartet ein Smile-Bonus */
let smileBonusPending = false
let lastFace: FaceState | null = null

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
      window.addEventListener('keydown', (e) => {
        if (e.key === 'l') smileTrigger.onSmile()
        if (e.key === 'j') headGestures.onNod()
        if (e.key === 'n') headGestures.onShake()
      })
    } else {
      const tracker = new HandTracker(video)
      const face = new FaceTracker(video)
      const [, , faceOk] = await Promise.all([
        startCamera(video),
        tracker.init(),
        face.init().then(
          () => true,
          (err) => {
            console.warn('Mimik-Erkennung nicht verfügbar:', err)
            return false
          },
        ),
      ])
      tracker.onPointer = (p) => dwell.setPointer(p)
      tracker.start()
      if (faceOk) {
        faceEnabled = true
        face.onFace = onFace
        face.start()
      }
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

smileTrigger.onSmile = () => {
  if (smileBonusPending) {
    smileBonusPending = false
    smileCount++
    burstConfetti()
    return
  }
  if (!locked) dwell.confirmCurrent()
}

headGestures.onNod = () => answerByGesture(0)
headGestures.onShake = () => answerByGesture(1)

function answerByGesture(tfIndex: number): void {
  if (locked || quiz.current.type !== 'truefalse') return
  if (screens.quiz.classList.contains('hidden')) return
  onAnswer(tfIndex)
}

function onFace(f: FaceState): void {
  lastFace = f
  const now = performance.now()
  smileTrigger.update(f.smile, now)
  headGestures.update(f, now)
  updateEmoji(f)
}

/** Mimik-Spiegel: kleines Emoji zeigt, was die Erkennung gerade „sieht“ */
function updateEmoji(f: FaceState): void {
  const inQuiz = screens.quiz.classList.contains('hidden') === false
  faceEmojiEl.classList.toggle('hidden', !f.visible || !inQuiz)
  if (!f.visible) return
  let emoji = '🙂'
  if (f.smile > 0.4) emoji = f.jawOpen > 0.25 ? '😆' : '😄'
  else if (f.jawOpen > 0.4) emoji = '😮'
  else if (f.browDown > 0.4) emoji = '🤨'
  else if (f.browUp > 0.5) emoji = '😲'
  if (faceEmojiEl.textContent !== emoji) faceEmojiEl.textContent = emoji
}

function burstConfetti(): void {
  const colors = ['#ffd54a', '#4f7cff', '#3fd97f', '#ff5f6d', '#c084fc']
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement('div')
    piece.className = 'confetti-piece'
    piece.style.left = `${10 + Math.random() * 80}vw`
    piece.style.background = colors[i % colors.length]
    piece.style.animationDelay = `${Math.random() * 0.4}s`
    piece.style.animationDuration = `${1.6 + Math.random() * 1.2}s`
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 30}vw`)
    confettiEl.appendChild(piece)
    setTimeout(() => piece.remove(), 3200)
  }
}

function startQuiz(): void {
  quiz.reset()
  smileCount = 0
  smileBonusPending = false
  show('quiz')
  renderQuestion()
}

function renderQuestion(): void {
  const q = quiz.current
  const isTrueFalse = q.type === 'truefalse'
  questionText.textContent = q.question
  progressEl.textContent = `Frage ${quiz.index + 1} von ${quiz.questions.length} · ${quiz.score} Punkte`

  answersEl.classList.toggle('hidden', isTrueFalse)
  tfAnswersEl.classList.toggle('hidden', !isTrueFalse)
  if (isTrueFalse) {
    tfButtons.forEach((btn) => btn.classList.remove('correct', 'wrong', 'hovered'))
  } else {
    answerButtons.forEach((btn, i) => {
      btn.textContent = q.answers[i]
      btn.classList.remove('correct', 'wrong', 'hovered')
    })
  }
  feedbackEl.classList.add('hidden')
  smileBonusPending = false
  locked = false
  dwell.enabled = true
}

function onAnswer(answerIndex: number): void {
  if (locked) return
  locked = true
  dwell.enabled = false

  const q = quiz.current
  const buttons = q.type === 'truefalse' ? tfButtons : answerButtons
  const correct = quiz.answer(answerIndex)
  buttons[q.correctIndex].classList.add('correct')
  if (!correct) buttons[answerIndex].classList.add('wrong')

  feedbackTitle.textContent = correct ? 'Richtig! 🎉' : 'Leider falsch 😕'
  feedbackText.textContent = q.explanation
  feedbackEl.classList.remove('hidden')
  feedbackEl.classList.toggle('is-correct', correct)

  if (correct && (faceEnabled || useMouse)) {
    // Wer schon strahlt, bekommt den Bonus sofort – sonst bis zum Feedback-Ende warten
    if (lastFace && lastFace.smile > 0.5) {
      smileCount++
      burstConfetti()
    } else {
      smileBonusPending = true
    }
  }

  setTimeout(() => {
    smileBonusPending = false
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
  const showSmiles = smileCount > 0
  resultSmiles.classList.toggle('hidden', !showSmiles)
  if (showSmiles) {
    resultSmiles.textContent = `😄 Smile-Bonus: ${smileCount}× über eine richtige Antwort gefreut!`
  }
  faceEmojiEl.classList.add('hidden')
  show('result')
  dwell.enabled = true
}

$('#btn-start').addEventListener('click', begin)
$('#btn-restart').addEventListener('click', startQuiz)
answerButtons.forEach((btn, i) => btn.addEventListener('click', () => onAnswer(i)))
tfButtons.forEach((btn, i) => btn.addEventListener('click', () => onAnswer(i)))
