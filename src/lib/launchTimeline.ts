import type { ScrollState } from './scrollState'

/* ── Easing helpers ── */
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
export const easeInCubic = (t: number) => t * t * t
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Named scroll boundaries as fractions of the #launch section.
 * Every choreography decision lives here. Change one number, the whole
 * scene (camera, particles, DOM panels, HUD) follows.
 */
export const PHASES = {
  heroEnd: 0.06,

  act1Start: 0.06,
  ventPeak: 0.28,
  act1End: 0.34,

  act2Start: 0.34,
  ignitionStart: 0.36,
  ignitionFull: 0.44,
  shockStart: 0.40,
  shockEnd: 0.52,
  releaseStart: 0.46,
  releaseEnd: 0.58,
  act2End: 0.66,

  act3Start: 0.66,
  thrustFull: 0.76,
  liftStart: 0.70,
  liftEnd: 0.97,
  act3End: 1.0,
} as const

/** Which act is on screen for a given progress (0 = hero). */
export function actAt(p: number): number {
  if (p < PHASES.act1Start) return 0
  if (p < PHASES.act2Start) return 1
  if (p < PHASES.act3Start) return 2
  return 3
}

/**
 * Pure mapping from scroll progress to launch state.
 * Camera path is built here too, so the DOM never carries magic heights.
 */
export function mapProgress(p: number, out: ScrollState, narrow = false): void {
  p = clamp01(p)
  out.progress = p
  out.act = actAt(p)

  /* Act 1 — pressure build-up: slow, heavy, static. */
  const pressure = smoothstep(PHASES.act1Start, PHASES.act1End, p)
  out.pressure = pressure
  // vent rises fast, peaks, then is swallowed by ignition
  const ventUp = smoothstep(PHASES.act1Start, PHASES.ventPeak, p)
  const ventDown = 1 - smoothstep(PHASES.ignitionStart, PHASES.ignitionFull, p)
  out.vent = ventUp * ventDown

  /* Act 2 — ignition: explosive. */
  const ig = easeOutExpo(smoothstep(PHASES.ignitionStart, PHASES.ignitionFull, p))
  out.ignition = ig

  const shockT = clamp01((p - PHASES.shockStart) / (PHASES.shockEnd - PHASES.shockStart))
  out.shock = p >= PHASES.shockStart && p < PHASES.shockEnd ? easeOutExpo(shockT) : 0

  out.release = easeInOutCubic(smoothstep(PHASES.releaseStart, PHASES.releaseEnd, p))

  /* Act 3 — thrust & liftoff. */
  out.thrust = smoothstep(PHASES.act3Start, PHASES.thrustFull, p)
  const liftT = clamp01((p - PHASES.liftStart) / (PHASES.liftEnd - PHASES.liftStart))
  out.lift = easeInCubic(liftT)
  out.altitude = smoothstep(PHASES.liftStart + 0.08, PHASES.liftEnd, p)

  /* Shake: pressure tremor → ignition slam → engine rumble that fades with altitude. */
  const tremor = pressure * 0.12
  const slam = (1 - smoothstep(PHASES.ignitionStart, PHASES.shockEnd + 0.05, p)) * ig * 1.0
  const rumble = ig * 0.35 * (1 - out.altitude * 0.8)
  out.shake = Math.max(tremor, slam, rumble)

  /* HDR exposure: spike at ignition, settle to a hot-but-readable level. */
  const spike = ig * (1 - smoothstep(PHASES.ignitionFull, PHASES.shockEnd, p))
  out.exposure = 1 + spike * 0.9 + ig * 0.15

  /* ── Camera path (world units; engines at y≈1.6 on the ML deck, nose at ≈25.5) ── */
  const m = narrow ? 1.35 : 1 // pull back further on narrow viewports
  // Hero: wide establishing shot of the pad
  const cHero = { x: -7, y: 11, z: 46 * m, look: 12.5 }
  // Act 1: low, tight on the engine bells, slightly off-axis
  const cAct1 = { x: -6.5, y: 3.4, z: 12.5 * m, look: 3.6 }
  // Act 2: pulled back and low, watching the fireball swallow the pad
  const cAct2 = { x: -12, y: 9.5, z: 33 * m, look: 10 }
  // Act 3: far, tilting upward to track the ascent
  const cAct3 = { x: 6, y: 15, z: 42 * m, look: 23 }

  const t1 = smoothstep(0, PHASES.act1Start + 0.1, p)
  const t2 = smoothstep(PHASES.act1End - 0.04, PHASES.ignitionFull + 0.04, p)
  const t3 = smoothstep(PHASES.act2End - 0.06, PHASES.act3Start + 0.1, p)

  let x = lerp(cHero.x, cAct1.x, t1)
  let y = lerp(cHero.y, cAct1.y, t1)
  let z = lerp(cHero.z, cAct1.z, t1)
  let look = lerp(cHero.look, cAct1.look, t1)

  x = lerp(x, cAct2.x, t2)
  y = lerp(y, cAct2.y, t2)
  z = lerp(z, cAct2.z, t2)
  look = lerp(look, cAct2.look, t2)

  x = lerp(x, cAct3.x, t3)
  y = lerp(y, cAct3.y, t3)
  z = lerp(z, cAct3.z, t3)
  look = lerp(look, cAct3.look, t3)

  // Track the rocket as it climbs: look-at rises with lift, camera drifts up too
  const climb = out.lift * 60
  look += climb
  y += climb * 0.55

  out.cameraX = x
  out.cameraY = y
  out.cameraZ = z
  out.lookY = look
  out.roll = (t2 - t3) * 0.03 // subtle dutch angle through the fireball
}
