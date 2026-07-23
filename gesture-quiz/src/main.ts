import './style.css'
import questionsData from './questions.json'
import type { FaceState, MatchQuestion, Pointer, Question } from './types'
import { startCamera } from './camera'
import { HandTracker } from './handTracking'
import { FaceTracker } from './faceTracking'
import { SmileTrigger, HeadGestureDetector } from './expressions'
import { DwellController } from './overlay'
import { DragController } from './dragdrop'
import { Quiz, shuffle } from './quiz'

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
const matchArea = $('#match-area')
const feedbackEl = $('#feedback')
const feedbackTitle = $('#feedback-title')
const feedbackText = $('#feedback-text')
const resultScore = $('#result-score')
const resultSmiles = $('#result-smiles')
const startError = $('#start-error')
const faceEmojiEl = $('#face-emoji')
const confettiEl = $('#confetti')
const avatarEl = $('#avatar')
const avatarCredit = $('#avatar-credit')
const faceDebugEl = $('#face-debug')

const FEEDBACK_MS = 3000
const MATCH_FEEDBACK_MS = 4500

const quiz = new Quiz(questionsData as Question[])
const dwell = new DwellController($('#cursor'))
const drag = new DragController(
  $('#chip-stack'),
  Array.from(document.querySelectorAll<HTMLElement>('#match-area .drop-zone')),
)
// Debug-Modus ohne Kamera: Maus steuert den Cursor (http://localhost:5173/?mouse)
// Maustaste gedrückt = Pinch; Tasten: L = Lächeln, J = Nicken (Wahr), N = Kopfschütteln (Falsch)
const params = new URLSearchParams(location.search)
const useMouse = params.has('mouse')
const faceDebug = params.has('facedebug')

const smileTrigger = new SmileTrigger()
const headGestures = new HeadGestureDetector()

let avatar: import('./avatar3d').Avatar3D | undefined
let locked = false
let faceEnabled = false
let avatarLoaded = false
let smileCount = 0
/** Während des Feedbacks zu einer richtigen Antwort wartet ein Smile-Bonus */
let smileBonusPending = false
let lastFace: FaceState | null = null

function show(name: keyof typeof screens): void {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('hidden', key !== name)
  }
  if (avatarLoaded) avatar!.setVisible(name === 'quiz')
}

/**
 * Optionales 3D-Maskottchen (models/avatar.glb). Fehlt die Datei oder schlägt
 * WebGL fehl, bleibt der Emoji-Spiegel als Fallback aktiv. Three.js wird per
 * Code-Splitting erst geladen, wenn die Modelldatei wirklich existiert.
 */
async function initAvatar(): Promise<void> {
  const modelUrl = 'models/avatar.glb'
  try {
    const head = await fetch(modelUrl, { method: 'HEAD' })
    if (!head.ok || head.headers.get('content-type')?.includes('text/html')) {
      console.info('Kein 3D-Avatar (models/avatar.glb) – Emoji-Fallback aktiv.')
      return
    }
    const { Avatar3D } = await import('./avatar3d')
    avatar = new Avatar3D(avatarEl)
    await avatar.load(modelUrl)
    avatarLoaded = true
    avatarCredit.classList.remove('hidden')
    document.body.classList.add('has-avatar')
    avatar.setVisible(!screens.quiz.classList.contains('hidden'))
    console.info('3D-Avatar geladen –', avatar.describe())
  } catch (err) {
    console.warn('3D-Avatar konnte nicht geladen werden – Emoji-Fallback aktiv.', err)
  }
}

function sendPointer(p: Pointer): void {
  dwell.setPointer(p)
  drag.setPointer(p)
}

