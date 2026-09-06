import { memo, Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, SpotLight } from '@react-three/drei'
import * as THREE from 'three'
import { useIsMobile } from '../../hooks/useIsMobile'
import { scrollState } from '../../lib/scrollState'
import { dbg } from '../../lib/dbg'
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

/** Xenon floodlight aimed at a point; volumetric cone on desktop. */
function Flood({
  position, target, color, intensity, volumetric,
}: { position: [number, number, number]; target: [number, number, number]; color: string; intensity: number; volumetric: boolean }) {
  const ref = useRef<THREE.SpotLight>(null)
  const { scene } = useThree()
  useEffect(() => {
    const l = ref.current
    if (!l) return
    l.target.position.set(...target)
    scene.add(l.target)
    return () => { scene.remove(l.target) }
  }, [scene, target])
  return (
    <SpotLight
      ref={ref}
      position={position}
      color={color}
      intensity={intensity}
      angle={0.42}
      penumbra={0.6}
      distance={110}
      decay={1.4}
      attenuation={volumetric ? 38 : 0}
      anglePower={5}
      radiusTop={0.4}
      radiusBottom={18}
      opacity={volumetric ? 0.18 : 0}
      volumetric={volumetric}
      castShadow={false}
    />
  )
}

/** Scene-level lighting state that follows the launch (env intensity, exposure of fills). */
function LightingDriver() {
  const { scene } = useThree()
  useFrame(() => {
    const s = scrollState
    scene.environmentIntensity = 0.45 + s.ignition * 0.7 * (1 - s.altitude * 0.6)
  })
  return null
}

function Lights({ mobile }: { mobile: boolean }) {
  const shadowSize = mobile ? 1024 : 2048
  return (
    <>
      <ambientLight color="#1E2640" intensity={0.35} />
      <hemisphereLight color="#33405F" groundColor="#0A0B10" intensity={0.5} />
      {/* Cool moon key from upper right, casts the vehicle's shadow onto the deck */}
      <directionalLight
        position={[28, 46, 22]}
        color="#A9BDFF"
        intensity={0.9}
        castShadow={!dbg('noshadow')}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-near={5}
        shadow-camera-far={140}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={44}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* Warm rim from behind the tower */}
      <directionalLight position={[-30, 22, -30]} color="#FF8A4A" intensity={0.45} />
      {/* Xenon floods */}
      <Flood position={[26, 4, 22]} target={[0, 12, 0]} color="#FFE6C4" intensity={520} volumetric={!mobile && !dbg('novol')} />
      <Flood position={[-24, 3.5, 18]} target={[0, 9, 0]} color="#DCE6FF" intensity={380} volumetric={!mobile && !dbg('novol')} />
      <Flood position={[-10, 5, -30]} target={[0, 16, 0]} color="#FFF1DA" intensity={300} volumetric={false} />
      {/* Procedural night-pad environment for reflections (no network) */}
      {!dbg('noenv') && (
        <Environment resolution={256} frames={1} background={false}>
          <Lightformer form="ring" intensity={0.5} color="#2B3A66" scale={40} position={[0, 60, 0]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={1.4} color="#FFDDB0" scale={[18, 6, 1]} position={[26, 6, 22]} target={[0, 10, 0]} />
          <Lightformer form="rect" intensity={1.0} color="#C8D8FF" scale={[16, 6, 1]} position={[-24, 5, 18]} target={[0, 8, 0]} />
          <Lightformer form="rect" intensity={0.6} color="#FF7A2A" scale={[30, 2, 1]} position={[0, -2, 0]} rotation-x={-Math.PI / 2} />
          <Lightformer form="circle" intensity={0.35} color="#5A6A99" scale={30} position={[0, 20, -80]} />
        </Environment>
      )}
      <LightingDriver />
    </>
  )
}

function VehicleContactShadow() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.visible = scrollState.lift < 0.05
  })
  return (
    <group ref={ref}>
      <ContactShadows position={[0, 1.58, 0]} scale={16} blur={2.2} opacity={0.55} far={12} frames={1} color="#000208" />
    </group>
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
      shadows={!dbg('noshadow')}
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
      <Lights mobile={mobile} />
      <Sky />
      <Suspense fallback={null}>
        <Gantry />
        <Rocket />
        <VehicleContactShadow />
      </Suspense>
      <Smoke count={mobile ? 900 : 2600} />
      <Shockwave />
      <PostFX mobile={mobile} />
    </Canvas>
  )
})
