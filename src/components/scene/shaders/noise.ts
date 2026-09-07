/** Shared GLSL noise helpers, inlined into layer shaders. */
export const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return v;
}

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

/** 3D value noise. Sampled in object/world space so detail stays put in the
 *  volume as the camera orbits, instead of riding the surface UVs. */
float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

/** 4 octaves. Enough structure for plume break-up without the 5th octave's cost. */
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise3(p);
    p = p * 2.07 + vec3(19.3, 7.7, 13.1);
    a *= 0.5;
  }
  return v;
}

/** Divergence-free velocity field: curl of a 3-component noise potential.
 *  Single-octave potential keeps this affordable in a vertex shader — layer
 *  two calls at different frequencies if you want more scales. */
vec3 curl3(vec3 p) {
  const float e = 0.35;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  vec3 o1 = vec3(31.416, 17.235, 9.111);
  vec3 o2 = vec3(-53.702, 42.918, 23.337);

  float px1 = vnoise3(p + dy + o1) - vnoise3(p - dy + o1);
  float px2 = vnoise3(p + dz + o2) - vnoise3(p - dz + o2);
  float py1 = vnoise3(p + dz);      float py1b = vnoise3(p - dz);
  float py2 = vnoise3(p + dx + o1); float py2b = vnoise3(p - dx + o1);
  float pz1 = vnoise3(p + dx + o2); float pz1b = vnoise3(p - dx + o2);
  float pz2 = vnoise3(p + dy);      float pz2b = vnoise3(p - dy);

  vec3 c = vec3(px1 - px2, (py1 - py1b) - (py2 - py2b), (pz1 - pz1b) - (pz2 - pz2b));
  return c / (2.0 * e);
}
`

/** Ridged noise. abs() folds the field at zero crossings, giving the sharp
 *  filament structure of combustion rather than the smooth lumps of cloud fbm. */
export const RIDGED_GLSL = /* glsl */ `
float ridged3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * abs(vnoise3(p) * 2.0 - 1.0);
    p = p * 2.11 + vec3(23.7, 11.3, 5.9);
    a *= 0.5;
  }
  return v;
}
`
