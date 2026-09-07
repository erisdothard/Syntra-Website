import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { NOISE_GLSL } from '../shaders/noise'

const vert = /* glsl */ `
uniform float uTime;
uniform float uExpand;   // nozzle expansion: 0 pinched at sea level, 1 bloomed in vacuum
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vObj;
varying float vWorldY;
${NOISE_GLSL}
void main() {
  vUv = uv;
  // a: 0 at the nozzle, 1 at the tail
  float a = 1.0 - uv.y;
  vec3 p = position;
  float rad = length(p.xz);
  if (rad > 0.0001) {
    vec2 dir = p.xz / rad;
    // Shock-cell barrel just past the exit plane, then the expansion flare.
    // An over-expanded sea-level plume necks in first; in near-vacuum it opens
    // out into a bell. A straight-sided cone reads as neither.
    float barrel = 1.0 + 0.30 * sin(a * 6.2) * exp(-a * 3.2);
    float flare  = 1.0 + uExpand * smoothstep(0.05, 1.0, a) * 1.35;
    float taper  = 1.0 - 0.30 * smoothstep(0.62, 1.0, a);
    // ragged, animated boundary — the silhouette should never be a clean line
    float w = vnoise3(vec3(dir * 2.4, a * 3.4 - uTime * 2.6));
    float ragged = 1.0 + (w - 0.5) * (0.14 + a * 1.15);
    p.xz *= barrel * flare * taper * ragged;
  }
  vObj = p;
  vWorldY = (modelMatrix * vec4(p, 1.0)).y;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // Normals are left at the undisplaced cone. They only feed the chord-length
  // approximation below, which is insensitive to the small radial offset.
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vObj;
varying float vWorldY;
uniform float uFloorY;    // trench floor — plume fades out before it clips
uniform float uTime;
uniform float uPower;     // 0..1 ignition
uniform float uThrust;    // 0..1
uniform float uAltitude;  // 0..1 — kills the shock structure as ambient pressure drops
uniform float uHeat;      // brightness multiplier for HDR
uniform float uSoot;      // how dirty this shell runs (0 for the core)
${NOISE_GLSL}

void main() {
  // v = 1 at the nozzle (apex), 0 at the far end of the plume
  // Keep the tail strictly positive: pow(0, y) is undefined on some GPUs and
  // NaN under additive blending shows up as a saturated blob at the base.
  float v = clamp(vUv.y, 0.002, 1.0);
  float along = 1.0 - v;

  // Turbulence sampled in OBJECT space, not UV space. UV-locked noise rides the
  // surface as the camera orbits, which is what makes a shader cone read as a
  // painted cone; object-space noise sits still inside the volume.
  float n  = fbm3(vec3(vObj.xz * 2.2, along * 5.0 - uTime * 5.5));
  float n2 = vnoise3(vec3(vObj.xz * 7.0, along * 16.0 - uTime * 12.0));

  // For a cylinder, |dot(N, V)| is the normalised chord length through the
  // volume along the view ray — so it doubles as optical depth, not just a
  // silhouette mask. Full through the middle, soft at the edge.
  float rim = abs(dot(normalize(vNormalV), normalize(vViewDir)));
  float thickness = pow(rim, 0.62);

  // Mach diamonds. Real shock cells compress downstream and decay in amplitude,
  // they live in the core rather than the shear layer, and they disappear once
  // the nozzle is ideally expanded — hence the altitude term.
  float k = along * (1.0 - along * 0.55);
  float diamonds = 0.5 + 0.5 * sin(k * (52.0 + uThrust * 16.0) - uTime * 1.2);
  diamonds = pow(diamonds, 9.0) * exp(-along * 4.2);
  diamonds *= smoothstep(0.0, 0.05, along) * pow(rim, 2.2) * (1.0 - uAltitude * 0.55);

  // Length falloff — plume thins and breaks up toward the tail
  float body = pow(v, 0.85 + n * 0.7);
  float density = body * (0.50 + n * 0.95);

  // Soot. The F-1 burned RP-1/LOX fuel-rich: the plume is not a clean torch,
  // it tears into dark filaments downstream and feeds the black column.
  float soot = uSoot * smoothstep(0.06, 0.42, along) * smoothstep(0.30, 0.62, n) * (1.0 - uAltitude * 0.35);

  float alpha = density * thickness * uPower;
  alpha += diamonds * 0.75 * uPower;
  alpha *= smoothstep(uFloorY, uFloorY + 3.5, vWorldY);
  alpha = clamp(alpha, 0.0, 1.0);
  if (alpha < 0.002) discard;

  // Colour ramp: white-hot core → ember → deep orange, then soot break-up
  vec3 core  = vec3(1.00, 0.96, 0.84);
  vec3 hot   = vec3(1.00, 0.56, 0.17);
  vec3 flame = vec3(1.00, 0.26, 0.05);
  vec3 sooty = vec3(0.16, 0.08, 0.05);
  float coreness = pow(v, 2.0) * (0.45 + 0.55 * rim);
  vec3 col = mix(flame, hot, smoothstep(0.14, 0.72, coreness + n2 * 0.30));
  col = mix(col, core, smoothstep(0.52, 1.0, coreness + diamonds * 0.9));
  col = mix(col, sooty, soot * 0.95);

  // Premultiplied output, bounded so the buffer can never run away. The ceiling
  // sits well above the 0.86 bloom threshold so the core actually blooms.
  col = min(col * uHeat, vec3(3.4));
  gl_FragColor = vec4(col * alpha, alpha);
}
`

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,240,220,1)')
  g.addColorStop(0.25, 'rgba(255,170,90,0.7)')
  g.addColorStop(0.6, 'rgba(255,90,20,0.18)')
  g.addColorStop(1, 'rgba(255,60,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ---- broadband flicker ---------------------------------------------------- */

const FL = Float32Array.from({ length: 256 }, () => Math.random())

function fnoise(x: number) {
  const i = Math.floor(x)
  const f = x - i
  const s = f * f * (3 - 2 * f)
  const a = FL[i & 255]
  const b = FL[(i + 1) & 255]
  return a + (b - a) * s
}

/**
 * Combustion instability is broadband. Two sine waves are periodic and, at 57
 * and 91 rad/s, alias against a 60 Hz frame clock into a visible slow beat.
 */
function flickerNoise(t: number) {
  return (
    fnoise(t) * 0.5 + fnoise(t * 2.17 + 31) * 0.28 + fnoise(t * 4.4 + 7) * 0.14 + fnoise(t * 9.3 + 53) * 0.08
  )
}

/**
 * Flame plume: a shader cone (apex at the engines) whose radius is reshaped in
 * the vertex stage into a real plume profile, plus an inner core cone, a
 * billboard glow and a three-point light rig standing in for the plume's
 * enormous emitting area. Values are pushed above 1.0 so bloom treats them as HDR.
 */
interface ExhaustProps {
  /** Engine bell positions in the parent (vehicle) space. */
  engines: THREE.Vector3[]
  /** World units the vehicle travels at lift = 1, so the pad bounce can stay put. */
  liftUnits: number
  /** Vehicle base height, for the same reason. */
  baseY: number
}

export function Exhaust({ engines, liftUnits, baseY }: ExhaustProps) {
  const cluster = useRef<THREE.Group>(null)
  const outerMat = useRef<THREE.ShaderMaterial>(null)
  const innerMat = useRef<THREE.ShaderMaterial>(null)
  // per-engine plume scale: five F-1s share the total plume footprint
  const per = Math.max(0.82, 1 / Math.sqrt(engines.length))
  const glow = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const midLight = useRef<THREE.PointLight>(null)
  const bounce = useRef<THREE.PointLight>(null)
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPower: { value: 0 }, uThrust: { value: 0 }, uAltitude: { value: 0 }, uExpand: { value: 0 }, uHeat: { value: 1.5 }, uSoot: { value: 1 }, uFloorY: { value: -7.4 } }),
    [],
  )
  const uniformsInner = useMemo(
    () => ({ uTime: { value: 0 }, uPower: { value: 0 }, uThrust: { value: 0 }, uAltitude: { value: 0 }, uExpand: { value: 0 }, uHeat: { value: 2.2 }, uSoot: { value: 0.15 }, uFloorY: { value: -7.4 } }),
    [],
  )
  const tex = useMemo(glowTexture, [])

  useFrame((state) => {
    const s = scrollState
    const t = state.clock.elapsedTime
    const power = Math.max(s.ignition, 0)
    const flicker = 1 + (flickerNoise(t * 7.5) - 0.5) * 0.22
    const len = (0.6 + power * 15 + s.thrust * 11) * flicker
    const wid = (0.55 + power * 1.9 + s.thrust * 0.7) * per

    // R3F copies the uniforms object on assignment — always write through the material.
    if (outerMat.current) {
      const u = outerMat.current.uniforms
      u.uTime.value = t
      u.uPower.value = power
      u.uThrust.value = s.thrust
      u.uAltitude.value = s.altitude
      u.uExpand.value = s.altitude
    }
    if (innerMat.current) {
      const u = innerMat.current.uniforms
      u.uTime.value = t * 1.3
      u.uPower.value = power
      u.uThrust.value = s.thrust
      u.uAltitude.value = s.altitude
      u.uExpand.value = s.altitude * 0.75
    }

    if (cluster.current) {
      cluster.current.visible = power > 0.001
      for (const eng of cluster.current.children) {
        const [outer, inner] = eng.children as THREE.Mesh[]
        const j = 1 + (flickerNoise(t * 9 + eng.position.x * 4) - 0.5) * 0.14
        outer.scale.set(wid * j, len, wid * j)
        outer.position.y = 0.3 - len / 2
        inner.scale.set(wid * 0.45, len * 0.62, wid * 0.45)
        inner.position.y = 0.3 - (len * 0.62) / 2
      }
    }
    if (glow.current) {
      const g = (power * 6.5 + s.vent * 0.6) * flicker
      glow.current.visible = g > 0.01
      glow.current.scale.set(g, g, 1)
      ;(glow.current.material as THREE.SpriteMaterial).opacity = Math.min(0.85, power * 1.0 + s.vent * 0.1)
    }
    // Three sources approximate an emitter that is physically tens of metres
    // long: a hot exit plane, the bulk of the plume, and the pad bounce.
    if (light.current) {
      light.current.intensity = power * 240 * flicker + s.vent * 10
      light.current.position.y = 0.2 - len * 0.05
    }
    if (midLight.current) {
      midLight.current.intensity = power * 360 * flicker
      midLight.current.position.y = 0.2 - len * 0.45
    }
    if (bounce.current) {
      // Stays with the pad while the vehicle climbs away from it.
      bounce.current.intensity = power * 210 * (1 - s.altitude * 0.8)
      bounce.current.position.y = -5 - baseY - s.lift * liftUnits
    }
  })

  const outerMaterial = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending, premultipliedAlpha: true, side: THREE.DoubleSide }),
    [uniforms],
  )
  const innerMaterial = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: uniformsInner, transparent: true, depthWrite: false, blending: THREE.NormalBlending, premultipliedAlpha: true, side: THREE.DoubleSide }),
    [uniformsInner],
  )
  const outerGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 1, 1, 40, 24, true), [])
  const innerGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 1, 1, 32, 16, true), [])
  // materials are shared across engines; the refs feed the per-frame uniform writes
  outerMat.current = outerMaterial
  innerMat.current = innerMaterial

  return (
    <group>
      <group ref={cluster} visible={false}>
        {engines.map((e, i) => (
          <group key={i} position={[e.x, e.y, e.z]}>
            <mesh geometry={outerGeo} material={outerMaterial} frustumCulled={false} />
            <mesh geometry={innerGeo} material={innerMaterial} frustumCulled={false} />
          </group>
        ))}
      </group>
      <sprite ref={glow} position={[0, 0.4, 0]}>
        <spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0.2, 0]} color="#FFB070" intensity={0} distance={44} decay={2} />
      <pointLight ref={midLight} position={[0, 0, 0]} color="#FF6A20" intensity={0} distance={110} decay={2} />
      <pointLight ref={bounce} position={[0, -8, 0]} color="#FF5512" intensity={0} distance={80} decay={2} />
    </group>
  )
}
