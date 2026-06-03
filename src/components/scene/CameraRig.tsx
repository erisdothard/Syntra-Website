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

    // Camera position — slower lerp (0.05) for cinematic weight
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, scrollState.cameraX, 0.05)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, scrollState.cameraY, 0.05)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, baseZ.current + scrollState.cameraZ, 0.05)

    // LookAt target — faster lerp (0.08) creates natural "following" drift
    target.x = THREE.MathUtils.lerp(target.x, scrollState.lookAtX, 0.08)
    target.y = THREE.MathUtils.lerp(target.y, scrollState.lookAtY, 0.08)
    camera.lookAt(target)
  })

  return null
}
