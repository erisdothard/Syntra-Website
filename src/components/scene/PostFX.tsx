import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { BlendFunction, BloomEffect, VignetteEffect, ChromaticAberrationEffect } from 'postprocessing'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'

export function PostFX() {
  const bloomRef = useRef<BloomEffect>(null)
  const vignetteRef = useRef<VignetteEffect>(null)
  const chromaRef = useRef<ChromaticAberrationEffect>(null)

  useFrame(() => {
    const { explode } = scrollState

    if (bloomRef.current) {
      bloomRef.current.intensity = THREE.MathUtils.lerp(
        bloomRef.current.intensity, 0.6 + explode * 0.8, 0.05
      )
    }

    if (vignetteRef.current) {
      vignetteRef.current.darkness = THREE.MathUtils.lerp(
        vignetteRef.current.darkness, 0.7 - explode * 0.3, 0.05
      )
    }

    if (chromaRef.current && chromaRef.current.offset) {
      const offset = 0.0008 + explode * 0.002
      chromaRef.current.offset.set(offset, offset)
    }
  })

  return (
    <EffectComposer>
      <Bloom ref={bloomRef} luminanceThreshold={0.4} luminanceSmoothing={0.8} intensity={0.6} mipmapBlur />
      <Vignette ref={vignetteRef} offset={0.3} darkness={0.7} />
      <ChromaticAberration ref={chromaRef} blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.0008, 0.0008)} />
      <Noise opacity={0.06} blendFunction={BlendFunction.SOFT_LIGHT} />
    </EffectComposer>
  )
}
