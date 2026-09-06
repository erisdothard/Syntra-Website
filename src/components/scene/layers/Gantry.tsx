import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'

const TOWER_X = -6.2
const TOWER_H = 27
const LEVELS = 9
const HALF = 1.3

const tmp = new THREE.Object3D()
const PIT_W = 9
const PIT_D = 15

/** Pad surface with a rectangular cutout for the flame trench. */
function padShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-40, -40); shape.lineTo(40, -40); shape.lineTo(40, 40); shape.lineTo(-40, 40); shape.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-PIT_W / 2, -PIT_D / 2); hole.lineTo(PIT_W / 2, -PIT_D / 2); hole.lineTo(PIT_W / 2, PIT_D / 2); hole.lineTo(-PIT_W / 2, PIT_D / 2); hole.closePath()
  shape.holes.push(hole)
  return new THREE.ShapeGeometry(shape, 4)
}

/**
 * Midground layer: pad, flame trench, lattice tower, umbilical arms,
 * lightning masts. Sits behind the rocket; the masts are pushed far back so
 * the three depths read as separate parallax planes.
 */
export function Gantry() {
  const bars = useRef<THREE.InstancedMesh>(null)
  const armA = useRef<THREE.Group>(null)
  const armB = useRef<THREE.Group>(null)
  const trench = useRef<THREE.MeshStandardMaterial>(null)
  const beacons = useRef<THREE.MeshStandardMaterial>(null)
  const padLight = useRef<THREE.MeshStandardMaterial>(null)

  // Lattice: horizontal bars around four columns at each level, plus diagonals
  const barCount = LEVELS * 8
  useLayoutEffect(() => {
    if (!bars.current) return
    let i = 0
    for (let l = 0; l < LEVELS; l++) {
      const y = (l + 1) * (TOWER_H / LEVELS)
      // 4 horizontals (square ring)
      const ring: Array<[number, number, number]> = [
        [0, HALF, 0], [0, -HALF, 0], [HALF, 0, Math.PI / 2], [-HALF, 0, Math.PI / 2],
      ]
      for (const [x, z, ry] of ring) {
        tmp.position.set(TOWER_X + x, y, z)
        tmp.rotation.set(0, ry, 0)
        tmp.scale.set(HALF * 2, 1, 1)
        tmp.updateMatrix()
        bars.current.setMatrixAt(i++, tmp.matrix)
      }
      // 4 diagonals (X bracing on front and back faces)
      const diag = Math.hypot(HALF * 2, TOWER_H / LEVELS)
      const ang = Math.atan2(TOWER_H / LEVELS, HALF * 2)
      const faces: Array<[number, number]> = [[HALF, 1], [-HALF, -1]]
      for (const [z, sgn] of faces) {
        tmp.position.set(TOWER_X, y - TOWER_H / LEVELS / 2, z)
        tmp.rotation.set(0, 0, ang * sgn)
        tmp.scale.set(diag, 0.7, 0.7)
        tmp.updateMatrix()
        bars.current.setMatrixAt(i++, tmp.matrix)
        tmp.rotation.set(0, 0, -ang * sgn)
        tmp.updateMatrix()
        bars.current.setMatrixAt(i++, tmp.matrix)
      }
    }
    bars.current.instanceMatrix.needsUpdate = true
  }, [])

  const steel = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3B3E48', metalness: 0.7, roughness: 0.5 }),
    [],
  )
  const dark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1C1E26', metalness: 0.4, roughness: 0.85 }),
    [],
  )
  const pad = useMemo(padShape, [])

  useFrame((state) => {
    const s = scrollState
    const t = state.clock.elapsedTime
    const swing = -1.75 * s.release
    if (armA.current) armA.current.rotation.y = swing
    if (armB.current) armB.current.rotation.y = swing * 0.9
    if (trench.current) trench.current.emissiveIntensity = s.ignition * 3.5 + s.vent * 0.3
    if (padLight.current) padLight.current.emissiveIntensity = 0.6 + s.ignition * 5
    if (beacons.current) {
      const blink = (Math.sin(t * 2.6) > 0.55 ? 1 : 0.15) * (1 - s.altitude)
      beacons.current.emissiveIntensity = 2.5 * blink + s.ignition * 1.5
    }
  })

  return (
    <group>
      {/* Pad surface with the trench cut out; the trench box below provides the pit floor */}
      <mesh geometry={pad} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1F2128" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Pad surface accent ring (lit by ignition) */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.2, 4.6, 64]} />
        <meshStandardMaterial ref={padLight} color="#2a2c34" emissive="#FF6A1A" emissiveIntensity={0.6} roughness={0.8} />
      </mesh>
      {/* Flame trench: open pit, inner walls glow with ignition */}
      <mesh position={[0, -4, 0]}>
        <boxGeometry args={[PIT_W, 8, PIT_D]} />
        <meshStandardMaterial ref={trench} color="#0C0D12" emissive="#FF6A2A" emissiveIntensity={0} roughness={0.9} side={THREE.BackSide} />
      </mesh>
      {/* Launch mount: four legs spanning the pit, holding the vehicle at ROCKET_BASE_Y */}
      {[[-3.0, -2.4], [3.0, -2.4], [-3.0, 2.4], [3.0, 2.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.7, z]} material={dark}>
          <boxGeometry args={[0.6, 3.4, 0.6]} />
        </mesh>
      ))}
      {/* Open rectangular frame under the engines so the plume passes through */}
      {[[0, 2.4, 6.6, 0.6], [0, -2.4, 6.6, 0.6], [3.0, 0, 0.6, 5.4], [-3.0, 0, 0.6, 5.4]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 3.2, z]} material={dark}>
          <boxGeometry args={[w, 0.4, d]} />
        </mesh>
      ))}

      {/* Tower columns */}
      {[[-HALF, -HALF], [HALF, -HALF], [-HALF, HALF], [HALF, HALF]].map(([x, z], i) => (
        <mesh key={i} position={[TOWER_X + x, TOWER_H / 2, z]} material={steel}>
          <cylinderGeometry args={[0.14, 0.18, TOWER_H, 8]} />
        </mesh>
      ))}
      {/* Lattice bars */}
      <instancedMesh ref={bars} args={[undefined, undefined, barCount]} material={steel}>
        <boxGeometry args={[1, 0.11, 0.11]} />
      </instancedMesh>
      {/* Tower cap + beacons */}
      <mesh position={[TOWER_X, TOWER_H + 0.4, 0]} material={dark}>
        <boxGeometry args={[HALF * 2.6, 0.8, HALF * 2.6]} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[TOWER_X + x * HALF * 1.2, TOWER_H + 1.1, z * HALF * 1.2]}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshStandardMaterial ref={i === 0 ? beacons : undefined} color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={2} />
        </mesh>
      ))}

      {/* Umbilical arms — pivot at the tower face, reach to the rocket skin */}
      <group ref={armA} position={[TOWER_X + HALF, 11.5, 0]}>
        <mesh position={[2.3, 0, 0]} material={steel}>
          <boxGeometry args={[4.6, 0.55, 0.9]} />
        </mesh>
        <mesh position={[4.4, 0, 0]} material={dark}>
          <boxGeometry args={[0.5, 1.4, 1.6]} />
        </mesh>
      </group>
      <group ref={armB} position={[TOWER_X + HALF, 20.5, 0]}>
        <mesh position={[2.3, 0, 0]} material={steel}>
          <boxGeometry args={[4.6, 0.5, 0.8]} />
        </mesh>
        <mesh position={[4.4, 0, 0]} material={dark}>
          <boxGeometry args={[0.5, 1.2, 1.4]} />
        </mesh>
      </group>

      {/* Lightning masts — far background, slow parallax by depth */}
      {[[18, -26], [-24, -30], [30, -44]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 18, 0]} material={dark}>
            <cylinderGeometry args={[0.18, 0.5, 36, 8]} />
          </mesh>
          <mesh position={[0, 36.3, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={1.6} />
          </mesh>
        </group>
      ))}
      {/* Distant fuel farm silhouettes */}
      {[[-40, -50, 6], [-32, -56, 5], [44, -60, 7]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, r, z]} material={dark}>
          <cylinderGeometry args={[r, r, r * 2, 20]} />
        </mesh>
      ))}
    </group>
  )
}
