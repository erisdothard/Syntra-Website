import { Suspense, memo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { SyntraEmblem3D } from '../SyntraEmblem3D'
import { ParticleField } from '../ParticleField'
import { CrystalCore } from '../CrystalCore'
import { CameraRig } from './CameraRig'
import { PostFX } from './PostFX'
import { scrollState } from '../../lib/scrollState'
import { useIsMobile } from '../../hooks/useIsMobile'

export const SceneCanvas = memo(function SceneCanvas() {
  const isMobile = useIsMobile()

  return (
    <div id="scene-canvas" className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ pointerEvents: 'none' }}
      >
        <color attach="background" args={['#0D0E12']} />
        <CameraRig />
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 8, 6]} intensity={0.8} />
        <directionalLight position={[-4, -2, -5]} intensity={0.25} color="#8888aa" />
        <pointLight position={[3, 1, 4]} intensity={2} distance={15} color="#00b67a" />
        <Environment resolution={256} background={false}>
          <Lightformer form="rect" intensity={2} color="#ffffff"
            position={[4, 5, -3]} rotation={[Math.PI / 4, Math.PI / 4, 0]} scale={[10, 4, 1]} />
          <Lightformer form="circle" intensity={1.5} color="#00b67a"
            position={[0, 0, -8]} scale={6} />
          <Lightformer form="rect" intensity={0.5} color="#334455"
            position={[0, -5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[20, 20, 1]} />
        </Environment>
        {/* fog removed for perf — distance fade handled by particle shader */}
        <ParticleField scrollProgress={scrollState} count={isMobile ? 200 : 500} />
        <Suspense fallback={null}>
          <SyntraEmblem3D scrollProgress={scrollState} isMobile={isMobile} />
          <group position={[0, -12, 0]}>
            <CrystalCore scrollProgress={{
              explode: scrollState.crystalExplode,
              rotationY: scrollState.crystalRotationY,
              scale: scrollState.crystalScale,
            }} />
          </group>
        </Suspense>
        <PostFX />
      </Canvas>
    </div>
  )
})
