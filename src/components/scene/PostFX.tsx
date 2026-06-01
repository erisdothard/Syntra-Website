import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
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
        bloomRef.current.intensity, 0.5 + explode * 1.0, 0.1
      )
    }

    if (vignetteRef.current) {
      vignetteRef.current.darkness = THREE.MathUtils.lerp(
        vignetteRef.current.darkness, 0.35 - explode * 0.15, 0.1
      )
    }

    if (chromaRef.current && chromaRef.current.offset) {
      // Zero offset at rest (no-op), ramp during explode — no enabled toggling to avoid pipeline recompile
      const offset = explode * 0.0025
      chromaRef.current.offset.set(offset, offset)
    }
  })

  return (
    <EffectComposer>
      <Bloom ref={bloomRef} luminanceThreshold={0.35} luminanceSmoothing={0.8} intensity={0.5} mipmapBlur />
      <Vignette ref={vignetteRef} offset={0.3} darkness={0.35} />
      <ChromaticAberration ref={chromaRef} blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0, 0)} />
    </EffectComposer>
  )
}
