/**
 * SyntraEmblem3D — 3D bullseye matching the Syntra logo.
 *
 * 3 concentric rings + void core sphere + 3 orbiting dots.
 * Deconstruct: rings separate along Z with gentle tilts.
 * Reconstruct: converge back to flat bullseye.
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useFresnelCoreMaterial } from '../shaders/FresnelCoreMaterial'

type GLTFResult = {
  nodes: {
    RingGreen: THREE.Mesh
    RingWhite: THREE.Mesh
    RingDark: THREE.Mesh
    VoidCore: THREE.Mesh
    OrbDot1: THREE.Mesh
    OrbDot2: THREE.Mesh
    OrbDot3: THREE.Mesh
  }
  materials: Record<string, THREE.MeshStandardMaterial>
}

/* Emissive morph targets: current shade ↔ a hair lighter */
const GREEN_EMISSIVE_BASE  = new THREE.Color(0.0, 0.25, 0.12)
const GREEN_EMISSIVE_LIGHT = new THREE.Color(0.0, 0.38, 0.20)

/* Ring animation config — big tilts + spins, tiltEase in useFrame prevents sphere clipping */
const RING_ANIM = {
  RingGreen: { z: 3.3,  tiltX: 0.33,  tiltY: 0.28,  spin: 0.076, delay: 0 },
  RingWhite: { z: 1.9,  tiltX: -0.24, tiltY: -0.19,  spin: 0.048, delay: 0.08 },
  RingDark:  { z: -2.4, tiltX: 0.19,  tiltY: 0.14,   spin: -0.057, delay: 0.15 },
} as const

interface Props {
  scrollProgress: { explode: number; rotationY: number; scale: number; envRotation: number; mouseX: number; mouseY: number }
  isMobile: boolean
}

/* ─── Intro animation config ─── */
const INTRO_DELAY = 0.3    // seconds before animation starts
const INTRO_DURATION = 2.0 // total ramp time (easeOutExpo reaches ~97% at 1.3s)

