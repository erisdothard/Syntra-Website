import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uAlpha;
uniform vec3 uColor;
void main() {
  // ring geometry uv.x is radial (0 inner → 1 outer)
  float r = vUv.x;
  float band = smoothstep(0.0, 0.35, r) * (1.0 - smoothstep(0.55, 1.0, r));
  gl_FragColor = vec4(uColor * 2.4 * band, band * uAlpha);
}
`

/** Two expanding pressure rings across the pad, fired once at ignition. */
export function Shockwave() {
  const a = useRef<THREE.Mesh>(null)
  const b = useRef<THREE.Mesh>(null)
  const ma = useRef<THREE.ShaderMaterial>(null)
  const mb = useRef<THREE.ShaderMaterial>(null)
  const ua = useMemo(() => ({ uAlpha: { value: 0 }, uColor: { value: new THREE.Color('#FFB27A') } }), [])
  const ub = useMemo(() => ({ uAlpha: { value: 0 }, uColor: { value: new THREE.Color('#FF6A1A') } }), [])

  useFrame(() => {
    const s = scrollState
    const k = s.shock
    const active = k > 0.001 && k < 0.999
    if (a.current) {
      a.current.visible = active
      const r = 2 + k * 70
      a.current.scale.set(r, r, 1)
      if (ma.current) ma.current.uniforms.uAlpha.value = (1 - k) * (1 - k) * 0.9
    }
    if (b.current) {
      const k2 = Math.max(0, k - 0.12) / 0.88
      b.current.visible = active && k2 > 0
      const r = 1.5 + k2 * 55
      b.current.scale.set(r, r, 1)
      if (mb.current) mb.current.uniforms.uAlpha.value = (1 - k2) * 0.7
    }
  })

  const ring = <ringGeometry args={[0.72, 1, 96, 1]} />
  return (
    <group position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={a} visible={false} frustumCulled={false}>
        {ring}
        <shaderMaterial ref={ma} vertexShader={vert} fragmentShader={frag} uniforms={ua} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={b} visible={false} frustumCulled={false}>
        {ring}
        <shaderMaterial ref={mb} vertexShader={vert} fragmentShader={frag} uniforms={ub} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
