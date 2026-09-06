import { memo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useIsMobile } from '../../hooks/useIsMobile'
import { CameraRig } from './CameraRig'
import { PostFX } from './PostFX'
import { Sky } from './layers/Sky'
import { Gantry } from './layers/Gantry'
import { Rocket } from './layers/Rocket'
import { Smoke } from './layers/Smoke'
import { Shockwave } from './layers/Shockwave'

function DevExpose() {
  const three = useThree()
  if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = three
  return null
}

function Lights() {
  return (
    <>
      <ambientLight color="#26304F" intensity={0.9} />
      <hemisphereLight color="#3A4670" groundColor="#0B0C10" intensity={0.7} />
      {/* Cool key from upper right — pre-dawn pad lighting */}
      <directionalLight position={[26, 40, 18]} color="#9DB4FF" intensity={1.6} />
      {/* Warm rim from behind the tower so the rocket silhouette separates from the sky */}
      <directionalLight position={[-30, 22, -30]} color="#FF8A4A" intensity={0.55} />
      {/* Pad floodlights */}
      <pointLight position={[14, 6, 12]} color="#FFE2B8" intensity={220} distance={60} decay={2} />
      <pointLight position={[-16, 5, 14]} color="#B8CCFF" intensity={160} distance={60} decay={2} />
    </>
  )
}

/**
 * Fixed full-screen WebGL layer. Everything inside reads scrollState;
 * nothing here re-renders on scroll. Memoized so app-level state (nav
 * overlay) never re-renders the canvas tree.
 */
export const LaunchCanvas = memo(function LaunchCanvas() {
  const mobile = useIsMobile()
  return (
    <Canvas
      id="scene-canvas"
      dpr={[1, mobile ? 1.5 : 2]}
      camera={{ fov: 36, near: 0.5, far: 600, position: [0, 9, 34] }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1,
        stencil: false,
        depth: true,
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, transition: 'opacity 0.3s ease-out' }}
      frameloop="always"
    >
      <color attach="background" args={['#07080C']} />
      <fog attach="fog" args={['#0B0E18', 55, 220]} />
      {import.meta.env.DEV && <DevExpose />}
      <CameraRig />
      <Lights />
      <Sky />
      <Gantry />
      <Rocket />
      <Smoke count={mobile ? 900 : 2600} />
      <Shockwave />
      <PostFX mobile={mobile} />
    </Canvas>
  )
})
