import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { Exhaust } from './Exhaust'

export const ROCKET_R = 1.7
export const BODY_H = 19
export const LIFT_UNITS = 95
/** Height of the engine plane above the pad — the vehicle sits on a launch mount. */
export const ROCKET_BASE_Y = 3.4

/**
 * Foreground layer. The vehicle group translates on lift; Exhaust is a child
 * so the flame stays glued to the engines during ascent.
 */
export function Rocket() {
  const group = useRef<THREE.Group>(null)

  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#D8DAE0', roughness: 0.42, metalness: 0.25 }),
    [],
  )
  const band = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#15171E', roughness: 0.55, metalness: 0.5 }),
    [],
  )
  const accent = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FF6A1A', roughness: 0.5, metalness: 0.2, emissive: '#FF6A1A', emissiveIntensity: 0.15 }),
    [],
  )
  const engine = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2B2E38', roughness: 0.35, metalness: 0.9 }),
    [],
  )

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
    // Gentle pitch program as it climbs
    g.rotation.z = -s.lift * 0.09
    g.rotation.x = Math.sin(t * 0.7) * s.lift * 0.01
  })

  const fins = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2)

  return (
    <group ref={group} position={[0, ROCKET_BASE_Y, 0]}>
      {/* Engine bells */}
      {[[0, 0], [ROCKET_R * 0.55, 0], [-ROCKET_R * 0.55, 0], [0, ROCKET_R * 0.55], [0, -ROCKET_R * 0.55]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.9, 0.85, z * 0.9]} material={engine}>
          <cylinderGeometry args={[0.32, 0.62, 1.5, 20, 1, true]} />
        </mesh>
      ))}
      {/* Thrust structure */}
      <mesh position={[0, 1.75, 0]} material={band}>
        <cylinderGeometry args={[ROCKET_R * 0.96, ROCKET_R * 0.8, 0.9, 40]} />
      </mesh>
      {/* Main body */}
      <mesh position={[0, 2.2 + BODY_H / 2, 0]} material={skin}>
        <cylinderGeometry args={[ROCKET_R, ROCKET_R, BODY_H, 48, 1]} />
      </mesh>
      {/* Bands */}
      <mesh position={[0, 2.2 + BODY_H * 0.18, 0]} material={band}>
        <cylinderGeometry args={[ROCKET_R + 0.02, ROCKET_R + 0.02, 0.6, 48]} />
      </mesh>
      <mesh position={[0, 2.2 + BODY_H * 0.62, 0]} material={band}>
        <cylinderGeometry args={[ROCKET_R + 0.02, ROCKET_R + 0.02, 1.4, 48]} />
      </mesh>
      <mesh position={[0, 2.2 + BODY_H * 0.72, 0]} material={accent}>
        <cylinderGeometry args={[ROCKET_R + 0.025, ROCKET_R + 0.025, 0.22, 48]} />
      </mesh>
      {/* Interstage + nose */}
      <mesh position={[0, 2.2 + BODY_H + 0.6, 0]} material={band}>
        <cylinderGeometry args={[ROCKET_R * 0.92, ROCKET_R, 1.2, 48]} />
      </mesh>
      <mesh position={[0, 2.2 + BODY_H + 1.2 + 2.9, 0]} material={skin}>
        <coneGeometry args={[ROCKET_R * 0.92, 5.8, 48]} />
      </mesh>
      {/* Fins */}
      {fins.map((a, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[ROCKET_R + 0.9, 3.4, 0]} rotation={[0, 0, 0.32]} material={band}>
            <boxGeometry args={[2.2, 3.2, 0.14]} />
          </mesh>
        </group>
      ))}
      {/* Cable raceway */}
      <mesh position={[ROCKET_R + 0.12, 2.2 + BODY_H / 2, 0]} material={band}>
        <boxGeometry args={[0.24, BODY_H - 1, 0.5]} />
      </mesh>

      <Exhaust />
    </group>
  )
}
