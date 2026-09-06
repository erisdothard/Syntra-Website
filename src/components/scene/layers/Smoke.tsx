import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { LIFT_UNITS, ROCKET_BASE_Y } from './Rocket'

const vert = /* glsl */ `
attribute vec4 aSeed;   // x: phase offset, y: kind, z: angle, w: misc
uniform float uTime;
uniform float uVent;
uniform float uIgnition;
uniform float uThrust;
uniform float uLift;
uniform float uLiftUnits;
uniform float uBaseY;
varying float vAlpha;
varying float vLit;
varying vec2 vUv;
varying float vKind;

#define PI 3.14159265

void main() {
  vUv = uv;
  float kind = aSeed.y;           // <0.22 vent, <0.75 ground cloud, else column
  vKind = kind;
  float ang = aSeed.z * PI * 2.0;
  float rnd = aSeed.w;
  vec3 c;
  float size;
  float alpha;
  float lit = 0.0;

  if (kind < 0.22) {
    // Venting: small puffs escaping the body sides, drifting outward + up
    float speed = 0.28 + rnd * 0.2;
    float ph = fract(aSeed.x + uTime * speed);
    float side = (aSeed.x > 0.5) ? 1.0 : -1.0;
    float h = uBaseY + 6.0 + rnd * 12.0;
    c = vec3(side * (1.9 + ph * 3.2), h + ph * 2.4 + sin(uTime * 2.0 + aSeed.x * 9.0) * 0.2, (aSeed.z - 0.5) * 1.6);
    size = (0.9 + ph * 2.4) * (0.6 + rnd * 0.6);
    alpha = uVent * (1.0 - ph) * ph * 4.0 * 0.75;
  } else if (kind < 0.75) {
    // Ground cloud: rolls outward across the pad, climbs, thins with time
    float speed = 0.12 + rnd * 0.12;
    float ph = fract(aSeed.x + uTime * speed);
    float reach = 3.0 + uIgnition * 24.0 + uThrust * 8.0;
    float r = pow(ph, 0.7) * reach;
    // low carpet that billows up at the leading edge
    float rise = pow(ph, 0.5) * (0.8 + uIgnition * 5.5 + uThrust * 3.0);
    float roll = sin(ph * PI * 1.5 + rnd * 6.0) * 1.4 * uIgnition;
    // clouds pour out of the trench ends (±z) and away from the camera (-z bias)
    float zdir = sin(ang);
    float z = (zdir * 0.75 - 0.35) * r;
    c = vec3(cos(ang) * r * 0.9, rise + roll * 0.4 + rnd * 0.8, z);
    size = (1.0 + ph * 5.5 + uIgnition * 3.0) * (0.5 + rnd * 0.8);
    float life = (1.0 - ph) * smoothstep(0.0, 0.08, ph);
    alpha = (uIgnition * 0.95 + uVent * 0.08) * life * 0.3;
    // underside lit by the trench fire: strongest near the pad and the centre
    lit = uIgnition * clamp(1.0 - r / (reach * 0.75), 0.0, 1.0) * clamp(1.0 - rise / 7.0, 0.0, 1.0) * 1.8;
  } else {
    // Column: trails below the engines as the vehicle climbs
    float speed = 0.4 + rnd * 0.35;
    float ph = fract(aSeed.x + uTime * speed);
    float nozzle = uBaseY + uLift * uLiftUnits;
    float drop = ph * (14.0 + uThrust * 36.0);
    float spread = 0.6 + ph * 4.5;
    c = vec3(cos(ang) * spread * rnd, nozzle - drop, sin(ang) * spread * rnd);
    size = (1.2 + ph * 6.0) * (0.6 + rnd * 0.6);
    alpha = uThrust * (1.0 - ph) * 0.45 * step(0.02, uLift);
    lit = (1.0 - ph) * uThrust * 0.9;
  }

  vAlpha = alpha;
  vLit = lit;

  vec4 mvCenter = modelViewMatrix * vec4(c, 1.0);
  // slow per-particle spin for the sprite
  float rot = uTime * (0.2 + rnd * 0.5) * (aSeed.z > 0.5 ? 1.0 : -1.0);
  float cs = cos(rot), sn = sin(rot);
  vec2 q = vec2(position.x * cs - position.y * sn, position.x * sn + position.y * cs) * size;
  vec4 mv = mvCenter + vec4(q, 0.0, 0.0);
  gl_Position = projectionMatrix * mv;
}
`

const frag = /* glsl */ `
precision highp float;
varying float vAlpha;
varying float vLit;
varying vec2 vUv;
varying float vKind;
uniform sampler2D uTex;

void main() {
  float a = texture2D(uTex, vUv).a;
  if (vAlpha <= 0.002) discard;
  vec3 grey  = vec3(0.46, 0.48, 0.55);
  vec3 steam = vec3(0.82, 0.86, 0.94);
  vec3 ember = vec3(1.0, 0.45, 0.16);
  vec3 base = vKind < 0.22 ? steam : grey;
  // underside lighting from the flame, brighter at the sprite centre
  float centre = pow(a, 1.6);
  vec3 col = mix(base, ember * 1.9, clamp(vLit * (0.45 + centre), 0.0, 1.0));
  gl_FragColor = vec4(col, a * vAlpha);
}
`

function puffTexture() {
  const N = 128
  const c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(N, N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x - N / 2) / (N / 2)
      const dy = (y - N / 2) / (N / 2)
      const d = Math.sqrt(dx * dx + dy * dy)
      // soft disc with a slightly lumpy edge so overlapping puffs look organic
      const lump = 0.92 + 0.08 * Math.sin(Math.atan2(dy, dx) * 5 + d * 9)
      const a = Math.max(0, 1 - d / lump)
      const v = Math.pow(a, 2.2) * 255
      const i = (y * N + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = v
    }
  }
  ctx.putImageData(img, 0, 0)
  return new THREE.CanvasTexture(c)
}

/**
 * Instanced billboard smoke. Three populations in one draw call: vent puffs
 * (Act 1), the rolling pad cloud (Act 2), and the exhaust column (Act 3).
 */
export function Smoke({ count }: { count: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const mesh = useRef<THREE.InstancedMesh>(null)

  const { geometry, uniforms } = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = base.index
    geo.attributes.position = base.attributes.position
    geo.attributes.uv = base.attributes.uv
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      seeds[i * 4 + 0] = Math.random()
      seeds[i * 4 + 1] = Math.random()
      seeds[i * 4 + 2] = Math.random()
      seeds[i * 4 + 3] = Math.random()
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    geo.instanceCount = count
    return {
      geometry: geo,
      uniforms: {
        uTime: { value: 0 },
        uVent: { value: 0 },
        uIgnition: { value: 0 },
        uThrust: { value: 0 },
        uLift: { value: 0 },
        uLiftUnits: { value: LIFT_UNITS },
        uBaseY: { value: ROCKET_BASE_Y },
        uTex: { value: puffTexture() },
      },
    }
  }, [count])

  useFrame((state) => {
    const s = scrollState
    if (!mat.current) return
    const u = mat.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uVent.value = s.vent
    u.uIgnition.value = s.ignition
    u.uThrust.value = s.thrust
    u.uLift.value = s.lift
    if (mesh.current) mesh.current.visible = s.vent + s.ignition + s.thrust > 0.002
  })

  return (
    <mesh ref={mesh as unknown as React.RefObject<THREE.Mesh>} geometry={geometry} frustumCulled={false} renderOrder={5}>
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest
      />
    </mesh>
  )
}
