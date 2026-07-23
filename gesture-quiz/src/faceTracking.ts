import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'
import type { FaceState } from './types'

/** Landmark-Index der Nasenspitze im MediaPipe-Gesichtsmodell */
const NOSE_TIP = 1

const NO_FACE: FaceState = {
  visible: false,
  smile: 0,
  jawOpen: 0,
  browUp: 0,
  browDown: 0,
  eyeBlink: 0,
  eyeBlinkLeft: 0,
  eyeBlinkRight: 0,
  noseX: 0,
  noseY: 0,
}

/**
 * Erkennt Mimik über MediaPipe-Blendshapes – komplett lokal im Browser.
 * Es werden nur flüchtige Zahlenwerte pro Frame ausgewertet (z. B. „Lächeln:
 * 0.8“); nichts wird gespeichert oder übertragen, keine Identifikation.
 */
export class FaceTracker {
  onFace: (f: FaceState) => void = () => {}

  private landmarker?: FaceLandmarker
  private lastVideoTime = -1
  private raf = 0

  constructor(private video: HTMLVideoElement) {}

  async init(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks('wasm')
    this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: 'models/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
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
    const landmarks = result.faceLandmarks[0]
    const blendshapes = result.faceBlendshapes[0]?.categories
    if (!landmarks || !blendshapes) {
      this.onFace(NO_FACE)
      return
    }

    const score = new Map(blendshapes.map((c) => [c.categoryName, c.score]))
    const get = (name: string): number => score.get(name) ?? 0
    const nose = landmarks[NOSE_TIP]
    this.onFace({
      visible: true,
      smile: (get('mouthSmileLeft') + get('mouthSmileRight')) / 2,
      jawOpen: get('jawOpen'),
      browUp: get('browInnerUp'),
      browDown: (get('browDownLeft') + get('browDownRight')) / 2,
      eyeBlink: (get('eyeBlinkLeft') + get('eyeBlinkRight')) / 2,
      eyeBlinkLeft: get('eyeBlinkLeft'),
      eyeBlinkRight: get('eyeBlinkRight'),
      noseX: nose.x,
      noseY: nose.y,
      headMatrix: result.facialTransformationMatrixes?.[0]?.data,
    })
  }
}
