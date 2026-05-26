import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 500
const SPREAD = 20

interface Props {
  scrollProgress: { explode: number; mouseX?: number; mouseY?: number }
}

export function ParticleField({ scrollProgress }: Props) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, velocities, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const vel = new Float32Array(PARTICLE_COUNT * 3)
    const sz = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      pos[i3] = (Math.random() - 0.5) * SPREAD
      pos[i3 + 1] = (Math.random() - 0.5) * SPREAD
      pos[i3 + 2] = (Math.random() - 0.5) * SPREAD * 0.6

      vel[i3] = (Math.random() - 0.5) * 0.003
      vel[i3 + 1] = (Math.random() - 0.5) * 0.003
      vel[i3 + 2] = (Math.random() - 0.5) * 0.002

      sz[i] = Math.random() * 2.5 + 0.5
    }
    return { positions: pos, velocities: vel, sizes: sz }
  }, [])

  const shaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouseX: { value: 0 },
        uMouseY: { value: 0 },
        uColor: { value: new THREE.Color('#00b67a') },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        uniform float uTime;
        uniform float uMouseX;
        uniform float uMouseY;
        varying float vAlpha;

        void main() {
          vec3 pos = position;

          // Mouse parallax — particles shift opposite to cursor for depth
          pos.x += uMouseX * (pos.z * 0.05);
          pos.y += uMouseY * (pos.z * 0.05);

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = aSize * (150.0 / -mvPos.z);

          // Fade by distance from camera
          float dist = length(mvPos.xyz);
          vAlpha = smoothstep(18.0, 4.0, dist) * 0.4;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          // Soft circular particle
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float alpha = smoothstep(1.0, 0.3, d) * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const geo = pointsRef.current.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    // Drift particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      arr[i3] += velocities[i3]
      arr[i3 + 1] += velocities[i3 + 1]
      arr[i3 + 2] += velocities[i3 + 2]

      // Wrap around
      const half = SPREAD * 0.5
      if (arr[i3] > half) arr[i3] = -half
      if (arr[i3] < -half) arr[i3] = half
      if (arr[i3 + 1] > half) arr[i3 + 1] = -half
      if (arr[i3 + 1] < -half) arr[i3 + 1] = half
    }
    posAttr.needsUpdate = true

    // Drive uniforms
    shaderMat.uniforms.uTime.value = clock.elapsedTime
    shaderMat.uniforms.uMouseX.value = scrollProgress.mouseX ?? 0
    shaderMat.uniforms.uMouseY.value = scrollProgress.mouseY ?? 0
  })

  return (
    <points ref={pointsRef} material={shaderMat} renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={PARTICLE_COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={PARTICLE_COUNT} itemSize={1} />
      </bufferGeometry>
    </points>
  )
}
