import { z } from 'zod'
import { BitmapCache, type DecodeSpec, type DecodeStats } from './bitmapCache'

/**
 * Loader for the scroll-scrubbed launch frames (render/SPEC.md → "Frame
 * contract"). Owns the manifest, the download order (coarse-to-fine passes
 * over the whole sequence with a priority window around the current frame),
 * and the persistent store — which holds only the COMPRESSED bytes (~17 MB
 * for 240 frames). Decoded pixels live in a small windowed BitmapCache; keeping
 * every frame decoded is ~2 GB at 1080p and gets the tab killed.
 *
 * No React, no DOM: the player (FrameScrub) drives it from a rAF loop.
 */

const manifestSchema = z
  .object({
    count: z.number().int().min(2),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    ext: z.string().min(1),
    pad: z.number().int().min(1),
    /**
     * Optional non-uniform map: scroll progress of each output frame (0..1,
     * strictly increasing, one per frame). Lets the renderer add half-step
     * frames in fast-camera passes. Absent → frames are spread uniformly.
     */
    progress: z.array(z.number().min(0).max(1)).optional(),
    /**
     * Content hash of the encoded set. Appended to every frame URL so a
     * re-encode under the same paths is a different cache key, which is what
     * lets the CDN and the browser hold the frames as immutable.
     */
    version: z.string().min(1).optional(),
  })
  .superRefine((m, ctx) => {
    if (!m.progress) return
    if (m.progress.length !== m.count) {
      ctx.addIssue({ code: 'custom', message: `progress has ${m.progress.length} entries, count is ${m.count}` })
      return
    }
    for (let i = 1; i < m.progress.length; i++) {
      if (m.progress[i] <= m.progress[i - 1]) {
        ctx.addIssue({ code: 'custom', message: `progress not strictly increasing at index ${i}` })
        return
      }
    }
  })

export type FrameManifest = z.infer<typeof manifestSchema>

/**
 * Fractional 0-based output frame for scroll progress `p`. With a progress
 * table: binary search for the bracketing frames and interpolate linearly, so
 * the dissolve blends the two neighbouring output frames by that fraction.
 * Without one: uniform spread over the sequence.
 */
export function fractionalFrame(m: FrameManifest, p: number): number {
  const last = m.count - 1
  const t = m.progress
  if (!t) return Math.min(1, Math.max(0, p)) * last
  if (p <= t[0]) return 0
  if (p >= t[last]) return last
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t[mid] <= p) lo = mid
    else hi = mid
  }
  return lo + (p - t[lo]) / (t[hi] - t[lo])
}

export interface FrameSequenceOptions {
  /** URL directory the manifest and frames live in, no trailing slash. */
  base: string
  /** Simultaneous fetches. */
  concurrency?: number
  /** Frames either side of the focus whose bytes jump the download queue; the window also stretches to the predicted position. */
  priorityRadius?: number
  /** Download frames 1..N in order right after the first coarse pass (see coarseToFineOrder). */
  sequentialUntil?: number
  /** Frames kept decoded ahead of / behind the scroll direction. */
  decodeAhead: number
  decodeBehind: number
  /** Hard cap on live bitmaps. */
  maxBitmaps: number
  /** Simultaneous decodes. */
  decodeConcurrency?: number
  /** A frame's bytes arrived (or it was given up on). */
  onFrame?: (index: number) => void
  /** A frame became drawable. */
  onDecoded?: (index: number) => void
}

export interface FrameSequenceStats extends DecodeStats {
  loaded: number
  failed: number
  bytes: number
  /** performance.now() when the first bitmap became drawable, or -1. */
  firstFrameAt: number
  /** Written by the player: base frame it wanted on its last tick, the one it drew, and blends it had to skip. */
  target: number
  drawn: number
  blendMisses: number
}

/** Strides for the coarse-to-fine passes; the final pass fills every gap. */
const PASSES = [16, 8, 4, 2, 1] as const

/**
 * Every frame index exactly once. One coarse pass over the whole sequence
 * first (a preview wherever the viewer jumps), then frames 1..`sequentialUntil`
 * in order — the stretch a visitor reaches first, at full density — then the
 * finer passes over the rest.
 */
export function coarseToFineOrder(count: number, sequentialUntil = 0): number[] {
  const seen = new Uint8Array(count + 1)
  const order: number[] = []
  const take = (i: number) => {
    if (seen[i]) return
    seen[i] = 1
    order.push(i)
  }
  const [coarse, ...fine] = PASSES
  for (let i = 1; i <= count; i += coarse) take(i)
  for (let i = 1; i <= Math.min(count, sequentialUntil); i++) take(i)
  for (const stride of fine) for (let i = 1; i <= count; i += stride) take(i)
  return order
}

/**
 * Always revalidate the manifest (ETag round-trip, ~3 KB). A re-encode changes
 * the frame count and timing under the same URL; `force-cache` served a stale
 * 240-frame manifest against the 325-frame set and the ascent never reached space.
 */
