/**
 * Mutable launch state. GSAP ScrollTrigger writes into it on every scroll
 * frame; react-three-fiber layers and the HUD read it inside useFrame / rAF.
 * Nothing here goes through React state, so scrubbing never re-renders.
 *
 * All 0–1 values are eased already (see launchTimeline.ts).
 */
export interface ScrollState {
  /** Raw 0–1 progress through the #launch section. */
  progress: number
  /** 0 = pre-roll (hero), 1..3 = act currently in view. */
  act: number

  /** Act 1 — chamber pressure ramps, rocket "breathes". */
  pressure: number
  /** Act 1 — side venting intensity (small white puffs). */
  vent: number
  /** Act 2 — engine ignition 0→1. Drives flame, exposure, smoke volume. */
  ignition: number
  /** Act 2 — one-shot shockwave ring 0→1 (radius) — 0 when inactive. */
  shock: number
  /** Act 2 — umbilical arms swing away 0→1. */
  release: number
  /** Act 3 — throttle to max 0→1. */
  thrust: number
  /** Act 3 — vertical lift of the rocket 0→1 (multiplied into world units by layers). */
  lift: number
  /** Camera shake amplitude 0→1. */
  shake: number
  /** Tone mapping exposure multiplier. */
  exposure: number
  /** Sky darkening toward space 0→1. */
  altitude: number

  /** Camera target in world units. */
  cameraX: number
  cameraY: number
  cameraZ: number
  lookY: number
  /** Camera roll in radians. */
  roll: number

  /** Normalized pointer, -1..1. */
  mouseX: number
  mouseY: number
}

export const scrollState: ScrollState = {
  progress: 0,
  act: 0,
  pressure: 0,
  vent: 0,
  ignition: 0,
  shock: 0,
  release: 0,
  thrust: 0,
  lift: 0,
  shake: 0,
  exposure: 1,
  altitude: 0,
  cameraX: 0,
  cameraY: 6,
  cameraZ: 24,
  lookY: 8,
  roll: 0,
  mouseX: 0,
  mouseY: 0,
}
