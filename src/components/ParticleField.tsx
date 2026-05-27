import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SPREAD = 20

interface Props {
  scrollProgress: { explode: number; mouseX?: number; mouseY?: number }
  count?: number
}

export function ParticleField({ scrollProgress, count = 500 }: Props) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, velocities, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const sz = new Float32Array(count)

    for (let i = 0; i < count; i++) {
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
  }, [count])

  const shaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouseX: { value: 0 },
        uMouseY: { value: 0 },
        uExplode: { value: 0 },
        uColor: { value: new THREE.Color('#00b67a') },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        uniform float uTime;
        uniform float uMouseX;
        uniform float uMouseY;
        uniform float uExplode;
        varying float vAlpha;
        varying float vExplode;

        void main() {
          vec3 pos = position;

          // Mouse parallax
          pos.x += uMouseX * (pos.z * 0.05);
          pos.y += uMouseY * (pos.z * 0.05);

          // Scroll-driven expansion
          pos *= 1.0 + uExplode * 0.4;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = aSize * (1.0 + uExplode * 0.5) * (150.0 / -mvPos.z);

          float dist = length(mvPos.xyz);
          vAlpha = smoothstep(18.0, 4.0, dist) * (0.4 + uExplode * 0.3);
          vExplode = uExplode;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        varying float vExplode;

        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float alpha = smoothstep(1.0, 0.3, d) * vAlpha;
          if (alpha < 0.01) discard;

          // Shift toward brighter green during explode
          vec3 color = mix(uColor, vec3(0.0, 1.0, 0.6), vExplode * 0.4);
          gl_FragColor = vec4(color, alpha);
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
    const explode = scrollProgress.explode
    const speedMult = 1 + explode * 2

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      arr[i3] += velocities[i3] * speedMult
      arr[i3 + 1] += velocities[i3 + 1] * speedMult
      arr[i3 + 2] += velocities[i3 + 2] * speedMult

      const half = SPREAD * 0.5
      if (arr[i3] > half) arr[i3] = -half
      if (arr[i3] < -half) arr[i3] = half
      if (arr[i3 + 1] > half) arr[i3 + 1] = -half
      if (arr[i3 + 1] < -half) arr[i3 + 1] = half
    }
    posAttr.needsUpdate = true

    shaderMat.uniforms.uTime.value = clock.elapsedTime
    shaderMat.uniforms.uMouseX.value = scrollProgress.mouseX ?? 0
    shaderMat.uniforms.uMouseY.value = scrollProgress.mouseY ?? 0
    shaderMat.uniforms.uExplode.value = THREE.MathUtils.lerp(
      shaderMat.uniforms.uExplode.value, explode, 0.06
    )
  })

  return (
    <points ref={pointsRef} material={shaderMat} renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={count} itemSize={1} />
      </bufferGeometry>
    </points>
  )
}
