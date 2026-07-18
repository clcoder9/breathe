import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Pointer } from './types'

/** Landmark-Index der Zeigefingerspitze im MediaPipe-Handmodell */
const INDEX_FINGER_TIP = 8
/** Gewicht neuer Messwerte bei der exponentiellen Glättung (0..1) */
const SMOOTHING = 0.35
/** Nach so vielen Frames ohne Hand wird der Cursor ausgeblendet */
const MAX_MISSED_FRAMES = 10

export class HandTracker {
  onPointer: (p: Pointer) => void = () => {}

  private landmarker?: HandLandmarker
  private lastVideoTime = -1
  private raf = 0
  private sx = 0
  private sy = 0
  private hasPrev = false
  private missedFrames = 0

  constructor(private video: HTMLVideoElement) {}

  async init(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks('wasm')
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: 'models/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    })
  }

  start(): void {
    if (!this.raf) this.loop()
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)
    const video = this.video
    if (!this.landmarker || video.readyState < 2) return
    if (video.currentTime === this.lastVideoTime) return
    this.lastVideoTime = video.currentTime

    const result = this.landmarker.detectForVideo(video, performance.now())
    const landmarks = result.landmarks[0]
    if (landmarks) {
      const tip = landmarks[INDEX_FINGER_TIP]
      const { x, y } = this.toViewport(tip.x, tip.y)
      if (this.hasPrev) {
        this.sx += (x - this.sx) * SMOOTHING
        this.sy += (y - this.sy) * SMOOTHING
      } else {
        this.sx = x
        this.sy = y
        this.hasPrev = true
      }
      this.missedFrames = 0
      this.onPointer({ x: this.sx, y: this.sy, visible: true })
    } else if (++this.missedFrames > MAX_MISSED_FRAMES) {
      this.hasPrev = false
      this.onPointer({ x: this.sx, y: this.sy, visible: false })
    }
  }

  /**
   * Normalisierte Videokoordinaten → Viewport-Pixel. Berücksichtigt das
   * Cover-Cropping des Vollbild-Videos und die horizontale Spiegelung.
   */
  private toViewport(nx: number, ny: number): { x: number; y: number } {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scale = Math.max(vw / this.video.videoWidth, vh / this.video.videoHeight)
    const dispW = this.video.videoWidth * scale
    const dispH = this.video.videoHeight * scale
    const px = nx * dispW + (vw - dispW) / 2
    const py = ny * dispH + (vh - dispH) / 2
    return { x: vw - px, y: py }
  }
}
