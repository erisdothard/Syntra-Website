import * as THREE from 'three'
import { applySurfaceDetail, createDetailUniforms } from '../components/scene/shaders/surfaceDetail'
import type { DetailUniforms } from '../components/scene/shaders/surfaceDetail'

/**
 * Classifies the NASA Saturn V export's flat Blinn materials and replaces
 * them with physically based ones. Names come from the original Maya scene:
 *   blinn1SG  white body paint        blinn2SG  black roll pattern
 *   blinn5SG  light grey upper stage  blinn3SG  tan interstage band
 *   blinn4SG  warm grey heat shield   blinn6SG  grey engine mounts
 *   initialShadingGroup engine nozzles   fin_*  fins
 *   blinn8-11SG  decal textures (flags, USA, UNITED STATES)
 */
export type Kind = 'paint' | 'dark' | 'metal' | 'decal' | 'nozzle'

export interface RocketMaterialSet {
  uniforms: DetailUniforms
  /** Emissive-capable metal materials (engine bells) for heat glow. */
  hot: THREE.MeshPhysicalMaterial[]
  /** All created materials, for disposal. */
  all: THREE.MeshPhysicalMaterial[]
}

function classify(name: string, color: THREE.Color): Kind {
  if (/^blinn(8|9|10|11)SG/.test(name)) return 'decal'
  if (/^initialShading/.test(name)) return 'nozzle'
  if (/^blinn6SG/.test(name)) return 'metal'
  if (/^blinn4SG/.test(name)) return 'metal'
  if (/^blinn3SG/.test(name)) return 'metal'
  if (/^(blinn2SG|fin_blinn2SG)/.test(name)) return 'dark'
  const l = color.r + color.g + color.b
  return l < 0.6 ? 'dark' : 'paint'
}

export function upgradeRocketMaterials(root: THREE.Object3D): RocketMaterialSet {
  const uniforms = createDetailUniforms()
  const cache = new Map<THREE.Material, THREE.MeshPhysicalMaterial>()
  const hot: THREE.MeshPhysicalMaterial[] = []
  const all: THREE.MeshPhysicalMaterial[] = []

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const replaced = mats.map((src) => {
      const hit = cache.get(src)
      if (hit) return hit
      const s = src as THREE.MeshStandardMaterial
      const color = s.color ? s.color.clone() : new THREE.Color('#cccccc')
      const kind = classify(src.name, color)
      const m = new THREE.MeshPhysicalMaterial({ name: `${src.name}:${kind}` })
      m.side = THREE.FrontSide
      switch (kind) {
        case 'paint':
          m.color.set('#CFCCC5')
          m.roughness = 0.42
          m.metalness = 0.0
          m.clearcoat = 0.25
          m.clearcoatRoughness = 0.38
          m.envMapIntensity = 1.0
          applySurfaceDetail(m, uniforms, 'paint')
          break
        case 'dark':
          m.color.set('#0C0C10')
          m.roughness = 0.48
          m.metalness = 0.05
          m.clearcoat = 0.2
          m.clearcoatRoughness = 0.5
          m.envMapIntensity = 1.0
          applySurfaceDetail(m, uniforms, 'dark')
          break
        case 'metal':
          m.color.copy(color).multiplyScalar(0.75)
          m.roughness = 0.45
          m.metalness = 0.85
          m.envMapIntensity = 1.2
          applySurfaceDetail(m, uniforms, 'metal')
          break
        case 'nozzle':
          m.color.set('#5C5854')
          m.roughness = 0.32
          m.metalness = 1.0
          m.envMapIntensity = 1.4
          m.emissive.set('#FF5A1A')
          m.emissiveIntensity = 0
          hot.push(m)
          break
        case 'decal':
          m.map = s.map ?? null
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
          m.color.set('#FFFFFF')
          m.roughness = 0.45
          m.metalness = 0.0
          m.clearcoat = 0.2
          m.clearcoatRoughness = 0.4
          break
      }
      cache.set(src, m)
      all.push(m)
      return m
    })
    mesh.material = replaced.length === 1 ? replaced[0] : replaced
  })

  return { uniforms, hot, all }
}
