import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'

const target = new THREE.Vector3()

export function CameraRig() {
  const { camera } = useThree()

  useFrame(() => {
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, scrollState.cameraY, 0.05)
    target.y = THREE.MathUtils.lerp(target.y, scrollState.lookAtY, 0.05)
    camera.lookAt(target)
  })

  return null
}
