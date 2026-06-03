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

/* Ring animation config — wider stagger for visible cascade effect */
const RING_ANIM = {
  RingGreen: { z: 3.3,  tiltX: 0.33,  tiltY: 0.28,  spin: 0.076, delay: 0 },
  RingWhite: { z: 1.9,  tiltX: -0.24, tiltY: -0.19,  spin: 0.048, delay: 0.15 },
  RingDark:  { z: -2.4, tiltX: 0.19,  tiltY: 0.14,   spin: -0.057, delay: 0.30 },
} as const

interface Props {
  scrollProgress: { explode: number; rotationY: number; scale: number; envRotation: number; mouseX: number; mouseY: number }
  isMobile: boolean
}

/* ─── Intro animation config ─── */
const INTRO_DELAY = 0.2    // seconds before animation starts
const INTRO_DURATION = 1.6 // rotation reveal (easeOutExpo reaches ~97% at 1.0s)

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

  /* ─── Shared dot geometry (avoids 3 separate BufferGeometry instances) ─── */
  const dotGeo = useMemo(() => new THREE.SphereGeometry(0.075, 16, 8), [])
  const dotGeoSmall = useMemo(() => new THREE.SphereGeometry(0.06, 12, 6), [])

  /* ─── Intro animation state ─── */
  const introStartTime = useRef<number | null>(null)
  const introProgress = useRef(0)

  /* ─── MeshStandardMaterial — no clearcoat pass, much cheaper ─── */
  const ringMaterials = useMemo(() => {
    const greenRing = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0a3d2a'),
      roughness: 0.2,
      metalness: 0.9,
      envMapIntensity: 0.6,
      emissive: new THREE.Color(0.0, 0.25, 0.12),
      emissiveIntensity: 0.8,
    })

    const whiteRing = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e8e8e8'),
      roughness: 0.22,
      metalness: 0.9,
      envMapIntensity: 1.2,
    })

    const darkRing = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a1a22'),
      roughness: 0.25,
      metalness: 0.8,
      envMapIntensity: 0.5,
    })

    return { greenRing, whiteRing, darkRing }
  }, [])

  /* ─── Emissive orb materials (no transmission — eliminates 3 extra scene passes) ─── */
  const dotMaterials = useMemo(() => {
    const dotGreen = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#00b67a'),
      roughness: 0.2,
      metalness: 0.0,
      envMapIntensity: 1.0,
      emissive: new THREE.Color(0.0, 0.7, 0.5),
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.95,
      toneMapped: false,
    })

    const dotWhite = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.2,
      metalness: 0.0,
      envMapIntensity: 1.0,
      emissive: new THREE.Color('#bbeecc'),
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.95,
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
      dotGeo.dispose()
      dotGeoSmall.dispose()
    }
  }, [ringMaterials, dotMaterials, dotGeo, dotGeoSmall])

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

    // Rotation reveal — rings stay assembled, model flips from edge-on to face-on
    const effectiveExplode = explode

    // Intro rotation: edge-on (PI/2) → face camera (0)
    const introRotX = (1 - intro) * Math.PI * 0.5

    // Mobile: scale down to avoid covering title / improve quality ratio
    const mobileScale = isMobile ? 0.65 : 1
    const introScale = 0.92 + intro * 0.08  // subtle 92%→100% growth during flip
    const targetScale = scale * mobileScale * introScale

    // ── Group: rotation + idle float ──
    if (groupRef.current) {
      // Subtle Z spin during reveal that settles into idle
      const introSpin = (1 - intro) * Math.PI * 0.4

      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        t * 0.095 + rotationY * 0.76 + introSpin,
        0.08
      )
      const e3 = effectiveExplode * effectiveExplode * effectiveExplode
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        e3 * 0.38 + Math.sin(t * 0.3) * e3 * 0.14 + mouseX * 0.095,
        0.08
      )
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        e3 * 0.24 + mouseY * -0.067 + introRotX,
        0.10
      )
      groupRef.current.position.y = Math.sin(t * 0.4) * 0.03
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
      ref.rotation.x = THREE.MathUtils.lerp(ref.rotation.x, tiltEase * cfg.tiltX, 0.10)
      ref.rotation.y = THREE.MathUtils.lerp(ref.rotation.y, tiltEase * cfg.tiltY + t * cfg.spin * tiltEase, 0.10)

      // Secondary: rotational wobble during explode (follow-through)
      const wobble = Math.sin(t * 3 + cfg.delay * 20) * ease * 0.04
      ref.rotation.z = THREE.MathUtils.lerp(ref.rotation.z, wobble, 0.08)

      // Secondary: scale breathing at peak explode
      const breathe = 1 + Math.sin(t * 2 + cfg.delay * 15) * ease * 0.012
      ref.scale.setScalar(THREE.MathUtils.lerp(ref.scale.x, breathe, 0.08))
    }

    // ── GreenRing: ramp emissive glow during explode ──
    ringMaterials.greenRing.emissiveIntensity = 0.8 + effectiveExplode * 0.6

    // ── Core: Fresnel pulse when exposed ──
    if (coreRef.current) {
      fresnelMat.uniforms.uExplode.value = THREE.MathUtils.lerp(
        fresnelMat.uniforms.uExplode.value,
        effectiveExplode,
        0.06
      )
      const cs = 1 + effectiveExplode * 0.07
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

      {/* Core — low tessellation, small radius makes detail imperceptible */}
      <mesh ref={coreRef} material={fresnelMat}>
        <sphereGeometry args={[0.7, 32, 16]} />
      </mesh>

      {/* Orbiting dots — shared geometry, emissive glow */}
      <mesh ref={dotRefs[0]} material={dotMaterials.dotGreen} geometry={dotGeo} />
      <mesh ref={dotRefs[1]} material={dotMaterials.dotGreen} geometry={dotGeo} />
      <mesh ref={dotRefs[2]} material={dotMaterials.dotWhite} geometry={dotGeoSmall} />
    </group>
  )
}

useGLTF.preload('/syntra-emblem-3d.glb')
