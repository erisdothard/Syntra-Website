import { z } from 'zod'

/**
 * Loader for the scroll-scrubbed launch frames (render/SPEC.md → "Frame
 * contract"). Owns the manifest, the decoded bitmaps, and the download order:
 * coarse-to-fine passes over the whole sequence, with a small priority window
 * around the frame the user is currently looking at that jumps the queue.
 *
 * No React, no DOM: the player (FrameScrub) drives it from a rAF loop.
 */

const manifestSchema = z.object({
  count: z.number().int().min(2),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  ext: z.string().min(1),
  pad: z.number().int().min(1),
})

export type FrameManifest = z.infer<typeof manifestSchema>

export interface FrameSequenceOptions {
  /** URL directory the manifest and frames live in, no trailing slash. */
  base: string
  /** Decode at this size instead of native (mobile memory budget). */
  decodeWidth?: number
  decodeHeight?: number
  /** Simultaneous fetches. */
  concurrency?: number
  /** Frames either side of the focus that jump the queue. */
  priorityRadius?: number
  /** Called after any frame becomes drawable (or is given up on). */
  onFrame?: (index: number) => void
}

export interface FrameSequenceStats {
  loaded: number
  failed: number
  bytes: number
  /** performance.now() when the first bitmap became drawable, or -1. */
  firstFrameAt: number
}

/** Strides for the coarse-to-fine passes; the final pass fills every gap. */
const PASSES = [16, 8, 4, 2, 1] as const

/** Every frame index exactly once, ordered coarse → fine. */
export function coarseToFineOrder(count: number): number[] {
  const seen = new Uint8Array(count + 1)
  const order: number[] = []
  for (const stride of PASSES) {
    for (let i = 1; i <= count; i += stride) {
      if (seen[i]) continue
      seen[i] = 1
      order.push(i)
    }
  }
  return order
}

export async function fetchManifest(base: string): Promise<FrameManifest> {
  const res = await fetch(`${base}/manifest.json`, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`manifest ${res.status} ${res.statusText}`)
  const parsed = manifestSchema.safeParse(await res.json())
  if (!parsed.success) throw new Error(`manifest invalid: ${parsed.error.issues.map((i) => i.message).join('; ')}`)
  return parsed.data
}

export const frameUrl = (base: string, m: FrameManifest, index: number) =>
  `${base}/${String(index).padStart(m.pad, '0')}.${m.ext}`

type Slot = 'idle' | 'loading' | 'done' | 'failed'

export class FrameSequence {
  readonly manifest: FrameManifest
  readonly stats: FrameSequenceStats = { loaded: 0, failed: 0, bytes: 0, firstFrameAt: -1 }

  private readonly base: string
  private readonly opts: Required<Pick<FrameSequenceOptions, 'concurrency' | 'priorityRadius'>> &
    Pick<FrameSequenceOptions, 'decodeWidth' | 'decodeHeight' | 'onFrame'>
  /** 1-based; index 0 unused. */
  private readonly bitmaps: Array<ImageBitmap | undefined>
  private readonly slots: Slot[]
  private readonly order: number[]
  private cursor = 0
  private inFlight = 0
  private focus = 1
  private disposed = false

  constructor(manifest: FrameManifest, options: FrameSequenceOptions) {
    this.manifest = manifest
    this.base = options.base
    this.opts = {
      concurrency: options.concurrency ?? 6,
      priorityRadius: options.priorityRadius ?? 3,
      decodeWidth: options.decodeWidth,
      decodeHeight: options.decodeHeight,
      onFrame: options.onFrame,
    }
    this.bitmaps = new Array<ImageBitmap | undefined>(manifest.count + 1)
    this.slots = new Array<Slot>(manifest.count + 1).fill('idle')
    this.order = coarseToFineOrder(manifest.count)
  }

  get count() {
    return this.manifest.count
  }

  /** Begin (or resume) downloading. Safe to call repeatedly. */
  start() {
    if (this.disposed) return
    while (this.inFlight < this.opts.concurrency) {
      const next = this.pickNext()
      if (next === 0) return
      void this.load(next)
    }
  }

  /** Tell the loader which frame the viewer is on so its neighbours go first. */
  setFocus(index: number) {
    this.focus = Math.min(this.count, Math.max(1, index))
    this.start()
  }

  has(index: number) {
    return this.slots[index] === 'done'
  }

  get(index: number): ImageBitmap | undefined {
    return this.bitmaps[index]
  }

  /** Nearest drawable frame to `index`, preferring the lower side on ties; 0 if none. */
  nearest(index: number): number {
    if (this.slots[index] === 'done') return index
    for (let d = 1; d < this.count; d++) {
      const lo = index - d
      const hi = index + d
      if (lo >= 1 && this.slots[lo] === 'done') return lo
      if (hi <= this.count && this.slots[hi] === 'done') return hi
    }
    return 0
  }

  dispose() {
    this.disposed = true
    for (let i = 1; i <= this.count; i++) {
      this.bitmaps[i]?.close()
      this.bitmaps[i] = undefined
    }
  }

  /** Priority window first, then the coarse-to-fine baseline. Returns 0 when nothing is left. */
  private pickNext(): number {
    const r = this.opts.priorityRadius
    for (let d = 0; d <= r; d++) {
      for (const i of [this.focus + d, this.focus - d]) {
        if (i >= 1 && i <= this.count && this.slots[i] === 'idle') return i
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
      const bmp = await this.fetchBitmap(index)
      if (this.disposed) {
        bmp.close()
        return
      }
      this.bitmaps[index] = bmp
      this.slots[index] = 'done'
      this.stats.loaded++
      if (this.stats.firstFrameAt < 0) this.stats.firstFrameAt = performance.now()
    } catch (err) {
      this.slots[index] = 'failed'
      this.stats.failed++
      if (!this.disposed) console.warn(`frame ${index} skipped:`, err instanceof Error ? err.message : err)
    } finally {
      this.inFlight--
    }
    if (this.disposed) return
    this.opts.onFrame?.(index)
    this.start()
  }

  /** One retry on any failure, then the caller marks the frame as skipped. */
  private async fetchBitmap(index: number): Promise<ImageBitmap> {
    try {
      return await this.fetchOnce(index)
    } catch {
      return await this.fetchOnce(index)
    }
  }

  private async fetchOnce(index: number): Promise<ImageBitmap> {
    const res = await fetch(frameUrl(this.base, this.manifest, index))
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const blob = await res.blob()
    this.stats.bytes += blob.size
    const { decodeWidth, decodeHeight } = this.opts
    if (decodeWidth && decodeHeight) {
      try {
        return await createImageBitmap(blob, { resizeWidth: decodeWidth, resizeHeight: decodeHeight, resizeQuality: 'medium' })
      } catch {
        // Older WebKit rejects resize options; decode at native size instead.
      }
    }
    return createImageBitmap(blob)
  }
}
