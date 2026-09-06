import * as THREE from 'three'

/**
 * Procedural surface detail injected into MeshPhysical/Standard materials via
 * onBeforeCompile. Works in world space so it needs no UV layout:
 *  - roughness variation (weathered paint, fingerprints on metal)
 *  - horizontal panel seams and rivet rows keyed on world height
 *  - vertical grime streaks that fade downward from seams
 *  - frost band (LOX tank) driven by uFrost, melts away with ignition
 * The material keeps its own base color / maps; we only modulate.
 */
export interface DetailUniforms {
  uFrost: { value: number }
  uGrime: { value: number }
  uSeamFreq: { value: number }
  uFrostBand: { value: THREE.Vector2 } // world y range of the frost band
  uTime: { value: number }
}

export function createDetailUniforms(): DetailUniforms {
  return {
    uFrost: { value: 0 },
    uGrime: { value: 1 },
    uSeamFreq: { value: 0.9 },
    uFrostBand: { value: new THREE.Vector2(4, 9) },
    uTime: { value: 0 },
  }
}

const NOISE = /* glsl */ `
float sdHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float sdNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sdHash(i + vec3(0,0,0)), sdHash(i + vec3(1,0,0)), f.x),
                 mix(sdHash(i + vec3(0,1,0)), sdHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(sdHash(i + vec3(0,0,1)), sdHash(i + vec3(1,0,1)), f.x),
                 mix(sdHash(i + vec3(0,1,1)), sdHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float sdFbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * sdNoise(p); p = p * 2.1 + 3.7; a *= 0.5; }
  return v;
}
`

/**
 * Patch a material so its shader gets the detail pass.
 * `kind` picks the strength preset.
 */
export function applySurfaceDetail(
  mat: THREE.MeshStandardMaterial,
  uniforms: DetailUniforms,
  kind: 'paint' | 'metal' | 'dark',
) {
  const strength = kind === 'paint' ? 1.0 : kind === 'metal' ? 0.6 : 0.4
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.uniforms.uStrength = { value: strength }
    shader.uniforms.uIsPaint = { value: kind === 'paint' ? 1 : 0 }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSdWorld;\nvarying vec3 vSdNormal;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvSdWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvSdNormal = normalize(mat3(modelMatrix) * objectNormal);',
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vSdWorld;
varying vec3 vSdNormal;
uniform float uFrost, uGrime, uSeamFreq, uTime, uStrength, uIsPaint;
uniform vec2 uFrostBand;
${NOISE}`,
      )
      // After the base colour is established, modulate albedo.
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  vec3 wp = vSdWorld;
  // radial coordinate around the vehicle axis for seams that wrap the body
  float ang = atan(wp.z, wp.x);
  // horizontal panel seams every 1/uSeamFreq units, thin dark lines
  float seamY = fract(wp.y * uSeamFreq);
  float seam = 1.0 - smoothstep(0.0, 0.012, abs(seamY - 0.5) * 2.0 - 0.985);
  // vertical seams (panel columns)
  float seamA = fract(ang * 4.7748); // ~30 panels around
  float vseam = 1.0 - smoothstep(0.0, 0.02, abs(seamA - 0.5) * 2.0 - 0.975);
  float seams = clamp(seam + vseam * 0.6, 0.0, 1.0) * 0.55 * uStrength;
  // rivet rows just above each seam
  float rivRow = smoothstep(0.02, 0.0, abs(seamY - 0.53));
  float riv = rivRow * step(0.82, sdNoise(vec3(ang * 60.0, wp.y * 40.0, 0.0))) * 0.35 * uStrength;
  // grime: streaks fall from seams, stronger low on the vehicle
  float streak = sdFbm(vec3(ang * 9.0, wp.y * 0.9, 1.7));
  float grime = smoothstep(0.55, 0.85, streak) * (1.0 - smoothstep(0.0, 26.0, wp.y)) * 0.28 * uGrime * uStrength;
  // weathering mottle
  float mottle = (sdFbm(wp * 0.8 + 11.0) - 0.5) * 0.07 * uStrength;
  diffuseColor.rgb *= 1.0 - seams - riv * 0.5 - grime + mottle;
  // frost: bright bluish-white crust in the LOX band, breaking up as it melts
  float band = smoothstep(uFrostBand.x, uFrostBand.x + 1.2, wp.y) * (1.0 - smoothstep(uFrostBand.y - 1.2, uFrostBand.y, wp.y));
  float crust = sdFbm(vec3(ang * 6.0, wp.y * 1.5, uTime * 0.02) * 1.3);
  float frost = band * smoothstep(0.35, 0.7, crust + uFrost * 0.5) * uFrost * uIsPaint;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), frost * 0.85);
  vSdFrost = frost;
}`,
      )
      // Roughness: paint gets mottled, frost is matte, seams are rough.
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
{
  float m = sdFbm(vSdWorld * 1.7 + 5.0);
  roughnessFactor = clamp(roughnessFactor + (m - 0.5) * 0.35 * uStrength + vSdFrost * 0.5, 0.05, 1.0);
}`,
      )
    // declare the frost carrier before it is used
    shader.fragmentShader = shader.fragmentShader.replace(
      'varying vec3 vSdNormal;',
      'varying vec3 vSdNormal;\nfloat vSdFrost = 0.0;',
    )
  }
  // Force a unique program per kind so onBeforeCompile variants don't collide
  mat.customProgramCacheKey = () => `surface-detail-${kind}`
  mat.needsUpdate = true
}
