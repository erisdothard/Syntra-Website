import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'

const target = new THREE.Vector3()
const look = new THREE.Vector3()

/**
 * Lerps the camera toward the scroll-driven path, layers in pointer parallax,
 * procedural shake, a subtle dutch roll, and drives tone-mapping exposure.
 */
/**
 * Vertical FOV that keeps the HORIZONTAL field roughly constant across aspect
 * ratios, clamped so portrait does not go fisheye.
 *
 * three's `fov` is vertical, so a 36 deg camera shows ~54 deg horizontally on a
 * 16:10 desktop but only ~17 deg on a phone in portrait — everything ends up
 * three times over-zoomed, and the plume swallows the screen. Solving for the
 * vertical fov that preserves horizontal coverage gives ~95 deg on a phone,
 * which is unusably wide, so this recovers most of the framing rather than all
 * of it and accepts a tighter horizontal field on narrow screens.
 */
const BASE_H_FOV = (54 * Math.PI) / 180
const MIN_V_FOV = 36
const MAX_V_FOV = 58

function fovForAspect(aspect: number): number {
  const want = (2 * Math.atan(Math.tan(BASE_H_FOV / 2) / aspect) * 180) / Math.PI
  return Math.min(MAX_V_FOV, Math.max(MIN_V_FOV, want))
}

export function CameraRig() {
  const { camera, gl, size } = useThree()
  const lookRef = useRef(new THREE.Vector3(0, 8, 0))
  const expRef = useRef(1)

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (!cam.isPerspectiveCamera) return
    cam.fov = fovForAspect(size.width / size.height)
    cam.updateProjectionMatrix()
  }, [camera, size])

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
