/**
 * On-demand decode cache for the launch frames. Holds at most `maxEntries`
 * ImageBitmaps in a window around the frame the viewer is on (long ahead of
 * the scroll, short behind), closes anything it evicts immediately, and never
 * blocks a draw: the player draws whatever is nearest in the cache while this
 * fills the gaps in priority order. Chromium decodes createImageBitmap(Blob)
 * on its worker pool, so no Web Worker is needed for the main thread to stay
 * free; concurrency only sets how many decodes are queued there at once.
 */

export interface DecodeStats {
  decoded: number
  decodeErrors: number
  /** Decodes that finished after the viewer had moved on; closed, never cached. */
  droppedDecodes: number
  maxInFlightDecodes: number
  cached: number
}

/** Source crop + output size, so a bitmap is exactly what drawImage puts on the canvas. */
export interface DecodeSpec {
  sx: number
  sy: number
  sw: number
  sh: number
  width: number
  height: number
}

export interface BitmapCacheOptions {
  /** Frames kept decoded ahead of the scroll direction. */
  ahead: number
  /** Frames kept decoded behind it. */
  behind: number
  /** Hard cap on live bitmaps (≥ ahead + behind + 1). */
  maxEntries: number
  /** Simultaneous decodes. */
  concurrency?: number
  sourceWidth: number
  sourceHeight: number
  /** Compressed bytes for a frame, or undefined while still downloading. */
  source: (index: number) => Blob | undefined
  onDecoded?: (index: number) => void
  stats: DecodeStats
}

interface Entry {
  bmp: ImageBitmap
  /** Spec key at decode time; entries decoded for an older canvas size are redecoded on demand. */
  key: string
}

/** Predicted-minus-target distance (frames) past which the window is filled coarse-to-fine. */
const SPREAD_SPAN = 4
/** Fill order for a fast scroll: every 8th frame along the path, then 4th, 2nd, the rest. */
const SPREAD_STRIDES = [8, 4, 2, 1] as const
/** A finished decode this close to the window is kept instead of closed. */
const KEEP_MARGIN = 6

const specKey = (s: DecodeSpec) => `${s.sx},${s.sy},${s.sw},${s.sh}:${s.width}x${s.height}`

export class BitmapCache {
  private readonly opts: Required<Omit<BitmapCacheOptions, 'onDecoded'>> & Pick<BitmapCacheOptions, 'onDecoded'>
  /** Insertion order doubles as LRU order. */
  private readonly entries = new Map<number, Entry>()
  private readonly inFlight = new Set<number>()
  private desired: number[] = []
  private wanted = new Set<number>()
  private spec: DecodeSpec
  private key: string
  private disposed = false

  constructor(options: BitmapCacheOptions) {
    this.opts = { concurrency: 4, ...options }
    this.spec = { sx: 0, sy: 0, sw: options.sourceWidth, sh: options.sourceHeight, width: options.sourceWidth, height: options.sourceHeight }
    this.key = specKey(this.spec)
  }

  /** Crop/size for new decodes, clamped to the source. Existing entries stay drawable until redecoded. */
  setDecodeSpec(spec: DecodeSpec) {
    const { sourceWidth: W, sourceHeight: H } = this.opts
    const sw = Math.max(1, Math.min(W, Math.round(spec.sw)))
    const sh = Math.max(1, Math.min(H, Math.round(spec.sh)))
    const next: DecodeSpec = {
      sx: Math.max(0, Math.min(W - sw, Math.round(spec.sx))),
      sy: Math.max(0, Math.min(H - sh, Math.round(spec.sy))),
      sw,
      sh,
      width: Math.max(1, Math.min(sw, Math.round(spec.width))),
      height: Math.max(1, Math.min(sh, Math.round(spec.height))),
    }
    const key = specKey(next)
    if (key === this.key) return
    this.spec = next
    this.key = key
    this.pump()
  }

  /**
   * Re-centre the window on `target`, moving in `direction` (+1 / −1). The
   * ahead side extends past `predicted` (where the scroll will be shortly) so
   * decodes land before the frames are needed. Replaces any queued requests
   * outright, so a fast scrub never leaves a backlog nobody is looking at.
   */
  request(target: number, direction: 1 | -1, predicted: number, count: number) {
    const { ahead, behind, maxEntries } = this.opts
    const span = Math.abs(predicted - target)
    const reach = Math.min(maxEntries - behind - 1, span + ahead)
    // Slow scroll: the next frames in order. Fast scroll (the prediction is more
    // than SPREAD_SPAN frames out): coarse-to-fine across the path, so a decoder
    // that cannot keep up leaves evenly spaced frames along it instead of a
    // pile-up just behind the viewer that is stale by the time it lands.
    const strides: readonly number[] = span > SPREAD_SPAN ? SPREAD_STRIDES : [1]
    const desired: number[] = [target]
    const seen = new Set(desired)
    for (const stride of strides) {
      for (let d = stride; d <= reach; d += stride) {
        const i = target + direction * d
        if (seen.has(i)) continue
        seen.add(i)
        desired.push(i)
      }
    }
    for (let d = 1; d <= behind; d++) desired.push(target - direction * d)
    this.desired = desired.filter((i) => i >= 1 && i <= count)
    this.wanted = new Set(this.desired)
    this.pump()
  }

