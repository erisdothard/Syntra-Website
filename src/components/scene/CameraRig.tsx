import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'

const target = new THREE.Vector3()

export function CameraRig() {
  const { camera } = useThree()
  const baseZ = useRef<number | null>(null)

  useFrame(() => {
    if (baseZ.current === null) baseZ.current = camera.position.z

    // Camera position — 0.09 lerp for responsive tracking without jitter
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, scrollState.cameraX, 0.09)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, scrollState.cameraY, 0.09)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, baseZ.current + scrollState.cameraZ, 0.09)

    // LookAt target — slightly faster for natural "following" drift
    target.x = THREE.MathUtils.lerp(target.x, scrollState.lookAtX, 0.12)
    target.y = THREE.MathUtils.lerp(target.y, scrollState.lookAtY, 0.12)
    camera.lookAt(target)
  })

  return null
}
