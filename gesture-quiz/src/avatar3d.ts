import {
  AnimationAction,
  AnimationMixer,
  Box3,
  BoxGeometry,
  DirectionalLight,
  Euler,
  HemisphereLight,
  LoopOnce,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  QuadraticBezierCurve3,
  Quaternion,
  Scene,
  Timer,
  TubeGeometry,
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
/** Totzone: kleinere Winkel gelten als „geradeaus“ (gegen Zittern/Kamera-Offset) */
const HEAD_DEADZONE = 0.08
/** Dauer, für die eine Reaktion die Live-Mimik übersteuert */
const REACTION_MS = 2200
/** Mund in Ruhe: fast gerade Linie (Anteil der vollen Krümmung) */
const MOUTH_NEUTRAL = 0.12

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
  /** Bone-Rotation ohne unsere Kopfdrehung – verhindert Akkumulation über Frames */
  private headClean?: Quaternion
  private reactionUntil = 0
  private reactionMorph = ''
  /** Prozedurale Gesichtsteile (für Modelle ohne Gesichts-Morphs) */
  private mouth?: Mesh
  private mouthTarget = 0
  private mouthValue = 0
  /** Brauen: -1 zusammengezogen/runter .. +1 hochgezogen */
  private brows: Mesh[] = []
  private browBaseY = 0
  private browTarget = 0
  private browValue = 0
  /** Augenlider: 0 offen .. 1 geschlossen; Index 0 = Bildschirm-links */
  private lids: Mesh[] = []
  private lidTargets: [number, number] = [0, 0]
  private lidValues: [number, number] = [0, 0]
  private headW = 0

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
    // Modelle ohne Gesichts-Morphs bekommen prozedurale Gesichtsteile
    if (this.morphs.size === 0) this.addFaceParts()
  }

  /**
   * Prozedurales Gesicht am starren Kopf-Mesh (Gesicht zeigt in lokaler
   * −z-Richtung des FBX-Exports): „LED“-Mund (Lächeln/Schmollen), bewegliche
   * LED-Brauen und orangefarbene Lid-Blenden zum Blinzeln. Geskinnte Modelle
   * haben i. d. R. eigene Morphs und brauchen das nicht.
   */
  private addFaceParts(): void {
    let headMesh: Mesh | undefined
    this.model?.traverse((obj) => {
      const mesh = obj as Mesh
      if (!headMesh && mesh.isMesh && obj.name.toLowerCase().includes('head')) headMesh = mesh
    })
    if (!headMesh || (headMesh as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) return
    headMesh.geometry.computeBoundingBox()
    const bb = headMesh.geometry.boundingBox!
    const size = new Vector3()
    bb.getSize(size)
    // Lokale Achsen des Kopf-Meshes (per Welt-Messung ermittelt):
    // x = seitlich, −y = vorne (Gesicht), +z = oben
    const w = size.x
    this.headW = w
    const cx = (bb.min.x + bb.max.x) / 2
    const front = bb.min.y
    const bottom = bb.min.z
    const hz = size.z

    const ledMaterial = (): MeshStandardMaterial =>
      new MeshStandardMaterial({
        color: 0xeef4ff,
        emissive: 0x88aaff,
        emissiveIntensity: 0.7,
        roughness: 0.35,
      })

    // Mund: Lächel-/Schmoll-Bogen in der x/z-Ebene (Bogen zeigt nach unten)
    const curve = new QuadraticBezierCurve3(
      new Vector3(-w * 0.18, 0, 0),
      new Vector3(0, 0, -w * 0.16),
      new Vector3(w * 0.18, 0, 0),
    )
    const mouth = new Mesh(new TubeGeometry(curve, 16, w * 0.055, 8), ledMaterial())
    mouth.position.set(cx, front + size.y * 0.24, bottom - w * 0.03)
    mouth.scale.z = MOUTH_NEUTRAL
    headMesh.add(mouth)
    this.mouth = mouth

    // Brauen: zwei kräftig blaue LED-Balken über den Augen,
    // heben/senken entlang z + Zornes-Neigung um die Blickachse (y)
    this.browBaseY = bottom + hz * 0.88
    for (const side of [1, -1]) {
      const brow = new Mesh(
        new BoxGeometry(w * 0.24, w * 0.02, w * 0.055),
        new MeshStandardMaterial({
          color: 0x2255cc,
          emissive: 0x2266ff,
          emissiveIntensity: 1.1,
          roughness: 0.35,
        }),
      )
      brow.position.set(cx + side * w * 0.27, front - w * 0.01, this.browBaseY)
      headMesh.add(brow)
      this.brows.push(brow)
    }

    // Lider: kopffarbene Blenden, die sich von oben (+z) über die Augen schieben
    for (const side of [1, -1]) {
      const lidGeo = new BoxGeometry(w * 0.28, w * 0.015, w * 0.26)
      lidGeo.translate(0, 0, -w * 0.13) // Ursprung an der Oberkante → schließt nach unten
      const lid = new Mesh(
        lidGeo,
        new MeshStandardMaterial({ color: 0xe0a23f, roughness: 0.6 }),
      )
      lid.position.set(cx + side * w * 0.27, front - w * 0.005, bottom + hz * 0.70)
      lid.scale.z = 0.05
      headMesh.add(lid)
      this.lids.push(lid)
    }
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
      // Verstärkt, damit ein normales Lächeln/Brauenheben deutlich sichtbar wird
      this.mouthTarget = f.visible ? Math.min(1, f.smile * 1.7) : 0
      this.browTarget = f.visible
        ? Math.min(1, f.browUp * 1.6) - Math.min(1, f.browDown * 1.6)
        : 0
    }

    // Blinzeln läuft auch während Reaktionen; Spiegelbild: das Lid auf derselben
    // Bildschirmseite wie das Auge der Person schließt sich.
    // lids[0] sitzt auf +x = Bildschirm rechts = rechtes Auge der Person.
    // Schwelle nötig: MediaPipe meldet bei offenen Augen oft schon 0.3–0.5.
    this.lidTargets = f.visible
      ? [lidAmount(f.eyeBlinkRight), lidAmount(f.eyeBlinkLeft)]
      : [0, 0]

    if (f.visible && f.headMatrix) {
      const rot = new Euler().setFromRotationMatrix(
        new Matrix4().fromArray(f.headMatrix as number[]),
      )
      // Spiegel-Verhalten (Selfie-Ansicht): Gier- und Rollwinkel invertieren
      this.headTarget.set(
        clamp(deadzone(rot.x), MAX_HEAD_ANGLE),
        clamp(deadzone(-rot.y), MAX_HEAD_ANGLE),
        clamp(deadzone(-rot.z), MAX_HEAD_ANGLE),
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
    // Prozedurales Gesicht: strahlen bzw. schmollen (inkl. Brauen), danach neutral
    this.mouthTarget = kind === 'correct' ? 1 : -0.8
    this.browTarget = kind === 'correct' ? 1 : -1
    setTimeout(() => {
      if (this.reactionUntil === until) {
        this.mouthTarget = 0
        this.browTarget = 0
      }
    }, REACTION_MS)
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
    // Eigene Kopfdrehung vom Vorframe entfernen, bevor der Mixer (evtl.) animiert –
    // sonst akkumuliert die Drehung, wenn kein Clip den Head-Bone zurücksetzt
    if (this.headBone && this.headClean) {
      this.headBone.quaternion.copy(this.headClean)
    }
    this.mixer?.update(this.timer.getDelta())

    for (const [pattern, target] of this.targetInfluence) {
      for (const { mesh, index } of this.findMorphs(pattern)) {
        const current = mesh.morphTargetInfluences![index]
        mesh.morphTargetInfluences![index] = current + (target - current) * LERP
      }
    }

    // Prozedurales Gesicht weich überblenden (Kopf-lokal: −y vorne, +z oben)
    if (this.mouth) {
      this.mouthValue += (this.mouthTarget - this.mouthValue) * LERP
      this.mouth.scale.z = MOUTH_NEUTRAL + this.mouthValue * (1 - MOUTH_NEUTRAL)
      this.mouth.scale.x = 1 + Math.max(0, this.mouthValue) * 0.3
    }
    if (this.brows.length === 2) {
      this.browValue += (this.browTarget - this.browValue) * LERP
      const lift = this.browValue * this.headW * 0.07
      // Zornes-Neigung: bei gesenkten Brauen kippen die inneren Enden nach unten
      const tilt = Math.max(0, -this.browValue) * 0.45
      this.brows[0].position.z = this.browBaseY + lift
      this.brows[1].position.z = this.browBaseY + lift
      this.brows[0].rotation.y = tilt
      this.brows[1].rotation.y = -tilt
    }
    for (let i = 0; i < this.lids.length; i++) {
      // Blinzeln ist schnell – stärker nachziehen als die übrige Mimik
      this.lidValues[i] += (this.lidTargets[i] - this.lidValues[i]) * 0.5
      this.lids[i].scale.z = 0.05 + this.lidValues[i] * 0.95
    }

    // Kopfdrehung nach dem Mixer-Update anwenden, damit sie die Animation überlagert
    const target = new Quaternion().setFromEuler(this.headTarget)
    this.headQuat.slerp(target, LERP * 0.6)
    if (this.headBone) {
      this.headClean = (this.headClean ?? new Quaternion()).copy(this.headBone.quaternion)
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

function deadzone(v: number): number {
  return Math.abs(v) < HEAD_DEADZONE ? 0 : v - Math.sign(v) * HEAD_DEADZONE
}

/** Blink-Score → Lidschluss: unter 0.35 offen, ab 0.7 ganz geschlossen */
function lidAmount(score: number): number {
  return Math.min(1, Math.max(0, (score - 0.35) / 0.35))
}
