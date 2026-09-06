import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  KernelSize,
  NoiseEffect,
  VignetteEffect,
} from 'postprocessing'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'

/**
 * Effects are constructed directly and handed to the composer as primitives.
 * The wrapped <Bloom ref> style components JSON.stringify their props on
 * re-render, and under React 19 `ref` is a prop — once it holds an effect
 * instance that walks into the scene graph and throws on circular refs.
 */
export function PostFX({ mobile }: { mobile: boolean }) {
  const effects = useMemo(() => {
    const bloom = new BloomEffect({
      luminanceThreshold: 0.55,
      luminanceSmoothing: 0.35,
      mipmapBlur: true,
      kernelSize: mobile ? KernelSize.MEDIUM : KernelSize.LARGE,
      intensity: 0.45,
      radius: 0.75,
    })
    const ca = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0, 0),
      radialModulation: true,
      modulationOffset: 0.25,
    })
    const vignette = new VignetteEffect({ eskil: false, offset: 0.22, darkness: 0.85 })
    const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SOFT_LIGHT })
    noise.blendMode.opacity.value = mobile ? 0.05 : 0.09
    return { bloom, ca, vignette, noise }
  }, [mobile])

  useEffect(() => {
    return () => {
      effects.bloom.dispose()
      effects.ca.dispose()
      effects.vignette.dispose()
      effects.noise.dispose()
    }
  }, [effects])

  useFrame(() => {
    const s = scrollState
    // 0.45 idle → ~1.35 through the fireball, easing back with altitude
    effects.bloom.intensity = 0.45 + s.ignition * 0.9 * (1 - s.altitude * 0.45) + s.vent * 0.15
    const a = s.shock * (1 - s.shock) * 4 * 0.0035 + s.shake * 0.0012
    effects.ca.offset.set(a, a * 0.6)
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <primitive object={effects.bloom} />
      <primitive object={effects.ca} />
      <primitive object={effects.vignette} />
      <primitive object={effects.noise} />
    </EffectComposer>
  )
}
