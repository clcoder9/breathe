// Kopiert die MediaPipe-WASM-Dateien aus node_modules und lädt die
// Erkennungsmodelle herunter (einmalig). Läuft automatisch nach `npm install`.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'

const MODELS = [
  {
    url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    path: 'public/models/hand_landmarker.task',
  },
  {
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    path: 'public/models/face_landmarker.task',
  },
]

mkdirSync('public/models', { recursive: true })
cpSync('node_modules/@mediapipe/tasks-vision/wasm', 'public/wasm', {
  recursive: true,
})
console.log('WASM-Dateien nach public/wasm kopiert.')

for (const { url, path } of MODELS) {
  if (existsSync(path)) {
    console.log(`${path} bereits vorhanden.`)
    continue
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Modell-Download fehlgeschlagen: HTTP ${res.status} (${url})`)
  writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  console.log(`${path} heruntergeladen.`)
}
