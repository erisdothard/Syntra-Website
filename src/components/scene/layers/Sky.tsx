import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { NOISE_GLSL } from '../shaders/noise'

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
uniform float uTime;
uniform float uIgnition;
uniform float uAltitude;
uniform float uVent;
${NOISE_GLSL}

void main() {
  vec2 uv = vUv;

  // Base atmosphere: navy horizon glow fading to void overhead
  vec3 horizon = vec3(0.10, 0.13, 0.24);
  vec3 zenith  = vec3(0.027, 0.031, 0.047);
  float h = pow(clamp(uv.y, 0.0, 1.0), 0.65);
  vec3 col = mix(horizon, zenith, h);

  // Slow drifting cloud bank, denser near the horizon
  vec2 p = vec2(uv.x * 6.0 + uTime * 0.012, uv.y * 3.2 - uTime * 0.004);
  float c = fbm(p);
  float c2 = fbm(p * 2.1 + vec2(3.7, 1.9) + uTime * 0.02);
  float cloud = smoothstep(0.42, 0.78, c * 0.7 + c2 * 0.3) * (1.0 - smoothstep(0.15, 0.75, uv.y));
  col += cloud * vec3(0.08, 0.09, 0.13);

  // Ignition tints the low sky ember and lights the underside of the clouds
  float low = 1.0 - smoothstep(0.0, 0.55, uv.y);
  vec3 ember = vec3(1.0, 0.42, 0.12);
  float glow = uIgnition * low * (0.35 + cloud * 0.9);
  col += ember * glow * 0.55;
  col += vec3(1.0, 0.85, 0.65) * uIgnition * pow(low, 3.0) * 0.25;

  // Venting steam faintly brightens the horizon haze
  col += vec3(0.6, 0.65, 0.75) * uVent * low * 0.05;

  // Altitude: sky darkens to space, stars fade in above the haze line
  vec3 space = vec3(0.008, 0.009, 0.014);
  col = mix(col, space, uAltitude * (0.35 + 0.65 * h));
  vec2 sp = floor(uv * vec2(2600.0, 1500.0));
  float star = step(0.9992, hash21(sp)) * (0.5 + 0.5 * sin(uTime * 2.0 + hash21(sp + 7.0) * 6.28));
  col += star * uAltitude * h * 0.7;

  // Fine grain so the gradient never bands
  col += (hash21(uv * 900.0 + uTime) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`

/** Background layer — sits far behind the pad, moves slowest (parallax 0.15). */
export function Sky() {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const group = useRef<THREE.Group>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIgnition: { value: 0 },
      uAltitude: { value: 0 },
      uVent: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    const s = scrollState
    if (mat.current) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime
      mat.current.uniforms.uIgnition.value = s.ignition
      mat.current.uniforms.uAltitude.value = s.altitude
      mat.current.uniforms.uVent.value = s.vent
    }
    if (group.current) {
      // Explicit differential motion on top of perspective depth
      group.current.position.x = -s.cameraX * 0.15
      group.current.position.y = 60 + (s.cameraY - 9) * 0.35
    }
  })

  return (
    <group ref={group} position={[0, 60, -150]}>
      <mesh frustumCulled={false}>
        <planeGeometry args={[520, 300, 1, 1]} />
        <shaderMaterial
          ref={mat}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  )
}
