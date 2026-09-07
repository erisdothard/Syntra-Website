import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { NOISE_GLSL } from '../shaders/noise'
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
varying float vSoot;
varying float vDim;
varying vec2 vUv;
varying vec2 vTile;
varying float vKind;

${NOISE_GLSL}

#define PI 3.14159265

void main() {
  vUv = uv;
  float kind = aSeed.y;           // <0.22 vent, <0.75 ground cloud, else column
  vKind = kind;
  float ang = aSeed.z * PI * 2.0;
  float rnd = aSeed.w;
  // Decorrelated tile pick — sprite shape must not track size, speed or angle,
  // or the four shapes read as four size classes.
  float tsel = floor(fract(aSeed.x * 71.3 + aSeed.z * 13.7 + aSeed.y * 29.1) * 4.0);
  vTile = vec2(mod(tsel, 2.0), floor(tsel * 0.5)) * 0.5;

  vec3 c;
  float size;
  float alpha;
  float ph;
  float lit = 0.0;
  float soot = 0.0;
  float turb = 0.0;
  float loft = 1.0;

  if (kind < 0.22) {
    // Venting: small puffs escaping the body sides, drifting outward + up
    float speed = 0.28 + rnd * 0.2;
    ph = fract(aSeed.x + uTime * speed);
    float side = (aSeed.x > 0.5) ? 1.0 : -1.0;
    float h = uBaseY + 6.0 + rnd * 12.0;
    c = vec3(side * (1.9 + ph * 3.2), h + ph * 2.4, (aSeed.z - 0.5) * 1.6);
    size = (0.9 + pow(ph, 0.55) * 2.4) * (0.6 + rnd * 0.6);
    alpha = uVent * (1.0 - ph) * ph * 4.0 * 0.75;
    turb = 0.20 + ph * 0.8;
    loft = 0.7;
  } else if (kind < 0.75) {
    // Ground cloud: rolls outward across the pad, climbs, thins with time
    // Discrete billows. A uniform phase distribution spreads particles evenly,
    // and evenly-spread semi-transparent sprites integrate to flat grey no matter
    // how each one is shaded. Emitting in waves gives the cloud fronts and gaps,
    // which is what actually reads as volume.
    float wave = floor(aSeed.x * 6.0);
    float speed = 0.085 + fract(wave * 0.37) * 0.055;
    ph = fract(wave * 0.1667 + rnd * 0.14 + uTime * speed);
    // Lobed front. A real pad cloud pushes further along some bearings than
    // others; a uniform radius is the single loudest "expanding disc" tell.
    float lobe = 0.62 + 0.76 * vnoise(vec2(ang * 1.6, rnd * 12.0 + 3.0));
    float reach = (3.0 + uIgnition * 24.0 + uThrust * 8.0) * lobe;
    float r = pow(ph, 0.7) * reach;
    // low carpet that billows up at the leading edge
    float rise = pow(ph, 0.5) * (0.6 + uIgnition * 3.4 + uThrust * 2.2);
    float roll = sin(ph * PI * 1.5 + rnd * 6.0) * 1.4 * uIgnition;
    // clouds pour out of the trench ends (±z) and away from the camera (-z bias)
    float z = (sin(ang) * 0.75 - 0.55) * r;
    c = vec3(cos(ang) * r * 0.9, rise + roll * 0.4 + rnd * 0.8, z);
    size = (0.9 + pow(ph, 0.55) * 3.6 + uIgnition * 2.0) * (0.5 + rnd * 0.8);
    float life = pow(1.0 - ph, 1.7) * smoothstep(0.0, 0.06, ph);
    // The cloud is dense against the deck and dissipates with height. Without
    // this the tall late-life puffs are large, faint and everywhere, and they
    // integrate into a screen-wide veil that greys out the vehicle.
    float thin = 1.0 - smoothstep(1.5, 8.0, rise);
    alpha = (uIgnition * 0.95 + uVent * 0.08) * life * (0.20 + thin * 0.62);
    // underside lit by the trench fire: strongest near the pad and the centre
    lit = uIgnition * clamp(1.0 - r / (reach * 0.75), 0.0, 1.0) * clamp(1.0 - rise / 7.0, 0.0, 1.0) * 1.8;
    soot = uIgnition * smoothstep(0.05, 0.5, ph) * 0.5;
    turb = (0.5 + ph * 3.0) * (0.3 + uIgnition * 0.8);
    loft = 0.40;
  } else {
    // Column: trails below the engines as the vehicle climbs
    float wave = floor(aSeed.x * 5.0);
    float speed = 0.34 + fract(wave * 0.53) * 0.3;
    ph = fract(wave * 0.2 + rnd * 0.16 + uTime * speed);
    float nozzle = uBaseY + uLift * uLiftUnits;
    float drop = ph * (14.0 + uThrust * 36.0);
    float spread = 0.6 + ph * 4.5;
    c = vec3(cos(ang) * spread * rnd, nozzle - drop, sin(ang) * spread * rnd);
    size = (1.2 + pow(ph, 0.55) * 6.0) * (0.6 + rnd * 0.6);
    alpha = uThrust * (1.0 - ph) * 0.45 * step(0.02, uLift);
    lit = (1.0 - ph) * uThrust * 0.9;
    soot = uThrust * smoothstep(0.0, 0.3, ph) * 0.8;
    turb = (0.4 + ph * 2.4) * (0.4 + uThrust);
    loft = 0.85;
  }

  // Curl advection. The field is sampled at the particle's own world position,
  // so neighbours sitting close together get near-identical velocities and the
  // cloud folds as a sheet. That spatial coherence — not the per-particle
  // randomness — is what separates fluid from jitter.
  vec3 fp = c * 0.055 - vec3(0.0, uTime * 0.30, 0.0);
  vec3 flow = curl3(fp) + curl3(fp * 2.9 + 11.0) * 0.42;
  // Bound the field to roughly unit length so turb reads as literal world units.
  // Raw curl magnitude here runs 2-3x and sprays the cloud into flat haze.
  float fl = length(flow);
  flow = flow / max(fl, 1e-4) * min(fl * 0.45, 1.0);
  flow.y *= loft;   // the pad cloud must roll outward, not loft into the sky
  c += flow * turb;

  vAlpha = alpha;
  vLit = lit;
  vSoot = soot;
  vDim = 0.55 + 0.45 * rnd;

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
varying float vSoot;
varying float vDim;
varying vec2 vUv;
varying vec2 vTile;
varying float vKind;
uniform sampler2D uTex;

void main() {
  // Inset stops mip filtering from bleeding between atlas tiles.
  vec2 uvt = vTile + (0.012 + vUv * 0.976) * 0.5;
  vec4 t = texture2D(uTex, uvt);
  float a = t.a * vAlpha;
  if (a <= 0.0025) discard;
  float depth = t.g;   // baked distance into the puff: 0 at the wisp, 1 at the core

  vec3 grey  = vec3(0.46, 0.48, 0.55);
  vec3 steam = vec3(0.82, 0.86, 0.94);
  vec3 ember = vec3(1.00, 0.42, 0.13);
  vec3 base = vKind < 0.22 ? steam : grey;
  base *= vDim;
  // A puff's interior is self-shadowed; only the thin rim catches the pad lights.
  // This gradient is most of what makes smoke read as solid rather than as fog.
  base *= mix(0.90, 0.30, depth);
  // RP-1/LOX runs fuel-rich — the column and the near cloud carry real soot
  base = mix(base, vec3(0.11, 0.10, 0.11), vSoot * depth);
  // flame light from below, strongest where the puff is densest
  vec3 col = base + ember * vLit * (0.22 + depth * 1.6);

  gl_FragColor = vec4(col * a, a);
}
`

/* ---- procedural puff atlas ------------------------------------------------ */

function hash2(x: number, y: number) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return h - Math.floor(h)
}

function vn2(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)
  const top = a + (b - a) * sx
  return top + (c + (d - c) * sx - top) * sy
}

function fbm2(x: number, y: number, oct = 4) {
  let v = 0
  let amp = 0.5
  for (let i = 0; i < oct; i++) {
    v += amp * vn2(x, y)
    x = x * 2.07 + 17.1
    y = y * 2.07 + 9.7
    amp *= 0.5
  }
  return v
}

const TILE = 128
const ATLAS = TILE * 2

/**
 * 2x2 atlas of four distinct domain-warped puffs. One shared radial disc across
 * every particle is instantly readable as repetition; four cauliflower shapes
 * picked per instance and spun individually is not.
 *
 * Alpha carries density; green carries distance into the puff, so the fragment
 * shader gets an interior gradient for free instead of paying for noise per pixel
 * across a very high overdraw surface.
 */
function puffAtlas() {
  const c = document.createElement('canvas')
  c.width = c.height = ATLAS
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(ATLAS, ATLAS)
  const half = TILE / 2

  for (let t = 0; t < 4; t++) {
    const ox = (t % 2) * TILE
    const oy = Math.floor(t / 2) * TILE
    const so = t * 137.5 + 11.3
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const dx = (x + 0.5 - half) / half
        const dy = (y + 0.5 - half) / half
        const d = Math.hypot(dx, dy)
        // domain warp: pushes the boundary into billows instead of a circle
        const wx = fbm2(dx * 1.9 + so, dy * 1.9 + so) - 0.5
        const wy = fbm2(dx * 1.9 + so + 41.3, dy * 1.9 + so + 17.9) - 0.5
        const dd = Math.hypot(dx + wx * 0.55, dy + wy * 0.55)
        const lump = 0.86 + 0.32 * (fbm2(Math.atan2(dy, dx) * 2.2 + so, d * 2.6 + so) - 0.5)
        const e = dd / Math.max(0.2, lump) // 0 at the core, 1 at the boundary
        const core = Math.max(0, 1 - e)
        const detail = Math.min(1, 0.68 + 0.64 * fbm2(dx * 4.4 + so * 2, dy * 4.4 + so * 2, 3))
        // hard vignette so no puff touches the tile border (mip bleed)
        const cut = Math.max(0, Math.min(1, (0.98 - d) / 0.12))
        const a = Math.pow(core, 2.1) * detail * cut
        const depth = Math.pow(core, 3.0) * cut

        const i = ((oy + y) * ATLAS + ox + x) * 4
        img.data[i] = 255
        img.data[i + 1] = depth * 255
        img.data[i + 2] = 255
        img.data[i + 3] = a * 255
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  // Data, not colour — no sRGB decode on the depth channel.
  tex.colorSpace = THREE.NoColorSpace
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  return tex
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
        uTex: { value: puffAtlas() },
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
        premultipliedAlpha
      />
    </mesh>
  )
}
