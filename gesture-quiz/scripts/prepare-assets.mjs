// Kopiert die MediaPipe-WASM-Dateien aus node_modules und lädt das
// Handtracking-Modell herunter (einmalig). Läuft automatisch nach `npm install`.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const MODEL_PATH = 'public/models/hand_landmarker.task'

mkdirSync('public/models', { recursive: true })
cpSync('node_modules/@mediapipe/tasks-vision/wasm', 'public/wasm', {
  recursive: true,
})
console.log('WASM-Dateien nach public/wasm kopiert.')

if (existsSync(MODEL_PATH)) {
  console.log('Modell bereits vorhanden.')
} else {
  const res = await fetch(MODEL_URL)
  if (!res.ok) throw new Error(`Modell-Download fehlgeschlagen: HTTP ${res.status}`)
  writeFileSync(MODEL_PATH, Buffer.from(await res.arrayBuffer()))
  console.log('Modell hand_landmarker.task heruntergeladen.')
}