  /** Start decodes for wanted frames whose bytes have arrived, up to the concurrency cap. */
  pump() {
    if (this.disposed) return
    for (const i of this.desired) {
      if (this.inFlight.size >= this.opts.concurrency) return
      if (this.inFlight.has(i) || this.isFresh(i)) continue
      const blob = this.opts.source(i)
      if (!blob) continue
      void this.decode(i, blob)
    }
  }

  get(index: number): ImageBitmap | undefined {
    const e = this.entries.get(index)
    if (!e) return undefined
    // LRU touch
    this.entries.delete(index)
    this.entries.set(index, e)
    return e.bmp
  }

  /** Nearest decoded frame to `index`; 0 if the cache is empty. */
  nearest(index: number): number {
    let best = 0
    let bestD = Infinity
    for (const k of this.entries.keys()) {
      const d = Math.abs(k - index)
      if (d < bestD || (d === bestD && k < best)) {
        best = k
        bestD = d
      }
    }
    return best
  }

  dispose() {
    this.disposed = true
    for (const e of this.entries.values()) e.bmp.close()
    this.entries.clear()
    this.opts.stats.cached = 0
  }

  /**
   * In the window, or within KEEP_MARGIN frames of it. The window re-centres on
   * every tick, so under load a decode often finishes for a frame the viewer
   * just passed; closing it wastes the work (and it is exactly what a reverse
   * scrub or a catching-up window asks for next).
   */
  private isNearWindow(index: number) {
    if (this.wanted.has(index)) return true
    for (const k of this.wanted) if (Math.abs(k - index) <= KEEP_MARGIN) return true
    return false
  }

  private isFresh(i: number) {
    const e = this.entries.get(i)
    return !!e && e.key === this.key
  }

  private async decode(index: number, blob: Blob) {
    const stats = this.opts.stats
    const key = this.key
    this.inFlight.add(index)
    stats.maxInFlightDecodes = Math.max(stats.maxInFlightDecodes, this.inFlight.size)
    let bmp: ImageBitmap
    try {
      bmp = await this.createBitmap(blob, this.spec)
    } catch (err) {
      stats.decodeErrors++
      this.inFlight.delete(index)
      if (!this.disposed) console.warn(`frame ${index} decode failed:`, err instanceof Error ? err.message : err)
      this.pump()
      return
    }
    this.inFlight.delete(index)
    if (this.disposed || !this.isNearWindow(index)) {
      bmp.close()
      stats.droppedDecodes++
      this.pump()
      return
    }
    stats.decoded++
    this.insert(index, { bmp, key })
    this.opts.onDecoded?.(index)
    this.pump()
  }

  private insert(index: number, entry: Entry) {
    const old = this.entries.get(index)
    if (old) {
      old.bmp.close()
      this.entries.delete(index)
    }
    this.entries.set(index, entry)
    while (this.entries.size > this.opts.maxEntries) this.evict()
    this.opts.stats.cached = this.entries.size
  }

  /** Oldest entry outside the window first; the window itself only if the cap is smaller than it. */
  private evict() {
    let victim = -1
    for (const k of this.entries.keys()) {
      if (!this.wanted.has(k)) {
        victim = k
        break
      }
    }
    if (victim < 0) victim = this.entries.keys().next().value ?? -1
    if (victim < 0) return
    this.entries.get(victim)?.bmp.close()
    this.entries.delete(victim)
  }

  /** Crop to the visible region and resize to the draw size in one decode; native-size fallback for older engines. */
  private async createBitmap(blob: Blob, s: DecodeSpec): Promise<ImageBitmap> {
    const { sourceWidth, sourceHeight } = this.opts
    const cropped = s.sw < sourceWidth || s.sh < sourceHeight
    const resized = s.width !== s.sw || s.height !== s.sh
    if (cropped || resized) {
      try {
        return await createImageBitmap(blob, s.sx, s.sy, s.sw, s.sh, { resizeWidth: s.width, resizeHeight: s.height, resizeQuality: 'high' })
      } catch {
        // Older WebKit rejects crop/resize options; the player cover-fits whatever size it gets.
      }
    }
    return createImageBitmap(blob)
  }
}
