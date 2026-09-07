import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { upgradeRocketMaterials } from '../../../lib/rocketMaterials'
import { Exhaust } from './Exhaust'

/** Saturn V: NASA model is ~13 units tall with the axis at (−0.01, y, 0.74). */
const MODEL_SCALE = 1.85
const AXIS = new THREE.Vector3(-0.01, -0.14, 0.74) // subtract to put engine plane at y=0 on the axis

export const ROCKET_R = 0.65 * MODEL_SCALE
export const ROCKET_H = 13 * MODEL_SCALE
export const LIFT_UNITS = 95
/** Engine plane height: the vehicle stands on the Mobile Launcher deck. */
export const ROCKET_BASE_Y = 2.9

const MODEL_URL = '/models/saturn-v.glb'
const DRACO = '/draco/'

/**
 * Foreground layer. The vehicle group translates on lift; Exhaust is a child
 * so the plumes stay glued to the F-1 cluster during ascent.
 */
export function Rocket() {
  const group = useRef<THREE.Group>(null)
  const gltf = useGLTF(MODEL_URL, DRACO)

  // Clone once so material replacement never touches the cached asset.
  const { scene, mats, engines } = useMemo(() => {
    const scene = gltf.scene.clone(true)
    const mats = upgradeRocketMaterials(scene)
    // F-1 engine bell positions in rocket-local space (after axis shift + scale)
    const engines: THREE.Vector3[] = []
    const box = new THREE.Box3()
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && /^polySurfa/.test(o.name)) {
        box.setFromObject(o)
        const c = box.getCenter(new THREE.Vector3()).sub(AXIS).multiplyScalar(MODEL_SCALE)
        engines.push(new THREE.Vector3(c.x, 0.15, c.z))
      }
    })
    if (engines.length === 0) engines.push(new THREE.Vector3(0, 0.15, 0))
    return { scene, mats, engines }
  }, [gltf])

  useEffect(() => () => mats.all.forEach((m) => m.dispose()), [mats])

  useFrame((state) => {
    const s = scrollState
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    // Pressure breathing + ignition rumble (small, high frequency)
    const rumble = (s.ignition * 0.05 + s.pressure * 0.012) * (1 - s.altitude * 0.6)
    g.position.x = Math.sin(t * 43.0) * rumble + Math.sin(t * 61.0) * rumble * 0.5
    g.position.z = Math.sin(t * 37.0 + 1.0) * rumble
    g.position.y = ROCKET_BASE_Y + s.lift * LIFT_UNITS
    g.rotation.z = -s.lift * 0.09
    g.rotation.x = Math.sin(t * 0.7) * s.lift * 0.01

    // Surface state: frost builds with venting, boils off at ignition
    mats.uniforms.uFrost.value = Math.max(0, s.vent * 0.9 + s.pressure * 0.35 - s.ignition * 1.4)
    mats.uniforms.uTime.value = t
    // Engine bells glow with ignition
    const heat = s.ignition * 2.4 * (1 + Math.sin(t * 23) * 0.08)
    for (const m of mats.hot) m.emissiveIntensity = heat
  })

  return (
    <group ref={group} position={[0, ROCKET_BASE_Y, 0]}>
      <group scale={MODEL_SCALE} position={[-AXIS.x * MODEL_SCALE, -AXIS.y * MODEL_SCALE, -AXIS.z * MODEL_SCALE]}>
        <primitive object={scene} />
      </group>
      <Exhaust engines={engines} liftUnits={LIFT_UNITS} baseY={ROCKET_BASE_Y} />
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO)
