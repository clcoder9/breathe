import {
  AnimationAction,
  AnimationMixer,
  Box3,
  DirectionalLight,
  Euler,
  HemisphereLight,
  LoopOnce,
  Matrix4,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { FaceState } from './types'

/**
 * Blendshape-Zuordnung: FaceState-Wert → Namensmuster im Modell.
 * Die Quirky-Series-Tiere (Omabuarts) haben v. a. Augen-Shapekeys
 * (Eyes_Blink, Eyes_Happy, …); gematcht wird tolerant per Teilstring,
 * damit auch andere Modelle (z. B. ARKit-Namen) funktionieren.
 */
const MORPH_PATTERNS: { key: keyof FaceState; patterns: string[] }[] = [
  { key: 'smile', patterns: ['happy', 'smile'] },
  { key: 'browDown', patterns: ['annoyed', 'angry', 'browdown', 'frown'] },
  { key: 'browUp', patterns: ['excited', 'surprised', 'browinnerup'] },
  { key: 'eyeBlink', patterns: ['blink'] },
  { key: 'jawOpen', patterns: ['jawopen', 'mouthopen'] },
]

/**
 * Reaktions-Shapekeys (erster Treffer gewinnt) und -Animationen (aus allen
 * Treffern wird zufällig gewählt, damit Wiederholungen abwechslungsreich sind).
 * Deckt die Quaternius-Roboter-Clips (Robot_ThumbsUp, Robot_No, …) und
 * gängige andere Namensschemata ab.
 */
const REACTIONS = {
  correct: {
    morphs: ['excited', 'happy', 'smile'],
    clips: ['thumbsup', 'yes', 'dance', 'wave', 'jump', 'bounce', 'spin', 'clicked'],
  },
  wrong: {
    morphs: ['sad', 'cry', 'trauma', 'frown'],
    clips: ['_no', 'death', 'hit', 'fear', 'sit'],
  },
} as const

/** Glättung der Morph- und Kopfbewegungen (0..1, Anteil pro Frame) */
const LERP = 0.35
/** Maximale Kopfdrehung des Avatars in Radiant */
const MAX_HEAD_ANGLE = 0.6
/** Dauer, für die eine Reaktion die Live-Mimik übersteuert */
const REACTION_MS = 2200

interface MorphRef {
  mesh: Mesh
  index: number
}

/**
 * Kleiner 3D-Avatar (GLB via Three.js), der die Mimik des Spielers spiegelt,
 * die Kopfdrehung übernimmt und auf Quiz-Ereignisse reagiert.
 * Läuft komplett lokal; schlägt das Laden fehl, bleibt der Emoji-Fallback aktiv.
 */
export class Avatar3D {
  private renderer?: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(35, 1, 0.05, 100)
  private timer = new Timer()
  private mixer?: AnimationMixer
  private model?: Object3D
  private idleAction?: AnimationAction
  private raf = 0

  private morphs = new Map<string, MorphRef[]>()
  private clips = new Map<string, AnimationAction>()
  private targetInfluence = new Map<string, number>()
  private headTarget = new Euler()
  private headQuat = new Quaternion()
  private headBone?: Object3D
  private reactionUntil = 0
  private reactionMorph = ''

  constructor(private container: HTMLElement) {}

  async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url)
    this.model = gltf.scene
    this.scene.add(this.model)
    this.collectMorphs()
    this.setupAnimations(gltf.animations)
    this.setupSceneAndRenderer()
    // Kopf-Knochen suchen: Kopfdrehung wirkt dann nur auf den Kopf statt aufs Modell
    this.model.traverse((obj) => {
      if (!this.headBone && obj.name.toLowerCase().includes('head') && !(obj as Mesh).isMesh) {
        this.headBone = obj
      }
    })
  }

  /** Live-Mimik übernehmen (außer während einer laufenden Reaktion) */
  applyFace(f: FaceState): void {
    const now = performance.now()
    const reacting = now < this.reactionUntil

    if (!reacting) {
      for (const { key, patterns } of MORPH_PATTERNS) {
        const value = f.visible ? (f[key] as number) : 0
        this.setMorphTarget(patterns, value)
      }
    }

    if (f.visible && f.headMatrix) {
      const rot = new Euler().setFromRotationMatrix(
        new Matrix4().fromArray(f.headMatrix as number[]),
      )
      // Spiegel-Verhalten (Selfie-Ansicht): Gier- und Rollwinkel invertieren
      this.headTarget.set(
        clamp(rot.x, MAX_HEAD_ANGLE),
        clamp(-rot.y, MAX_HEAD_ANGLE),
        clamp(-rot.z, MAX_HEAD_ANGLE),
      )
    } else {
      this.headTarget.set(0, 0, 0)
    }
  }

  /** Quiz-Ereignis: kurze Animation + passender Gesichtsausdruck */
  react(kind: keyof typeof REACTIONS): void {
    const spec = REACTIONS[kind]
    const until = performance.now() + REACTION_MS
    this.reactionUntil = until
    if (this.reactionMorph) this.setMorphTarget([this.reactionMorph], 0)
    const morph = spec.morphs.find((m) => this.findMorphs(m).length > 0)
    if (morph) {
      this.reactionMorph = morph
      this.setMorphTarget([morph], 1)
      // Ausdruck wieder abklingen lassen (falls keine Live-Mimik ihn übernimmt)
      setTimeout(() => {
        if (this.reactionUntil === until) this.setMorphTarget([morph], 0)
      }, REACTION_MS)
    }
    const candidates = [...this.clips.keys()].filter((name) =>
      spec.clips.some((pattern) => name.includes(pattern)),
    )
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      const action = this.clips.get(pick)!
      const durationMs = Math.max(action.getClip().duration * 1000, 800)
      action.reset()
      action.setLoop(LoopOnce, 1)
      action.clampWhenFinished = false
      if (this.idleAction && this.idleAction !== action) {
        this.idleAction.crossFadeTo(action, 0.2, false)
        setTimeout(() => this.resumeIdle(action), durationMs)
      }
      action.play()
    }
  }

  setVisible(visible: boolean): void {
    this.container.classList.toggle('hidden', !visible)
    if (visible) {
      if (!this.raf) this.tick()
    } else {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
  }

  /** Gefundene Morphs/Clips für Diagnose (Konsole) */
  describe(): string {
    return `Morphs: ${[...this.morphs.keys()].join(', ') || '–'} | Clips: ${[...this.clips.keys()].join(', ') || '–'}`
  }

  private resumeIdle(from: AnimationAction): void {
    if (!this.idleAction) return
    this.idleAction.reset()
    from.crossFadeTo(this.idleAction, 0.3, false)
    this.idleAction.play()
  }

  private collectMorphs(): void {
    this.model?.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh || !mesh.morphTargetDictionary) return
      for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
        const key = name.toLowerCase()
        const list = this.morphs.get(key) ?? []
        list.push({ mesh, index })
        this.morphs.set(key, list)
      }
    })
  }

  private setupAnimations(clips: import('three').AnimationClip[]): void {
    if (!this.model || clips.length === 0) return
    this.mixer = new AnimationMixer(this.model)
    for (const clip of clips) {
      this.clips.set(clip.name.toLowerCase(), this.mixer.clipAction(clip))
    }
    const idleName = [...this.clips.keys()].find((n) => n.includes('idle'))
    if (idleName) {
      this.idleAction = this.clips.get(idleName)
      this.idleAction!.play()
    }
  }

  private setupSceneAndRenderer(): void {
    this.scene.add(new HemisphereLight(0xffffff, 0x556699, 3.4))
    const sun = new DirectionalLight(0xffffff, 2.4)
    sun.position.set(1.5, 2, 2.5)
    this.scene.add(sun)

    // Kamera automatisch auf das Modell einpassen (leicht erhöht, Blick zum Kopf)
    const box = new Box3().setFromObject(this.model!)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const dist = (Math.max(size.y, size.x) / Math.tan((this.camera.fov * Math.PI) / 360)) * 0.62
    this.camera.position.set(center.x, center.y + size.y * 0.15, center.z + dist)
    this.camera.lookAt(center.x, center.y + size.y * 0.1, center.z)

    const renderer = new WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const px = this.container.clientWidth || 180
    renderer.setSize(px, px)
    this.container.appendChild(renderer.domElement)
    this.renderer = renderer
  }

  private findMorphs(pattern: string): MorphRef[] {
    const result: MorphRef[] = []
    for (const [name, refs] of this.morphs) {
      if (name.includes(pattern)) result.push(...refs)
    }
    return result
  }

  private setMorphTarget(patterns: string[], value: number): void {
    for (const pattern of patterns) {
      const refs = this.findMorphs(pattern)
      if (refs.length === 0) continue
      this.targetInfluence.set(pattern, value)
      return
    }
  }

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick)
    this.timer.update()
    this.mixer?.update(this.timer.getDelta())

    for (const [pattern, target] of this.targetInfluence) {
      for (const { mesh, index } of this.findMorphs(pattern)) {
        const current = mesh.morphTargetInfluences![index]
        mesh.morphTargetInfluences![index] = current + (target - current) * LERP
      }
    }

    // Kopfdrehung nach dem Mixer-Update anwenden, damit sie die Animation überlagert
    const target = new Quaternion().setFromEuler(this.headTarget)
    this.headQuat.slerp(target, LERP * 0.6)
    if (this.headBone) {
      this.headBone.quaternion.multiply(this.headQuat)
    } else if (this.model) {
      this.model.quaternion.copy(this.headQuat)
    }

    this.renderer?.render(this.scene, this.camera)
  }
}

function clamp(v: number, max: number): number {
  return Math.min(max, Math.max(-max, v))
}