export async function fetchManifest(base: string): Promise<FrameManifest> {
  const res = await fetch(`${base}/manifest.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`manifest ${res.status} ${res.statusText}`)
  const parsed = manifestSchema.safeParse(await res.json())
  if (!parsed.success) throw new Error(`manifest invalid: ${parsed.error.issues.map((i) => i.message).join('; ')}`)
  return parsed.data
}

export const frameUrl = (base: string, m: FrameManifest, index: number) =>
  `${base}/${String(index).padStart(m.pad, '0')}.${m.ext}${m.version ? `?v=${m.version}` : ''}`

type Slot = 'idle' | 'loading' | 'done' | 'failed'

export class FrameSequence {
  readonly manifest: FrameManifest
  readonly stats: FrameSequenceStats = {
    loaded: 0, failed: 0, bytes: 0, firstFrameAt: -1, target: 0, drawn: 0, blendMisses: 0,
    decoded: 0, decodeErrors: 0, droppedDecodes: 0, maxInFlightDecodes: 0, cached: 0,
  }

  private readonly base: string
  private readonly concurrency: number
  private readonly priorityRadius: number
  private readonly onFrame?: (index: number) => void
  private readonly cache: BitmapCache
  /** 1-based; index 0 unused. Compressed bytes only. */
  private readonly blobs: Array<Blob | undefined>
  private readonly slots: Slot[]
  private readonly order: number[]
  private cursor = 0
  private inFlight = 0
  private focus = 1
  private predicted = 1
  private direction: 1 | -1 = 1
  private disposed = false

  constructor(manifest: FrameManifest, options: FrameSequenceOptions) {
    this.manifest = manifest
    this.base = options.base
    this.concurrency = options.concurrency ?? 6
    this.priorityRadius = options.priorityRadius ?? 3
    this.onFrame = options.onFrame
    this.blobs = new Array<Blob | undefined>(manifest.count + 1)
    this.slots = new Array<Slot>(manifest.count + 1).fill('idle')
    this.order = coarseToFineOrder(manifest.count, options.sequentialUntil ?? 0)
    this.cache = new BitmapCache({
      ahead: options.decodeAhead,
      behind: options.decodeBehind,
      maxEntries: Math.max(options.maxBitmaps, options.decodeAhead + options.decodeBehind + 1),
      concurrency: options.decodeConcurrency ?? 4,
      sourceWidth: manifest.width,
      sourceHeight: manifest.height,
      source: (i) => this.blobs[i],
      stats: this.stats,
      onDecoded: (i) => {
        if (this.stats.firstFrameAt < 0) this.stats.firstFrameAt = performance.now()
        options.onDecoded?.(i)
      },
    })
  }

  get count() {
    return this.manifest.count
  }

  /** Fractional 0-based frame for scroll progress `p` (see fractionalFrame). */
  frameAt(p: number): number {
    return fractionalFrame(this.manifest, p)
  }

  /** Begin (or resume) downloading. Safe to call repeatedly. */
  start() {
    if (this.disposed) return
    while (this.inFlight < this.concurrency) {
      const next = this.pickNext()
      if (next === 0) return
      void this.load(next)
    }
  }

  /**
   * The viewer is on `index`, moving in `direction`, and will be near
   * `predicted` shortly: neighbours download first and the decode window
   * re-centres with its long side ahead of the scroll.
   */
  setFocus(index: number, direction: 1 | -1 = this.direction, predicted = index) {
    this.focus = Math.min(this.count, Math.max(1, index))
    this.predicted = Math.min(this.count, Math.max(1, predicted))
    this.direction = direction
    this.cache.request(this.focus, direction, this.predicted, this.count)
    this.start()
  }

  /** Source crop and output size for new bitmaps: exactly what the canvas draws. */
  setDecodeSpec(spec: DecodeSpec) {
    this.cache.setDecodeSpec(spec)
  }

  hasBytes(index: number) {
    return this.slots[index] === 'done'
  }

  /** Decoded bitmap for `index`, if it is in the cache. */
  get(index: number): ImageBitmap | undefined {
    return this.cache.get(index)
  }

  /** Nearest decoded frame to `index`; 0 if nothing is decoded yet. */
  nearestDecoded(index: number): number {
    return this.cache.nearest(index)
  }

  dispose() {
    this.disposed = true
    this.cache.dispose()
    for (let i = 1; i <= this.count; i++) this.blobs[i] = undefined
  }

  /**
   * Priority window first — ahead of the focus as far as the scroll is predicted
   * to reach plus the radius, the radius behind — then the baseline order.
   * Returns 0 when nothing is left.
   */
  private pickNext(): number {
    const r = this.priorityRadius
    const ahead = Math.abs(this.predicted - this.focus) + r
    for (let d = 0; d <= ahead; d++) {
      const i = this.focus + d * this.direction
      if (i >= 1 && i <= this.count && this.slots[i] === 'idle') return i
      if (d <= r) {
        const j = this.focus - d * this.direction
        if (j >= 1 && j <= this.count && this.slots[j] === 'idle') return j
      }
    }
    while (this.cursor < this.order.length) {
      const i = this.order[this.cursor++]
      if (this.slots[i] === 'idle') return i
    }
    return 0
  }

  private async load(index: number) {
    this.slots[index] = 'loading'
    this.inFlight++
    try {
      const blob = await this.fetchBytes(index)
      if (this.disposed) return
      this.blobs[index] = blob
      this.slots[index] = 'done'
      this.stats.loaded++
      this.stats.bytes += blob.size
    } catch (err) {
      this.slots[index] = 'failed'
      this.stats.failed++
      if (!this.disposed) console.warn(`frame ${index} skipped:`, err instanceof Error ? err.message : err)
    } finally {
      this.inFlight--
    }
    if (this.disposed) return
    this.onFrame?.(index)
    this.cache.pump()
    this.start()
  }

  /** One retry on any failure, then the caller marks the frame as skipped. */
  private async fetchBytes(index: number): Promise<Blob> {
    try {
      return await this.fetchOnce(index)
    } catch {
      return await this.fetchOnce(index)
    }
  }

  private async fetchOnce(index: number): Promise<Blob> {
    const res = await fetch(frameUrl(this.base, this.manifest, index))
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.blob()
  }
}
