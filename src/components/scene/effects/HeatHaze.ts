import { Effect } from 'postprocessing'
import * as THREE from 'three'

/**
 * Screen-space refraction around the plume.
 *
 * Hot air is less dense, so its refractive index drops and light passing near
 * the plume bends. This is the only cue in the scene that says the exhaust is
 * *hot* rather than merely bright, and it works precisely because it distorts
 * a region where there is nothing to see — the viewer reads "enormous
 * invisible heat" instead of "orange glow".
 *
 * Three details carry it: the offset is sampled per channel, because
 * refraction is wavelength-dependent and equal offsets read as a wobble rather
 * than as glass; the amplitude is small (a few pixels — past ~10 it reads as
 * underwater); and it fades out with altitude, because no atmosphere means no
 * refraction.
 */
const fragment = /* glsl */ `
uniform vec2 uPlume;      // plume centre in UV space
uniform float uRadius;    // haze column radius, UV units
uniform float uHeat;      // 0..1
uniform float uTime;
uniform float uAspect;
uniform float uAmount;    // peak offset in UV units

float hh31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float hn3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hh31(i), hh31(i + vec3(1,0,0)), f.x), mix(hh31(i + vec3(0,1,0)), hh31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hh31(i + vec3(0,0,1)), hh31(i + vec3(1,0,1)), f.x), mix(hh31(i + vec3(0,1,1)), hh31(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uHeat < 0.002) { outputColor = inputColor; return; }

  vec2 d = (uv - uPlume) * vec2(uAspect, 1.0);
  float radial = 1.0 - smoothstep(0.0, uRadius, length(d));
  // The hot column runs DOWN from the engines (the plume) and a little up
  // past them (convection off the deck), so it is not symmetric.
  float below = smoothstep(0.10, -1.10, d.y);
  float above = smoothstep(0.75, 0.05, d.y) * 0.35;
  float mask = radial * clamp(below + above, 0.0, 1.0) * uHeat;
  if (mask < 0.002) { outputColor = inputColor; return; }

  // Turbulence scrolling along the flow — convection, not a sine wobble.
  vec3 q = vec3(uv * vec2(uAspect, 1.0) * 30.0, uTime * 0.9);
  q.y += uTime * 2.4;
  float nx = hn3(q) * 2.0 - 1.0;
  float ny = hn3(q + 43.7) * 2.0 - 1.0;
  vec2 off = vec2(nx * 0.55, ny) * mask * uAmount;

  // Per-channel offset: refraction is wavelength-dependent.
  vec4 c;
  c.r = texture2D(inputBuffer, uv + off).r;
  c.g = texture2D(inputBuffer, uv + off * 0.965).g;
  c.b = texture2D(inputBuffer, uv + off * 0.930).b;
  c.a = inputColor.a;
  outputColor = c;
}
`

export class HeatHazeEffect extends Effect {
  constructor() {
    super('HeatHaze', fragment, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uPlume', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uRadius', new THREE.Uniform(0.2)],
        ['uHeat', new THREE.Uniform(0)],
        ['uTime', new THREE.Uniform(0)],
        ['uAspect', new THREE.Uniform(1.6)],
        ['uAmount', new THREE.Uniform(0.0042)],
      ]),
    })
  }

  set(plume: THREE.Vector2, radius: number, heat: number, time: number, aspect: number): void {
    const u = this.uniforms
    ;(u.get('uPlume')!.value as THREE.Vector2).copy(plume)
    u.get('uRadius')!.value = radius
    u.get('uHeat')!.value = heat
    u.get('uTime')!.value = time
    u.get('uAspect')!.value = aspect
  }
}
