import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { NOISE_GLSL } from '../shaders/noise'

const vert = /* glsl */ `
varying vec2 vUv;
varying vec2 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xy;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec2 vWorld;
uniform float uTime;
uniform float uLimbY;   // world height of the Earth horizon
uniform float uIgnition;
uniform float uAltitude;
uniform float uVent;
${NOISE_GLSL}

/**
 * Anti-aliased star field. The previous version was step() on a single texel of
 * a 2600x1500 lattice, which is sub-pixel at 2x DPR — on a phone the stars
 * simply disappeared and the space section read as an empty black rectangle.
 * Cells with a jittered position, a real radius and a magnitude distribution
 * survive any resolution and give the field depth.
 */
float starLayer(vec2 uv, float density, float seed, float t, out float mag) {
  vec2 g = uv * density;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash21(id + seed);
  mag = 0.0;
  if (h < 0.90) return 0.0;
  vec2 off = (vec2(hash21(id + 1.7 + seed), hash21(id + 3.3 + seed)) - 0.5) * 0.7;
  mag = hash21(id + 5.1 + seed);
  // Cubic magnitude falloff: a great many faint stars and very few bright ones.
  // A linear distribution with a generous radius reads as bokeh, not as sky.
  float r = 0.010 + mag * mag * mag * 0.055;
  float d = length(f - off);
  // Scintillation, slower for brighter stars.
  float tw = 0.72 + 0.28 * sin(t * (0.6 + (1.0 - mag) * 2.2) + h * 40.0);
  return smoothstep(r, 0.0, d) * (0.20 + mag * mag * 1.9) * tw;
}

void main() {
  // Vertical position keyed off WORLD height rather than the plane's uv. The
  // backdrop used to be a 520x300 quad whose EDGE became visible once the
  // camera climbed — a hard diagonal seam with clear-colour void beyond it,
  // which is what made the space section read as an empty black rectangle.
  // Anchoring to world space lets the quad be sized to always cover without
  // moving the horizon or rescaling the gradient.
  float t = clamp((vWorld.y + 90.0) / 300.0, 0.0, 1.0);
  vec2 uv = vec2(vWorld.x / 520.0 + 0.5, t);

  // Base atmosphere: navy horizon glow fading to void overhead
  vec3 horizon = vec3(0.10, 0.13, 0.24);
  vec3 zenith  = vec3(0.027, 0.031, 0.047);
  float h = pow(t, 0.65);
  vec3 col = mix(horizon, zenith, h);

  // Slow drifting cloud bank, denser near the horizon
  vec2 p = vec2(vWorld.x * 0.01154 + uTime * 0.012, t * 3.2 - uTime * 0.004);
  float c = fbm(p);
  float c2 = fbm(p * 2.1 + vec2(3.7, 1.9) + uTime * 0.02);
  float cloud = smoothstep(0.42, 0.78, c * 0.7 + c2 * 0.3) * (1.0 - smoothstep(0.15, 0.75, t));
  col += cloud * vec3(0.08, 0.09, 0.13);

  // Ignition tints the low sky ember and lights the underside of the clouds
  float low = 1.0 - smoothstep(0.0, 0.55, t);
  vec3 ember = vec3(1.0, 0.42, 0.12);
  float glow = uIgnition * low * (0.35 + cloud * 0.9);
  col += ember * glow * 0.55;
  col += vec3(1.0, 0.85, 0.65) * uIgnition * pow(low, 3.0) * 0.25;

  // Venting steam faintly brightens the horizon haze
  col += vec3(0.6, 0.65, 0.75) * uVent * low * 0.05;

  // Altitude: sky darkens to space
  vec3 space = vec3(0.008, 0.009, 0.014);
  col = mix(col, space, uAltitude * (0.35 + 0.65 * h));

  // Curved Earth limb. This is the single strongest cue that the camera is
  // above the atmosphere rather than in an unlit room: the ground falls away as
  // an arc, and the atmosphere seen edge-on becomes a thin, intensely bright
  // band of scattered light sitting on top of it. Measured in world units so it
  // stays put as the backdrop is resized, and it drops away as we climb.
  float horizonY = uLimbY - 52.0 * pow(vWorld.x / 420.0, 2.0);
  float arc = (vWorld.y - horizonY) / 300.0;
  float earth = 1.0 - smoothstep(-0.003, 0.003, arc);
  float airglow = exp(-max(arc, 0.0) * 150.0) + exp(-max(arc, 0.0) * 30.0) * 0.35;
  float haze = exp(-max(arc, 0.0) * 8.0) * 0.30;

  // Everything above is multiplied by uAltitude, so on the pad it is all
  // computed and then discarded. The branch is on a uniform, so it is coherent
  // across the whole draw — this is the heaviest frame in the scroll and the
  // star field is worth ~4ms of it.
  if (uAltitude > 0.004) {
    // Stars: two layers so bright foreground stars sit over a fine background
    // field, with colour by magnitude (hot blue-white through cool amber).
    float m1, m2;
    float s1 = starLayer(vWorld, 0.42, 0.0, uTime, m1);
    float s2 = starLayer(vWorld, 0.16, 31.7, uTime, m2);
    vec3 starCol =
        mix(vec3(0.72, 0.80, 1.00), vec3(1.00, 0.92, 0.78), m1) * s1
      + mix(vec3(0.78, 0.86, 1.00), vec3(1.00, 0.86, 0.66), m2) * s2 * 0.9;
    // Occluded by the Earth, and washed out by the bright limb.
    col += starCol * uAltitude * (1.0 - earth) * (1.0 - clamp(airglow, 0.0, 1.0)) * smoothstep(0.0, 0.06, arc);

    vec3 limbCol = vec3(0.30, 0.58, 1.00);
    vec3 earthCol = vec3(0.012, 0.020, 0.038);
    col = mix(col, earthCol, earth * uAltitude);
    col += limbCol * (airglow * 0.85 + haze) * uAltitude * (1.0 - earth);
  }

  // Fine grain so the gradient never bands
  col += (hash21(vWorld * 1.7 + uTime) - 0.5) * 0.012;

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
      uLimbY: { value: -60 },
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
      // The horizon falls away beneath the vehicle as it climbs.
      mat.current.uniforms.uLimbY.value = s.cameraY - 34 - s.altitude * 26
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
        <planeGeometry args={[1700, 1000, 1, 1]} />
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