async function begin(): Promise<void> {
  show('loading')
  startError.classList.add('hidden')
  try {
    void initAvatar() // lädt parallel; blockiert den Kamerastart nicht
    if (useMouse) {
      let pinch = 1
      window.addEventListener('mousemove', (e) =>
        sendPointer({ x: e.clientX, y: e.clientY, visible: true, pinch }),
      )
      window.addEventListener('mousedown', (e) => {
        pinch = 0.1
        sendPointer({ x: e.clientX, y: e.clientY, visible: true, pinch })
      })
      window.addEventListener('mouseup', (e) => {
        pinch = 1
        sendPointer({ x: e.clientX, y: e.clientY, visible: true, pinch })
      })
      const fakeFace = (smile: number): FaceState => ({
        visible: true, smile, jawOpen: 0, browUp: 0, browDown: 0,
        eyeBlink: 0, eyeBlinkLeft: 0, eyeBlinkRight: 0, noseX: 0.5, noseY: 0.5,
      })
      // Debug-Hook: Mimik-Werte direkt setzen, z. B. __setFace({ browUp: 1 })
      ;(window as unknown as Record<string, unknown>).__setFace = (
        p: Partial<FaceState>,
      ) => onFace({ ...fakeFace(0), ...p })
      window.addEventListener('keydown', (e) => {
        if (e.key === 'l') smileTrigger.onSmile()
        if (e.key === 'j') headGestures.onNod()
        if (e.key === 'n') headGestures.onShake()
        if (e.key === 'k') onFace(fakeFace(0.8)) // Lächeln halten
      })
      window.addEventListener('keyup', (e) => {
        if (e.key === 'k') onFace(fakeFace(0))
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
      tracker.onPointer = sendPointer
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
  if (faceDebug) updateFaceDebug(f)
  if (avatarLoaded) {
    avatar!.applyFace(f)
    faceEmojiEl.classList.add('hidden')
  } else {
    updateEmoji(f)
  }
}

/** Live-Messwerte einblenden (?facedebug) – zum Kalibrieren der Schwellwerte */
function updateFaceDebug(f: FaceState): void {
  faceDebugEl.classList.remove('hidden')
  let angles = ''
  if (f.headMatrix) {
    const m = f.headMatrix
    const deg = (v: number): string => `${Math.round((v * 180) / Math.PI)}°`
    const yaw = Math.asin(Math.max(-1, Math.min(1, m[8] as number)))
    const pitch = Math.atan2(-(m[9] as number), m[10] as number)
    const roll = Math.atan2(-(m[4] as number), m[0] as number)
    angles = `pitch ${deg(pitch)}  yaw ${deg(yaw)}  roll ${deg(roll)}`
  }
  faceDebugEl.textContent = f.visible
    ? `smile ${f.smile.toFixed(2)}  blinkL ${f.eyeBlinkLeft.toFixed(2)}  blinkR ${f.eyeBlinkRight.toFixed(2)}\n` +
      `jaw   ${f.jawOpen.toFixed(2)}  brow↑ ${f.browUp.toFixed(2)}  brow↓ ${f.browDown.toFixed(2)}\n` +
      angles
    : 'kein Gesicht erkannt'
}

/** Mimik-Spiegel: kleines Emoji zeigt, was die Erkennung gerade „sieht“ */
function updateEmoji(f: FaceState): void {
  const inQuiz = screens.quiz.classList.contains('hidden') === false
  faceEmojiEl.classList.toggle('hidden', !f.visible || !inQuiz)
  if (!f.visible) return
  let emoji = '🙂'
  if (f.smile > 0.35) emoji = f.jawOpen > 0.25 ? '😆' : '😄'
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
  const mode = q.type === 'match' ? 'match' : q.type === 'truefalse' ? 'tf' : 'choice'
  questionText.textContent = q.question
  progressEl.textContent = `Frage ${quiz.index + 1} von ${quiz.questions.length} · ${quiz.score} Punkte`

  answersEl.classList.toggle('hidden', mode !== 'choice')
  tfAnswersEl.classList.toggle('hidden', mode !== 'tf')
  matchArea.classList.toggle('hidden', mode !== 'match')
  feedbackEl.classList.add('hidden')
  smileBonusPending = false
  locked = false

  if (mode === 'match') {
    dwell.enabled = false
    const match = q as MatchQuestion
    drag.begin(match, shuffle(match.terms.map((_, i) => i)))
  } else {
    drag.stop()
    dwell.enabled = true
    if (mode === 'tf') {
      tfButtons.forEach((btn) => btn.classList.remove('correct', 'wrong', 'hovered'))
    } else {
      answerButtons.forEach((btn, i) => {
        btn.textContent = (q as { answers: string[] }).answers[i]
        btn.classList.remove('correct', 'wrong', 'hovered')
      })
    }
  }
}

drag.onDrop = (r) => {
  if (avatarLoaded) avatar!.react(r.correct ? 'correct' : 'wrong')
  if (!r.done) return

  const q = quiz.current as MatchQuestion
  quiz.award(r.correctCount)
  locked = true
  const all = q.terms.length
  const perfect = r.correctCount === all
  feedbackTitle.textContent = perfect
    ? `Alle ${all} richtig zugeordnet! 🎉`
    : `${r.correctCount} von ${all} richtig zugeordnet`
  feedbackText.textContent = q.explanation
  feedbackEl.classList.remove('hidden')
  feedbackEl.classList.toggle('is-correct', perfect)

  if (perfect && (faceEnabled || useMouse)) {
    if (lastFace && lastFace.smile > 0.35) {
      smileCount++
      burstConfetti()
    } else {
      smileBonusPending = true
    }
  }

  setTimeout(() => {
    smileBonusPending = false
    drag.stop()
    if (quiz.next()) renderQuestion()
    else showResult()
  }, MATCH_FEEDBACK_MS)
}

function onAnswer(answerIndex: number): void {
  if (locked || quiz.current.type === 'match') return
  locked = true
  dwell.enabled = false

  const q = quiz.current
  const buttons = q.type === 'truefalse' ? tfButtons : answerButtons
  const correct = quiz.answer(answerIndex)
  buttons[(q as { correctIndex: number }).correctIndex].classList.add('correct')
  if (!correct) buttons[answerIndex].classList.add('wrong')

  feedbackTitle.textContent = correct ? 'Richtig! 🎉' : 'Leider falsch 😕'
  feedbackText.textContent = q.explanation
  feedbackEl.classList.remove('hidden')
  feedbackEl.classList.toggle('is-correct', correct)

  if (avatarLoaded) avatar!.react(correct ? 'correct' : 'wrong')

  if (correct && (faceEnabled || useMouse)) {
    // Wer schon strahlt, bekommt den Bonus sofort – sonst bis zum Feedback-Ende warten
    if (lastFace && lastFace.smile > 0.35) {
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
  resultScore.textContent = `Du hast ${quiz.score} von ${quiz.maxScore} Punkten erreicht!`
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
