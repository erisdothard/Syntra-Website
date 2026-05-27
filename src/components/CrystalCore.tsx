/**
 * CrystalCore — Blender-generated crystalline icosphere with
 * scroll-driven deconstruct / reconstruct vertex shader.
 *
 * Each triangle face explodes outward along its face normal,
 * then reconstructs as the user scrolls back. The inner glow
 * core is revealed when the shell opens.
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/* ─── Types ─── */
type GLTFResult = {
  nodes: {
    CoreShell: THREE.Mesh
    InnerCore: THREE.Mesh
    OrbitalRing1: THREE.Mesh
  }
  materials: {
    CoreMetal: THREE.MeshStandardMaterial
    CoreGlow: THREE.MeshStandardMaterial
    RingMetal: THREE.MeshStandardMaterial
  }
}

/* ─── Compute per-face explosion data ─── */
function computeExplosionAttributes(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position')
  const vertexCount = position.count
  const faceCount = vertexCount / 3

  // Per-vertex: the face center (explosion origin) and face normal (explosion direction)
  const faceCenters = new Float32Array(vertexCount * 3)
  const faceNormals = new Float32Array(vertexCount * 3)
  const faceRandoms = new Float32Array(vertexCount) // random per-face offset

  const vA = new THREE.Vector3()
  const vB = new THREE.Vector3()
  const vC = new THREE.Vector3()
  const center = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()

  for (let f = 0; f < faceCount; f++) {
    const i = f * 3

    vA.fromBufferAttribute(position, i)
    vB.fromBufferAttribute(position, i + 1)
    vC.fromBufferAttribute(position, i + 2)

    // Face center
    center.copy(vA).add(vB).add(vC).divideScalar(3)

    // Face normal
    ab.subVectors(vB, vA)
    ac.subVectors(vC, vA)
    normal.crossVectors(ab, ac).normalize()

    const rand = Math.random()

    for (let v = 0; v < 3; v++) {
      const idx = (i + v) * 3
      faceCenters[idx] = center.x
      faceCenters[idx + 1] = center.y
      faceCenters[idx + 2] = center.z

      faceNormals[idx] = normal.x
      faceNormals[idx + 1] = normal.y
      faceNormals[idx + 2] = normal.z

      faceRandoms[i + v] = rand
    }
  }

  return { faceCenters, faceNormals, faceRandoms }
}

/* ─── Exploding shell shader material ─── */
function useExplodeMaterial() {
  return useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },       // 0 = assembled, 1 = fully exploded
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#0a1e15') },
        uEmissive: { value: new THREE.Color('#00b67a') },
        uEmissiveStrength: { value: 0.3 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aFaceCenter;
        attribute vec3 aFaceNormal;
        attribute float aFaceRandom;

        uniform float uProgress;
        uniform float uTime;

        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vExplode;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vExplode = uProgress;

          // Explosion: move along face normal + slight random rotation
          float explodeDist = uProgress * (1.5 + aFaceRandom * 2.0);
          float wobble = sin(uTime * 2.0 + aFaceRandom * 6.28) * uProgress * 0.15;

          vec3 displaced = position
            + aFaceNormal * explodeDist
            + vec3(wobble, wobble * 0.7, wobble * 1.3);

          // Slight rotation per face when exploding
          float angle = uProgress * aFaceRandom * 3.14;
          vec3 toCenter = position - aFaceCenter;
          float c = cos(angle);
          float s = sin(angle);
          // Rotate around face normal
          vec3 rotated = toCenter * c + cross(aFaceNormal, toCenter) * s
            + aFaceNormal * dot(aFaceNormal, toCenter) * (1.0 - c);
          vec3 finalPos = mix(displaced, aFaceCenter + rotated + aFaceNormal * explodeDist, uProgress * 0.5);

          vec4 worldPos = modelMatrix * vec4(finalPos, 1.0);
          vWorldPos = worldPos.xyz;

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uEmissive;
        uniform float uEmissiveStrength;
        uniform float uProgress;

        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vExplode;

        void main() {
          // Simple directional light
          vec3 lightDir = normalize(vec3(5.0, 8.0, 6.0));
          float diff = max(dot(vNormal, lightDir), 0.0);
          float ambient = 0.15;

          vec3 baseColor = uColor;
          vec3 lit = baseColor * (ambient + diff * 0.85);

          // Edge glow intensifies during explosion
          float edgeGlow = uEmissiveStrength + vExplode * 2.0;
          float fresnel = pow(1.0 - abs(dot(vNormal, normalize(-vWorldPos))), 3.0);
          lit += uEmissive * fresnel * edgeGlow;

          // Opacity: slight transparency when fully exploded
          float alpha = 1.0 - vExplode * 0.15;

          gl_FragColor = vec4(lit, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    })
  }, [])
}

/* ─── Props ─── */
interface CrystalCoreProps {
  scrollProgress: { explode: number; rotationY: number; scale: number }
}

/* ─── Component ─── */
export function CrystalCore({ scrollProgress }: CrystalCoreProps) {
  const { nodes, materials } = useGLTF('/crystal-core-transformed.glb') as unknown as GLTFResult
  const groupRef = useRef<THREE.Group>(null)
  const shellRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const ring1Ref = useRef<THREE.Mesh>(null)

  const explodeMat = useExplodeMaterial()

  // Compute + attach explosion attributes to shell geometry
  useEffect(() => {
    if (!nodes.CoreShell) return

    // We need non-indexed geometry for per-face vertex attributes
    let geo = nodes.CoreShell.geometry
    if (geo.index) {
      geo = geo.toNonIndexed()
    }

    const { faceCenters, faceNormals, faceRandoms } = computeExplosionAttributes(geo)

    geo.setAttribute('aFaceCenter', new THREE.BufferAttribute(faceCenters, 3))
    geo.setAttribute('aFaceNormal', new THREE.BufferAttribute(faceNormals, 3))
    geo.setAttribute('aFaceRandom', new THREE.BufferAttribute(faceRandoms, 1))

    if (shellRef.current) {
      shellRef.current.geometry = geo
    }
  }, [nodes])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { explode, rotationY, scale } = scrollProgress

    // Update shader uniforms
    explodeMat.uniforms.uProgress.value = THREE.MathUtils.lerp(
      explodeMat.uniforms.uProgress.value, explode, 0.08
    )
    explodeMat.uniforms.uTime.value = t

    // Group transforms
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        rotationY + t * 0.1,
        0.06
      )
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.08
      groupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.06)
      )
    }

    // Inner core: glow brighter + scale up as shell explodes
    if (innerRef.current) {
      const innerScale = 1 + explodeMat.uniforms.uProgress.value * 0.4
      innerRef.current.scale.setScalar(innerScale)
      const mat = innerRef.current.material as THREE.MeshStandardMaterial
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 3 + explodeMat.uniforms.uProgress.value * 8
      }
    }

    // Rings: spin faster during explosion
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += 0.003 + explodeMat.uniforms.uProgress.value * 0.02
    }
  })

  return (
    <group ref={groupRef}>
      {/* Exploding shell */}
      <mesh ref={shellRef} material={explodeMat}>
        <bufferGeometry />
      </mesh>

      {/* Inner glow core */}
      <mesh
        ref={innerRef}
        geometry={nodes.InnerCore.geometry}
        material={materials.CoreGlow}
      />

      {/* Orbital ring */}
      <mesh
        ref={ring1Ref}
        geometry={nodes.OrbitalRing1.geometry}
        material={materials.RingMetal}
        rotation={[1.233, 0.089, -0.247]}
      />
    </group>
  )
}

useGLTF.preload('/crystal-core-transformed.glb')