export function SyntraEmblem3D({ scrollProgress, isMobile }: Props) {
  const { nodes } = useGLTF('/syntra-emblem-3d.glb') as unknown as GLTFResult
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const ringRefs = {
    RingGreen: useRef<THREE.Mesh>(null),
    RingWhite: useRef<THREE.Mesh>(null),
    RingDark:  useRef<THREE.Mesh>(null),
  }
  const dotRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const fresnelMat = useFresnelCoreMaterial()

  /* ─── Intro animation state ─── */
  const introStartTime = useRef<number | null>(null)
  const introProgress = useRef(0)

  /* ─── MeshPhysicalMaterial with clearcoat — smooth reflections, no HDRI artifacts ─── */
  const ringMaterials = useMemo(() => {
    const greenRing = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0a3d2a'),
      roughness: 0.22,
      metalness: 0.9,
      envMapIntensity: 0.6,
      emissive: new THREE.Color(0.0, 0.25, 0.12),
      emissiveIntensity: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.8,
    })

    const whiteRing = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#e8e8e8'),
      roughness: 0.25,
      metalness: 0.9,
      envMapIntensity: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      reflectivity: 0.9,
    })

    const darkRing = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1a1a22'),
      roughness: 0.25,
      metalness: 0.8,
      envMapIntensity: 0.5,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      reflectivity: 0.5,
    })

    return { greenRing, whiteRing, darkRing }
  }, [])

  /* ─── Glass orb materials with transmission ─── */
  const dotMaterials = useMemo(() => {
    const dotGreen = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#00b67a'),
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.85,
      thickness: 0.5,
      ior: 1.5,
      envMapIntensity: 1.5,
      emissive: new THREE.Color(0.0, 0.55, 0.42),
      emissiveIntensity: 2.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      transparent: true,
      toneMapped: false,
    })

    const dotWhite = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.85,
      thickness: 0.5,
      ior: 1.5,
      envMapIntensity: 1.5,
      emissive: new THREE.Color('#aaddcc'),
      emissiveIntensity: 1.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      transparent: true,
      toneMapped: false,
    })

    return { dotGreen, dotWhite }
  }, [])

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      ringMaterials.greenRing.dispose()
      ringMaterials.whiteRing.dispose()
      ringMaterials.darkRing.dispose()
      dotMaterials.dotGreen.dispose()
      dotMaterials.dotWhite.dispose()
    }
  }, [ringMaterials, dotMaterials])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { explode, rotationY, scale, mouseX, mouseY } = scrollProgress

    // ── Intro: easeOutExpo from 0→1 ──
    if (introStartTime.current === null) introStartTime.current = t + INTRO_DELAY
    let intro = introProgress.current
    if (intro < 1) {
      const elapsed = t - introStartTime.current
      if (elapsed > 0) {
        const raw = Math.min(1, elapsed / INTRO_DURATION)
        intro = raw >= 1 ? 1 : 1 - Math.pow(2, -10 * raw)
        introProgress.current = intro
      }
    }

    // During intro, rings start separated and assemble inward
    const introExplode = (1 - intro) * 0.6
    const effectiveExplode = Math.max(explode, introExplode)

    // Mobile: scale down to avoid covering title / improve quality ratio
    const mobileScale = isMobile ? 0.65 : 1
    const targetScale = scale * mobileScale * intro

    // ── Group: rotation + idle float ──
    if (groupRef.current) {
      // Extra spin during intro that decelerates into idle
      const introSpin = (1 - intro) * Math.PI * 1.5

      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        t * 0.095 + rotationY * 0.76 + introSpin,
        0.04
      )
      const e3 = effectiveExplode * effectiveExplode * effectiveExplode
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        e3 * 0.38 + Math.sin(t * 0.3) * e3 * 0.14 + mouseX * 0.095,
        0.04
      )
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        e3 * 0.24 + mouseY * -0.067,
        0.04
      )
      groupRef.current.position.y = Math.sin(t * 0.4) * 0.03
      // Faster lerp during intro for snappy entrance
      const scaleLerp = intro < 0.95 ? 0.12 : 0.05
      groupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, scaleLerp)
      )
    }

    // ── Rings: separate along Z with staggered timing ──
    for (const [name, cfg] of Object.entries(RING_ANIM)) {
      const ref = ringRefs[name as keyof typeof ringRefs].current
      if (!ref) continue

      const staggered = Math.max(0, Math.min(1, (effectiveExplode - cfg.delay) / (1 - cfg.delay)))
      const ease = staggered * staggered * (3 - 2 * staggered) // smoothstep

      // Tilt only starts after ring has cleared the sphere (ease > 0.35 = past sphere radius)
      const tiltEase = Math.max(0, (ease - 0.35)) / 0.65 // 0 until 35% Z travel, then ramps to 1

      ref.position.z = THREE.MathUtils.lerp(ref.position.z, ease * cfg.z, 0.12)
      ref.rotation.x = THREE.MathUtils.lerp(ref.rotation.x, tiltEase * cfg.tiltX, 0.05)
      ref.rotation.y = THREE.MathUtils.lerp(ref.rotation.y, tiltEase * cfg.tiltY + t * cfg.spin * tiltEase, 0.05)
    }

    // ── GreenRing: ramp emissive glow during explode ──
    const morphFactor = (Math.sin(t * 0.8) + 1) * 0.5
    ringMaterials.greenRing.emissive.lerpColors(GREEN_EMISSIVE_BASE, GREEN_EMISSIVE_LIGHT, morphFactor)
    ringMaterials.greenRing.emissiveIntensity = 0.8 + morphFactor * 0.4 + effectiveExplode * 0.6

    // ── Core: Fresnel pulse when exposed ──
    if (coreRef.current) {
      fresnelMat.uniforms.uTime.value = t
      fresnelMat.uniforms.uExplode.value = THREE.MathUtils.lerp(
        fresnelMat.uniforms.uExplode.value,
        effectiveExplode,
        0.06
      )
      const pulse = 0.7 + Math.sin(t * 2.5) * 0.3
      const cs = 1 + effectiveExplode * 0.1 * pulse
      coreRef.current.scale.setScalar(THREE.MathUtils.lerp(coreRef.current.scale.x, cs, 0.05))
    }

    // ── Dots: orbit outside outer ring ──
    const dotOrbitR = 2.35 + effectiveExplode * 1.2
    const dotSpeed = 0.3 + effectiveExplode * 0.4

    dotRefs.forEach((ref, i) => {
      if (!ref.current) return
      const angle = t * dotSpeed + (i * Math.PI * 2) / 3
      ref.current.position.x = Math.cos(angle) * dotOrbitR
      ref.current.position.y = Math.sin(angle) * dotOrbitR
      ref.current.position.z = Math.sin(t * 0.6 + i * 2) * effectiveExplode * 0.4
    })
  })

  return (
    <group ref={groupRef}>
      {/* Rings — MeshPhysicalMaterial with clearcoat */}
      <mesh ref={ringRefs.RingGreen} geometry={nodes.RingGreen.geometry} material={ringMaterials.greenRing} />
      <mesh ref={ringRefs.RingWhite} geometry={nodes.RingWhite.geometry} material={ringMaterials.whiteRing} />
      <mesh ref={ringRefs.RingDark}  geometry={nodes.RingDark.geometry}  material={ringMaterials.darkRing} />

      {/* Core — high-res sphere with custom Fresnel shader */}
      <mesh ref={coreRef} material={fresnelMat}>
        <sphereGeometry args={[0.7, 128, 64]} />
      </mesh>

      {/* Orbiting dots — glass orbs */}
      <mesh ref={dotRefs[0]} material={dotMaterials.dotGreen}>
        <sphereGeometry args={[0.075, 32, 16]} />
      </mesh>
      <mesh ref={dotRefs[1]} material={dotMaterials.dotGreen}>
        <sphereGeometry args={[0.075, 32, 16]} />
      </mesh>
      <mesh ref={dotRefs[2]} material={dotMaterials.dotWhite}>
        <sphereGeometry args={[0.06, 32, 16]} />
      </mesh>
    </group>
  )
}

useGLTF.preload('/syntra-emblem-3d.glb')
