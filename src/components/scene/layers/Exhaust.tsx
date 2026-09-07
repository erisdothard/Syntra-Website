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
// Object-space cone radius at height y in [-0.5, 0.5]. radii = (top, bottom)
// of the source CylinderGeometry — these MUST track the geometry, or the volume
// lookup measures against the wrong envelope and clips the plume to a thread.
float coneRadius(float y, float expand, vec2 radii) {
  float a = clamp(0.5 - y, 0.0, 1.0);
  return mix(radii.x, radii.y, a) * plumeProfile(a, expand);
}
`

const vert = /* glsl */ `
uniform float uTime;
uniform float uExpand;   // nozzle expansion: 0 pinched at sea level, 1 bloomed in vacuum
uniform mat4 uInvModel;  // world -> this plume's object space
uniform vec2 uRadii;     // (top, bottom) radius of the source geometry
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
    float w = vnoise3(vec3(dir * 2.4, a * 3.4 - uTime * 0.9));
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
uniform vec2 uRadii;      // (top, bottom) radius of the source geometry
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
  float rn = clamp(miss / max(coneRadius(pc.y, uExpand, uRadii), 1e-3), 0.0, 1.0);
  float radial = 1.0 - rn;                       // 1 on the axis, 0 at the boundary
  // True chord length through a cylinder of that radius — real optical depth,
  // where the old pow(dot(N,V), 0.62) was only a silhouette softener.
  float chord = sqrt(max(0.0, 1.0 - rn * rn));

  float v = 1.0 - ax;

  // Ridged noise: abs() folds the field at its zero crossings, giving the sharp
  // filaments of combustion instead of the smooth lumps of cloud fbm. Amplitude
  // grows with distance from the throat, which is how a real shear layer behaves.
  float amp = 0.35 + 0.85 * sqrt(ax);
  float n  = ridged3(vec3(pc.xz * 2.2, ax * 5.0 - uTime * 1.85)) * amp;
  float n2 = vnoise3(vec3(pc.xz * 7.0, ax * 16.0 - uTime * 4.0));

  // Mach diamonds. Node spacing compresses downstream, amplitude decays, and
  // subtracting the ray's miss distance clips them to the core the way real
  // shock cells sit inside the jet rather than in the shear layer.
  // Crisp diamond stacks are RS-25/J-2 imagery. The F-1 at sea level runs
  // Pe/Pa = 0.83 — only marginally overexpanded, so the shocks are weak — and
  // the plume is optically thick with soot besides. Two or three soft luminance
  // swells, no white. Removing detail here is what makes it read as an F-1.
  float k = ax * (1.0 - ax * 0.55);
  float diamonds = 0.5 + 0.5 * sin(k * (16.0 + uThrust * 5.0) - uTime * 0.4);
  diamonds = pow(diamonds, 2.0) * exp(-ax * 5.5);
  diamonds *= smoothstep(0.0, 0.06, ax) * smoothstep(0.0, 0.72, radial) * (1.0 - uAltitude * 0.55);

  float body = pow(v, 0.85 + n * 0.7);
  float density = body * (0.50 + n * 0.95);

  // Soot. The F-1 burned RP-1/LOX fuel-rich: the plume tears into dark
  // filaments downstream and feeds the black column.
  float soot = uSoot * smoothstep(0.06, 0.42, ax) * smoothstep(0.30, 0.62, n) * (1.0 - uAltitude * 0.35);

  float alpha = density * chord * uPower * uOpacity;
  alpha += diamonds * 0.14 * uPower;
  alpha *= smoothstep(uFloorY, uFloorY + 3.5, vWorldY);
  alpha = clamp(alpha, 0.0, 1.0);
  if (alpha < 0.002) discard;

  // Sampled down the plume axis of NASA's original-resolution Apollo scans, the
  // full-thrust core is achromatic white (#FBFBF9 -> #FFFFFF), and at night it
  // goes blue-white (#BFD2EE). Orange exists only as a narrow burnt collar
  // roughly 1-3 exit diameters below the bells. Sooty kerolox is an optically
  // thick greybody near 1700K: that reads as white with a warm fringe, and every
  // real camera clips it — launch photographers stop down to f/16-f/20 to
  // protect the highlight and it clips anyway.
  //
  // The previous ramp had this inverted: a mostly red-orange body with white as
  // a thin axial thread, held down in SDR specifically to stop the orange
  // desaturating. That is fighting the highlight rolloff that makes it read as
  // photographed.
  vec3 white  = vec3(1.00, 0.99, 0.97);
  vec3 cool   = vec3(0.75, 0.82, 0.93);   // blue-white far column, night
  vec3 collar = vec3(0.92, 0.38, 0.12);   // burnt orange, near the bells only
  vec3 sooty  = vec3(0.02, 0.012, 0.012);

  vec3 col = white;
  // Cools and dims downstream — the incandescent section is short.
  col = mix(col, cool, smoothstep(0.30, 0.95, ax) * 0.72);
  // Orange collar: gated on distance from the nozzle, not on radius, and
  // weighted toward the shear layer where the gas is coolest.
  float collarBand = smoothstep(0.015, 0.07, ax) * (1.0 - smoothstep(0.09, 0.30, ax));
  col = mix(col, collar, collarBand * (0.35 + 0.65 * (1.0 - radial)));
  // Turbine-exhaust sheath. The F-1 film-cools the bell lip with fuel-rich
  // turbine gas at 887K against a 1708K core — a (1708/887)^4 = 14x blackbody
  // ratio, so on any exposure where the core is legible this renders black. It
  // ignites 1-3m downstream, so it terminates hard rather than fading.
  float sheath = smoothstep(0.60, 0.88, rn) * (1.0 - smoothstep(0.012, 0.038, ax));
  col = mix(col, sooty, sheath * 0.92);
  col = mix(col, sooty, soot * 0.95);

  // Longitudinal striations: the only visible trace of five engines once the
  // plumes have merged. Bright lanes against the body, roughly 4:1.
  float lane = 0.5 + 0.5 * cos(atan(pc.z, pc.x) * 5.0);
  col *= mix(1.0, 0.74 + 0.5 * lane, smoothstep(0.04, 0.30, ax) * (1.0 - smoothstep(0.5, 0.9, ax)));

  // Incandescent section is only ~0.4 vehicle lengths; the rest is a dimmer
  // condensation trail, not more flame.
  col *= mix(1.0, 0.22, smoothstep(0.28, 0.78, ax));

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
    uRadii: { value: outer ? new THREE.Vector2(0.62, 1.0) : new THREE.Vector2(0.4, 0.72) },
    uFloorY: { value: -7.4 },
    // Outer stays in SDR so it keeps its colour under ACES; only the narrow
    // core is pushed into HDR where it is meant to blow out and bloom.
    uHeat: { value: outer ? 1.9 : 4.2 },
    uSoot: { value: outer ? 1 : 0.1 },
    uOpacity: { value: outer ? 0.7 : 1.0 },
    uCeil: { value: outer ? 3.0 : 6.0 },
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
  // The five plumes are drawn as ONE column. The nozzle geometry forbids them
  // staying separate: outboards sit on a 9.24m circle with a 3.72m exit
  // diameter, so the centre-to-outboard rim gap is 0.90m and outboard-to-
  // outboard is 2.81m — those close within about 2m and 8m respectively. The
  // centre engine was added specifically to fill the void. In every Apollo
  // frame the plume is a single squared-off column the full width of the stage,
  // starting from the first pixel below the skirt. The only visible trace of
  // five-ness is the longitudinal striations in the fragment shader.
  const centre = useMemo(() => {
    const c = new THREE.Vector3()
    engines.forEach((e) => c.add(e))
    return engines.length ? c.divideScalar(engines.length) : c
  }, [engines])
  const glow = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const midLight = useRef<THREE.PointLight>(null)
  const bounce = useRef<THREE.PointLight>(null)

  // One material pair per engine. The volume lookup needs each plume's own
  // world->object matrix, and a shared material can only carry one.
  const mats = useMemo(() => ({ outer: makeMaterial('outer'), inner: makeMaterial('inner') }), [])
  useEffect(() => () => { mats.outer.dispose(); mats.inner.dispose() }, [mats])

  // Wide at the exit plane: the column leaves the skirt at roughly stage width,
  // it does not taper up to a point between the bells.
  const outerGeo = useMemo(() => new THREE.CylinderGeometry(0.62, 1, 1, 48, 28, true), [])
  const innerGeo = useMemo(() => new THREE.CylinderGeometry(0.4, 0.72, 1, 36, 20, true), [])
  const tex = useMemo(glowTexture, [])

  useFrame((state) => {
    const s = scrollState
    const t = state.clock.elapsedTime
    const power = Math.max(s.ignition, 0)
    const flicker = 1 + (flickerNoise(t * 7.5) - 0.5) * 0.22
    // Measured off Apollo 8: the incandescent section is only ~0.4 vehicle
    // lengths. The geometry runs long, but the fragment shader dims everything
    // past ~28% into a condensation trail rather than more flame.
    const len = (0.6 + power * 11 + s.thrust * 19) * flicker
    const wid = 0.35 + power * 0.85 + s.thrust * 0.65

    if (cluster.current) {
      cluster.current.visible = power > 0.001
      const [outer, inner] = (cluster.current.children[0]?.children ?? []) as THREE.Mesh[]
      if (outer && inner) {
        const j = 1 + (flickerNoise(t * 9) - 0.5) * 0.1
        outer.scale.set(wid * j, len, wid * j)
        outer.position.y = 0.3 - len / 2
        inner.scale.set(wid * 0.72, len * 0.72, wid * 0.72)
        inner.position.y = 0.3 - (len * 0.72) / 2

        // Matrices are one frame stale after the writes above, and the volume
        // lookup is sensitive to that — refresh before inverting.
        outer.updateWorldMatrix(true, false)
        inner.updateWorldMatrix(true, false)
        for (const [mesh, mat, timeScale, expand] of [
          [outer, mats.outer, 1, s.altitude],
          [inner, mats.inner, 1.3, s.altitude * 0.75],
        ] as const) {
          const u = mat.uniforms
          u.uTime.value = t * timeScale
          u.uPower.value = power
          u.uThrust.value = s.thrust
          u.uAltitude.value = s.altitude
          u.uExpand.value = expand
          u.uInvModel.value.copy(mesh.matrixWorld).invert()
        }
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

  return (
    <group>
      <group ref={cluster} visible={false}>
        <group position={[centre.x, centre.y, centre.z]}>
          <mesh geometry={outerGeo} material={mats.outer} frustumCulled={false} />
          <mesh geometry={innerGeo} material={mats.inner} frustumCulled={false} />
        </group>
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
