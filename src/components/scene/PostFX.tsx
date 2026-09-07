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
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing'
import { N8AOPostPass } from 'n8ao'
import * as THREE from 'three'
import { scrollState } from '../../lib/scrollState'
import { HeatHazeEffect } from './effects/HeatHaze'
import { LIFT_UNITS, ROCKET_BASE_Y } from './layers/Rocket'
import { dbg } from '../../lib/dbg'

/**
 * Effects are constructed directly and handed to the composer as primitives.
 * The wrapped <Bloom ref> style components JSON.stringify their props on
 * re-render, and under React 19 `ref` is a prop — once it holds an effect
 * instance that walks into the scene graph and throws on circular refs.
 */
const NOZZLE = new THREE.Vector3()
const EDGE = new THREE.Vector3()
const PLUME_UV = new THREE.Vector2()

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
    // @react-three/postprocessing forces renderer.toneMapping = NoToneMapping
    // while the composer is mounted, so the ACESFilmicToneMapping set on the
    // Canvas never ran — the scene was reaching the screen with values above 1.0
    // simply clipped per channel. Channel clipping is what turned every hot
    // colour the same yellow-white: red and green pin at 1.0, blue does not.
    // Tone map as a pass instead, after bloom so the halo is still saturated
    // when the curve rolls the core off, and before the display-referred
    // effects (aberration, vignette, grain) which expect 0-1 input.
    const toneMapping = new ToneMappingEffect({
      mode: dbg('aces') ? ToneMappingMode.ACES_FILMIC : ToneMappingMode.NEUTRAL,
    })
    const haze = dbg('nohaze') ? null : new HeatHazeEffect()
    return { ao, bloom, toneMapping, haze, ca, vignette, noise, smaa }
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
      effects.haze?.dispose()
      effects.toneMapping.dispose()
      effects.smaa?.dispose()
    }
  }, [effects])

  useFrame((state) => {
    const s = scrollState
    effects.bloom.intensity = 0.4 + s.ignition * 0.85 * (1 - s.altitude * 0.45) + s.vent * 0.12
    const a = s.shock * (1 - s.shock) * 4 * 0.0018 + s.shake * 0.0008
    effects.ca.offset.set(a, a * 0.6)

    if (effects.haze) {
      // Track the engine plane in screen space. Refraction needs air, so the
      // whole effect fades out as the vehicle leaves the atmosphere.
      const y = ROCKET_BASE_Y + s.lift * LIFT_UNITS
      NOZZLE.set(0, y, 0).project(camera)
      EDGE.set(14, y, 0).project(camera)
      const heat = NOZZLE.z < 1 ? s.ignition * (1 - s.altitude * 0.85) : 0
      PLUME_UV.set(NOZZLE.x * 0.5 + 0.5, NOZZLE.y * 0.5 + 0.5)
      const radius = Math.min(0.9, Math.abs(EDGE.x - NOZZLE.x) * 0.5)
      effects.haze.set(PLUME_UV, Math.max(radius, 0.05), heat, state.clock.elapsedTime, size.width / size.height)
    }
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {effects.ao ? <primitive object={effects.ao} /> : <></>}
      {effects.haze ? <primitive object={effects.haze} /> : <></>}
      <primitive object={effects.bloom} />
      <primitive object={effects.toneMapping} />
      <primitive object={effects.ca} />
      <primitive object={effects.vignette} />
      <primitive object={effects.noise} />
      {effects.smaa ? <primitive object={effects.smaa} /> : <></>}
    </EffectComposer>
  )
}
