import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'

const PIT_W = 9
const PIT_D = 15

/** NASA Mobile Launcher: 2.46 units tall in the file; the deck exhaust opening is centred on its origin. */
const ML_URL = '/models/mobile-launcher.glb'
const DRACO = '/draco/'
const ML_SCALE = 10.6

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
 * Midground layer: concrete pad with the flame trench, the NASA Mobile
 * Launcher (deck + umbilical tower), warning beacons, lightning masts and
 * tank farm far behind so the depths read as separate parallax planes.
 */
export function Gantry() {
  const trench = useRef<THREE.MeshStandardMaterial>(null)
  const beacons = useRef<THREE.MeshStandardMaterial>(null)
  const padLight = useRef<THREE.MeshStandardMaterial>(null)
  const gltf = useGLTF(ML_URL, DRACO)

  const launcher = useMemo(() => {
    const scene = gltf.scene.clone(true)
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const src = mesh.material as THREE.MeshStandardMaterial
      const railings = /railing/i.test(src.name)
      const m = new THREE.MeshStandardMaterial({
        map: src.map ?? null,
        color: railings ? '#8A8E96' : '#7C8088',
        metalness: 0.7,
        roughness: 0.58,
        envMapIntensity: 0.9,
        side: railings ? THREE.DoubleSide : THREE.FrontSide,
        alphaTest: railings ? 0.5 : 0,
        transparent: false,
      })
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
      mesh.material = m
    })
    return scene
  }, [gltf])

  const dark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1C1E26', metalness: 0.4, roughness: 0.85 }),
    [],
  )
  const pad = useMemo(padShape, [])

  useFrame((state) => {
    const s = scrollState
    const t = state.clock.elapsedTime
    if (trench.current) trench.current.emissiveIntensity = s.ignition * 3.5 + s.vent * 0.3
    if (padLight.current) padLight.current.emissiveIntensity = 0.5 + s.ignition * 4
    if (beacons.current) {
      const blink = (Math.sin(t * 2.6) > 0.55 ? 1 : 0.15) * (1 - s.altitude)
      beacons.current.emissiveIntensity = 2.5 * blink + s.ignition * 1.5
    }
  })

  return (
    <group>
      {/* Concrete pad with the trench cut out; the trench box provides the pit */}
      <mesh geometry={pad} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#23252C" roughness={0.96} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.5, 7.9, 96]} />
        <meshStandardMaterial ref={padLight} color="#2a2c34" emissive="#FF6A1A" emissiveIntensity={0.5} roughness={0.8} />
      </mesh>
      <mesh position={[0, -4, 0]}>
        <boxGeometry args={[PIT_W, 8, PIT_D]} />
        <meshStandardMaterial ref={trench} color="#0C0D12" emissive="#FF6A2A" emissiveIntensity={0} roughness={0.9} side={THREE.BackSide} />
      </mesh>

      {/* Mobile Launcher: deck at ~y 1.5, tower on +x */}
      <primitive object={launcher} scale={ML_SCALE} position={[0, 0, 0]} />

      {/* Beacons on the tower cap */}
      {[[3.4, -1.6], [5.6, -1.6], [3.4, 1.6], [5.6, 1.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 26.4, z]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial ref={i === 0 ? beacons : undefined} color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={2} />
        </mesh>
      ))}

      {/* Lightning masts — far background */}
      {[[22, -30], [-26, -34], [34, -48]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 19, 0]} material={dark} castShadow>
            <cylinderGeometry args={[0.18, 0.55, 38, 8]} />
          </mesh>
          <mesh position={[0, 38.3, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={1.6} />
          </mesh>
        </group>
      ))}
      {/* Distant tank farm silhouettes */}
      {[[-40, -52, 6], [-32, -58, 5], [46, -62, 7]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, r, z]} material={dark}>
          <cylinderGeometry args={[r, r, r * 2, 20]} />
        </mesh>
      ))}
    </group>
  )
}

useGLTF.preload(ML_URL, DRACO)
