import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'

const target = new THREE.Vector3()
const look = new THREE.Vector3()

/**
 * Lerps the camera toward the scroll-driven path, layers in pointer parallax,
 * procedural shake, a subtle dutch roll, and drives tone-mapping exposure.
 */
export function CameraRig() {
  const { camera, gl } = useThree()
  const lookRef = useRef(new THREE.Vector3(0, 8, 0))
  const expRef = useRef(1)

  useFrame((state, dt) => {
    const s = scrollState
    const k = 1 - Math.pow(0.001, dt) // frame-rate independent smoothing (~fast)
    const kSlow = 1 - Math.pow(0.02, dt)

    const t = state.clock.elapsedTime
    // Cheap layered "noise" for shake: three incommensurate sines per axis
    const amp = s.shake
    const sx = (Math.sin(t * 31.7) * 0.5 + Math.sin(t * 47.3) * 0.3 + Math.sin(t * 73.1) * 0.2) * amp * 0.55
    const sy = (Math.sin(t * 29.1 + 1.3) * 0.5 + Math.sin(t * 53.7) * 0.3 + Math.sin(t * 79.9) * 0.2) * amp * 0.45
    const sz = Math.sin(t * 41.3 + 2.1) * amp * 0.25

    target.set(
      s.cameraX + s.mouseX * 0.9,
      s.cameraY + s.mouseY * 0.5,
      s.cameraZ,
    )
    camera.position.lerp(target, kSlow)

    look.set(s.mouseX * 0.6, s.lookY + s.mouseY * 0.3, 0)
    lookRef.current.lerp(look, kSlow)

    camera.position.x += sx
    camera.position.y += sy
    camera.position.z += sz
    camera.lookAt(lookRef.current)
    camera.rotateZ(s.roll + Math.sin(t * 37.9) * amp * 0.01)

    expRef.current += (s.exposure - expRef.current) * k
    gl.toneMappingExposure = expRef.current
  })

  return null
}
