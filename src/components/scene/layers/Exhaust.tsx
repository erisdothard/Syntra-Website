import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { NOISE_GLSL, RIDGED_GLSL } from '../shaders/noise'

const PROFILE_GLSL = /* glsl */ `
// Radius multiplier along the plume. a = 0 at the nozzle, 1 at the tail.
// Shock-cell barrel just past the exit plane, then the expansion flare: an
// over-expanded sea-level plume necks in first, in near-vacuum it opens out.
float plumeProfile(float a, float expand) {
  float barrel = 1.0 + 0.30 * sin(a * 6.2) * exp(-a * 3.2);
  float flare  = 1.0 + expand * smoothstep(0.05, 1.0, a) * 1.35;
  float taper  = 1.0 - 0.30 * smoothstep(0.62, 1.0, a);
  return barrel * flare * taper;
}
// Object-space cone radius at height y in [-0.5, 0.5]. Matches the source
// CylinderGeometry(0.12, 1, 1) after the vertex stage reshapes it.
float coneRadius(float y, float expand) {
  float a = clamp(0.5 - y, 0.0, 1.0);
  return mix(0.12, 1.0, a) * plumeProfile(a, expand);
}
`

const vert = /* glsl */ `
uniform float uTime;
uniform float uExpand;   // nozzle expansion: 0 pinched at sea level, 1 bloomed in vacuum
uniform mat4 uInvModel;  // world -> this plume's object space
varying vec2 vUv;
varying vec3 vObj;
varying vec3 vRayO;      // camera position in object space
varying float vWorldY;
${NOISE_GLSL}
${PROFILE_GLSL}
void main() {
  vUv = uv;
  // a: 0 at the nozzle, 1 at the tail
  float a = 1.0 - uv.y;
  vec3 p = position;
  float rad = length(p.xz);
  if (rad > 0.0001) {
    vec2 dir = p.xz / rad;
    // ragged, animated boundary — the silhouette should never be a clean line
    float w = vnoise3(vec3(dir * 2.4, a * 3.4 - uTime * 2.6));
    float ragged = 1.0 + (w - 0.5) * (0.14 + a * 1.15);
    p.xz *= plumeProfile(a, uExpand) * ragged;
  }
  vObj = p;
  vRayO = (uInvModel * vec4(cameraPosition, 1.0)).xyz;
  vWorldY = (modelMatrix * vec4(p, 1.0)).y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vObj;
varying vec3 vRayO;
varying float vWorldY;
uniform float uFloorY;    // trench floor — plume fades out before it clips
uniform float uTime;
uniform float uPower;     // 0..1 ignition
uniform float uThrust;    // 0..1
uniform float uAltitude;  // 0..1 — kills the shock structure as ambient pressure drops
uniform float uExpand;
uniform float uHeat;      // brightness multiplier for HDR
uniform float uSoot;      // how dirty this shell runs (0 for the core)
uniform float uOpacity;   // outer sheath stays translucent so the core reads through it
uniform float uCeil;      // HDR ceiling for this shell
${NOISE_GLSL}
${RIDGED_GLSL}
${PROFILE_GLSL}

void main() {
  // ------------------------------------------------------------------
  // Shade the VOLUME, not the skin.
  //
  // Every feature used to be evaluated at this fragment's own surface
  // position, so the shock cells and the colour ramp were functions of the
  // mesh and slid with the camera — which is exactly what makes a shader cone
  // read as a painted cone. Instead, walk the view ray to its closest approach
  // to the plume axis and shade THAT interior point. Two dot products buys a
  // one-sample raymarch: the structure now lives in the volume and holds still
  // as the camera orbits.
  // ------------------------------------------------------------------
  vec3 ro = vRayO;
  vec3 rd = normalize(vObj - ro);
  float dd = dot(rd.xz, rd.xz);
  float tc = dd > 1e-5 ? -dot(ro.xz, rd.xz) / dd : 0.0;
  vec3 pc = ro + rd * max(tc, 0.0);              // closest approach to the axis

  // Axial and radial coordinates of that interior point.
  float ax = clamp(0.5 - pc.y, 0.0, 1.0);        // 0 at the nozzle, 1 at the tail
  float miss = length(pc.xz);
  float rn = clamp(miss / max(coneRadius(pc.y, uExpand), 1e-3), 0.0, 1.0);
  float radial = 1.0 - rn;                       // 1 on the axis, 0 at the boundary
  // True chord length through a cylinder of that radius — real optical depth,
  // where the old pow(dot(N,V), 0.62) was only a silhouette softener.
  float chord = sqrt(max(0.0, 1.0 - rn * rn));

  float v = 1.0 - ax;

  // Ridged noise: abs() folds the field at its zero crossings, giving the sharp
  // filaments of combustion instead of the smooth lumps of cloud fbm. Amplitude
  // grows with distance from the throat, which is how a real shear layer behaves.
  float amp = 0.35 + 0.85 * sqrt(ax);
  float n  = ridged3(vec3(pc.xz * 2.2, ax * 5.0 - uTime * 5.5)) * amp;
  float n2 = vnoise3(vec3(pc.xz * 7.0, ax * 16.0 - uTime * 12.0));

  // Mach diamonds. Node spacing compresses downstream, amplitude decays, and
  // subtracting the ray's miss distance clips them to the core the way real
  // shock cells sit inside the jet rather than in the shear layer.
  float k = ax * (1.0 - ax * 0.55);
  float diamonds = 0.5 + 0.5 * sin(k * (88.0 + uThrust * 26.0) - uTime * 1.2);
  diamonds = pow(diamonds, 4.0) * exp(-ax * 3.6);
  diamonds *= smoothstep(0.0, 0.05, ax) * smoothstep(0.0, 0.72, radial) * (1.0 - uAltitude * 0.55);

  float body = pow(v, 0.85 + n * 0.7);
  float density = body * (0.50 + n * 0.95);

  // Soot. The F-1 burned RP-1/LOX fuel-rich: the plume tears into dark
  // filaments downstream and feeds the black column.
  float soot = uSoot * smoothstep(0.06, 0.42, ax) * smoothstep(0.30, 0.62, n) * (1.0 - uAltitude * 0.35);

  float alpha = density * chord * uPower * uOpacity;
  alpha += diamonds * 0.40 * uPower;
  alpha *= smoothstep(uFloorY, uFloorY + 3.5, vWorldY);
  alpha = clamp(alpha, 0.0, 1.0);
  if (alpha < 0.002) discard;

  vec3 core   = vec3(1.00, 0.96, 0.84);
  vec3 hot    = vec3(1.00, 0.56, 0.17);
  vec3 flame  = vec3(1.00, 0.26, 0.05);
  vec3 sooty  = vec3(0.16, 0.08, 0.05);
  vec3 edge_c = vec3(0.85, 0.11, 0.02);   // cool red shear layer at the boundary

  float t = radial * (0.55 + 0.45 * v);
  vec3 col = mix(edge_c, flame, smoothstep(0.05, 0.50, t + n2 * 0.22));
  col = mix(col, hot, smoothstep(0.58, 0.90, t + n2 * 0.26));
  col = mix(col, core, smoothstep(0.88, 1.06, t + diamonds * 0.55));
  col = mix(col, sooty, soot * 0.95);

  // Premultiplied output, bounded so the buffer can never run away.
  //
  // ACES filmic desaturates and hue-shifts anything much past 1.0 toward
  // yellow-white, and bloom above the 0.86 threshold finishes the job. So a
  // saturated red sheath only survives if it stays in SDR: the outer shell is
  // held near 1.0 to keep its colour, and only the narrow inner core is pushed
  // into HDR where it is meant to blow out and bloom.
  col = min(col * uHeat, vec3(uCeil));
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

type Shell = 'outer' | 'inner'

function shellUniforms(shell: Shell) {
  const outer = shell === 'outer'
  return {
    uTime: { value: 0 },
    uPower: { value: 0 },
    uThrust: { value: 0 },
    uAltitude: { value: 0 },
    uExpand: { value: 0 },
    uInvModel: { value: new THREE.Matrix4() },
    uFloorY: { value: -7.4 },
    // Outer stays in SDR so it keeps its colour under ACES; only the narrow
    // core is pushed into HDR where it is meant to blow out and bloom.
    uHeat: { value: outer ? 0.72 : 3.2 },
    uSoot: { value: outer ? 1 : 0.1 },
    uOpacity: { value: outer ? 0.7 : 1.0 },
    uCeil: { value: outer ? 1.05 : 3.6 },
  }
}

function makeMaterial(shell: Shell) {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: shellUniforms(shell),
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    side: THREE.DoubleSide,
  })
}

export function Exhaust({ engines, liftUnits, baseY }: ExhaustProps) {
  const cluster = useRef<THREE.Group>(null)
  // per-engine plume scale: five F-1s share the total plume footprint
  const per = Math.max(0.82, 1 / Math.sqrt(engines.length))
  const glow = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const midLight = useRef<THREE.PointLight>(null)
  const bounce = useRef<THREE.PointLight>(null)

  // One material pair per engine. The volume lookup needs each plume's own
  // world->object matrix, and a shared material can only carry one.
  const mats = useMemo(
    () => engines.map(() => ({ outer: makeMaterial('outer'), inner: makeMaterial('inner') })),
    [engines],
  )
  useEffect(
    () => () => mats.forEach((m) => { m.outer.dispose(); m.inner.dispose() }),
    [mats],
  )

  const outerGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 1, 1, 40, 24, true), [])
  const innerGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 1, 1, 32, 16, true), [])
  const tex = useMemo(glowTexture, [])

  useFrame((state) => {
    const s = scrollState
    const t = state.clock.elapsedTime
    const power = Math.max(s.ignition, 0)
    const flicker = 1 + (flickerNoise(t * 7.5) - 0.5) * 0.22
    const len = (0.6 + power * 15 + s.thrust * 11) * flicker
    const wid = (0.55 + power * 1.9 + s.thrust * 0.7) * per

    if (cluster.current) {
      cluster.current.visible = power > 0.001
      cluster.current.children.forEach((eng, i) => {
        const [outer, inner] = eng.children as THREE.Mesh[]
        const j = 1 + (flickerNoise(t * 9 + eng.position.x * 4) - 0.5) * 0.14
        outer.scale.set(wid * j, len, wid * j)
        outer.position.y = 0.3 - len / 2
        inner.scale.set(wid * 0.3, len * 0.7, wid * 0.3)
        inner.position.y = 0.3 - (len * 0.7) / 2

        const pair = mats[i]
        if (!pair) return
        // Matrices are one frame stale after the writes above, and the volume
        // lookup is sensitive to that — refresh before inverting.
        outer.updateWorldMatrix(true, false)
        inner.updateWorldMatrix(true, false)
        for (const [mesh, mat, timeScale, expand] of [
          [outer, pair.outer, 1, s.altitude],
          [inner, pair.inner, 1.3, s.altitude * 0.75],
        ] as const) {
          const u = mat.uniforms
          u.uTime.value = t * timeScale
          u.uPower.value = power
          u.uThrust.value = s.thrust
          u.uAltitude.value = s.altitude
          u.uExpand.value = expand
          u.uInvModel.value.copy(mesh.matrixWorld).invert()
        }
      })
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

  return (
    <group>
      <group ref={cluster} visible={false}>
        {engines.map((e, i) => (
          <group key={i} position={[e.x, e.y, e.z]}>
            <mesh geometry={outerGeo} material={mats[i].outer} frustumCulled={false} />
            <mesh geometry={innerGeo} material={mats[i].inner} frustumCulled={false} />
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
