import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BloomEffect, VignetteEffect } from 'postprocessing'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'

export function PostFX() {
  const bloomRef = useRef<BloomEffect>(null)
  const vignetteRef = useRef<VignetteEffect>(null)

  useFrame(() => {
    const { explode } = scrollState

    if (bloomRef.current) {
      bloomRef.current.intensity = THREE.MathUtils.lerp(
        bloomRef.current.intensity, 0.3 + explode * 0.3, 0.1
      )
    }

    if (vignetteRef.current) {
      vignetteRef.current.darkness = THREE.MathUtils.lerp(
        vignetteRef.current.darkness, 0.35 - explode * 0.15, 0.1
      )
    }
  })

  return (
    <EffectComposer>
      <Bloom ref={bloomRef} luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={0.3} mipmapBlur />
      <Vignette ref={vignetteRef} offset={0.3} darkness={0.35} />
    </EffectComposer>
  )
}
