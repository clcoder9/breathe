// Erzeugt ein synthetisches Test-Maskottchen (public/models/avatar.glb) mit
// Quirky-artigen Morphtargets und Animationen, um die Avatar-Pipeline ohne
// das echte CC-BY-Modell zu testen. NICHT deployen – nach dem Test löschen
// bzw. durch das echte Modell ersetzen. Aufruf: node scripts/make-test-avatar.mjs
import { writeFileSync } from 'node:fs'

// Minimaler FileReader-Polyfill für GLTFExporter unter Node
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result
      this.onloadend?.({ target: this })
      this.onload?.({ target: this })
    })
  }
}
import {
  AnimationClip,
  BufferAttribute,
  Color,
  Mesh,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  Scene,
  SphereGeometry,
  VectorKeyframeTrack,
} from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const geometry = new SphereGeometry(0.5, 24, 16)
const positions = geometry.attributes.position

// Morphtarget 1: „Eyes_Happy“ – obere Hälfte leicht gestaucht
const happy = new Float32Array(positions.count * 3)
// Morphtarget 2: „Eyes_Blink“ – Kugel vertikal plattgedrückt
const blink = new Float32Array(positions.count * 3)
for (let i = 0; i < positions.count; i++) {
  const y = positions.getY(i)
  happy[i * 3 + 1] = y > 0 ? y + Math.max(0, y) * -0.3 : y
  happy[i * 3] = positions.getX(i)
  happy[i * 3 + 2] = positions.getZ(i)
  blink[i * 3] = positions.getX(i) * 1.1
  blink[i * 3 + 1] = y * 0.35
  blink[i * 3 + 2] = positions.getZ(i) * 1.1
}
geometry.morphAttributes.position = [
  Object.assign(new BufferAttribute(happy, 3), { name: 'Eyes_Happy' }),
  Object.assign(new BufferAttribute(blink, 3), { name: 'Eyes_Blink' }),
]
geometry.morphTargetsRelative = false

const mesh = new Mesh(
  geometry,
  new MeshStandardMaterial({ color: new Color('#ffb347'), roughness: 0.5 }),
)
mesh.name = 'TestHead'
mesh.morphTargetInfluences = [0, 0]
mesh.updateMorphTargets()

const scene = new Scene()
scene.add(mesh)

// Animationen: Idle_A (sanftes Pulsieren), Jump (Hüpfer), Hit (Zusammenzucken)
const idle = new AnimationClip('Idle_A', 2, [
  new VectorKeyframeTrack('TestHead.scale', [0, 1, 2], [1, 1, 1, 1.05, 1.05, 1.05, 1, 1, 1]),
])
const jump = new AnimationClip('Jump', 0.8, [
  new VectorKeyframeTrack(
    'TestHead.position',
    [0, 0.2, 0.4, 0.8],
    [0, 0, 0, 0, 0.35, 0, 0, 0.15, 0, 0, 0, 0],
  ),
])
const hit = new AnimationClip('Hit', 0.6, [
  new NumberKeyframeTrack('TestHead.morphTargetInfluences[Eyes_Blink]', [0, 0.3, 0.6], [0, 1, 0]),
])

const exporter = new GLTFExporter()
const buffer = await exporter.parseAsync(scene, {
  binary: true,
  animations: [idle, jump, hit],
})
writeFileSync('public/models/avatar.glb', Buffer.from(buffer))
console.log('Test-Avatar geschrieben: public/models/avatar.glb')
