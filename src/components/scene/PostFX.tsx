import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  KernelSize,
  NoiseEffect,
  SMAAEffect,
  SMAAPreset,
  VignetteEffect,
} from 'postprocessing'
import { N8AOPostPass } from 'n8ao'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'
import { dbg } from '../../lib/dbg'

/**
 * Effects are constructed directly and handed to the composer as primitives.
 * The wrapped <Bloom ref> style components JSON.stringify their props on
 * re-render, and under React 19 `ref` is a prop — once it holds an effect
 * instance that walks into the scene graph and throws on circular refs.
 */
export function PostFX({ mobile }: { mobile: boolean }) {
  const { scene, camera, size } = useThree()

  const effects = useMemo(() => {
    const ao = mobile || dbg('noao')
      ? null
      : new N8AOPostPass(scene, camera, size.width, size.height)
    if (ao) {
      ao.configuration.aoRadius = 2.2
      ao.configuration.distanceFalloff = 1.6
      ao.configuration.intensity = 3.2
      ao.configuration.halfRes = true
      ao.configuration.screenSpaceRadius = false
      ao.configuration.color = new THREE.Color('#05060A')
    }
    const bloom = new BloomEffect({
      luminanceThreshold: 0.86,
      luminanceSmoothing: 0.25,
      mipmapBlur: true,
      kernelSize: mobile ? KernelSize.MEDIUM : KernelSize.LARGE,
      intensity: 0.4,
      radius: 0.7,
    })
    const ca = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0, 0),
      radialModulation: true,
      modulationOffset: 0.25,
    })
    const vignette = new VignetteEffect({ eskil: false, offset: 0.2, darkness: 0.8 })
    const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SOFT_LIGHT })
    noise.blendMode.opacity.value = mobile ? 0.05 : 0.08
    const smaa = dbg('nosmaa') ? null : new SMAAEffect({ preset: mobile ? SMAAPreset.LOW : SMAAPreset.HIGH })
    return { ao, bloom, ca, vignette, noise, smaa }
    // scene/camera identity is stable for the canvas lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile])

  useEffect(() => {
    effects.ao?.setSize(size.width, size.height)
  }, [effects, size])

  useEffect(() => {
    return () => {
      effects.ao?.dispose?.()
      effects.bloom.dispose()
      effects.ca.dispose()
      effects.vignette.dispose()
      effects.noise.dispose()
      effects.smaa?.dispose()
    }
  }, [effects])

  useFrame(() => {
    const s = scrollState
    effects.bloom.intensity = 0.4 + s.ignition * 0.85 * (1 - s.altitude * 0.45) + s.vent * 0.12
    const a = s.shock * (1 - s.shock) * 4 * 0.0018 + s.shake * 0.0008
    effects.ca.offset.set(a, a * 0.6)
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {effects.ao ? <primitive object={effects.ao} /> : <></>}
      <primitive object={effects.bloom} />
      <primitive object={effects.ca} />
      <primitive object={effects.vignette} />
      <primitive object={effects.noise} />
      {effects.smaa ? <primitive object={effects.smaa} /> : <></>}
    </EffectComposer>
  )
}
