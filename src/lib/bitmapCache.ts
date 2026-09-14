/**
 * On-demand decode cache for the launch frames. Holds at most `maxEntries`
 * ImageBitmaps, centred on the frame the viewer is on, and closes anything it
 * evicts immediately. Decoding never blocks a draw: the player draws whatever
 * is nearest in the cache and this fills in the gaps in priority order.
 */

export interface DecodeStats {
  decoded: number
  decodeErrors: number
  /** Decodes that finished after the viewer had moved on; closed, never cached. */
  droppedDecodes: number
  maxInFlightDecodes: number
  cached: number
}

export interface BitmapCacheOptions {
  /** Frames either side of the target that are kept decoded. */
  radius: number
  /** Hard cap on live bitmaps (≥ 2·radius + 1). */
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
  /** Decode width at the time; entries decoded for an older canvas size are redecoded on demand. */
  width: number
}

export class BitmapCache {
  private readonly opts: Required<Omit<BitmapCacheOptions, 'onDecoded'>> & Pick<BitmapCacheOptions, 'onDecoded'>
  /** Insertion order doubles as LRU order. */
  private readonly entries = new Map<number, Entry>()
  private readonly inFlight = new Set<number>()
  private desired: number[] = []
  private wanted = new Set<number>()
  private decodeW: number
  private decodeH: number
  private disposed = false

  constructor(options: BitmapCacheOptions) {
    this.opts = { concurrency: 2, ...options }
    this.decodeW = options.sourceWidth
    this.decodeH = options.sourceHeight
  }

  /** Target size for new decodes, clamped to the source. Existing entries stay drawable until redecoded. */
  setDecodeSize(width: number, height: number) {
    const w = Math.max(1, Math.min(this.opts.sourceWidth, Math.round(width)))
    const h = Math.max(1, Math.min(this.opts.sourceHeight, Math.round(height)))
    if (w === this.decodeW && h === this.decodeH) return
    this.decodeW = w
    this.decodeH = h
    this.pump()
  }

  /**
   * Re-centre the window on `target`; `direction` (+1 / −1) puts the frames
   * ahead of the scroll first. Replaces any queued requests outright, so a
   * fast scrub never leaves a backlog of frames nobody is looking at.
   */
  request(target: number, direction: 1 | -1, count: number) {
    const r = this.opts.radius
    const desired: number[] = [target]
    for (let d = 1; d <= r; d++) desired.push(target + direction * d)
    for (let d = 1; d <= r; d++) desired.push(target - direction * d)
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

  private isFresh(i: number) {
    const e = this.entries.get(i)
    return !!e && e.width === this.decodeW
  }

  private async decode(index: number, blob: Blob) {
    const stats = this.opts.stats
    this.inFlight.add(index)
    stats.maxInFlightDecodes = Math.max(stats.maxInFlightDecodes, this.inFlight.size)
    let bmp: ImageBitmap
    try {
      bmp = await this.createBitmap(blob)
    } catch (err) {
      stats.decodeErrors++
      this.inFlight.delete(index)
      if (!this.disposed) console.warn(`frame ${index} decode failed:`, err instanceof Error ? err.message : err)
      this.pump()
      return
    }
    this.inFlight.delete(index)
    if (this.disposed || !this.wanted.has(index)) {
      bmp.close()
      stats.droppedDecodes++
      this.pump()
      return
    }
    stats.decoded++
    this.insert(index, { bmp, width: this.decodeW })
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

  private async createBitmap(blob: Blob): Promise<ImageBitmap> {
    const { sourceWidth, sourceHeight } = this.opts
    if (this.decodeW < sourceWidth || this.decodeH < sourceHeight) {
      try {
        return await createImageBitmap(blob, { resizeWidth: this.decodeW, resizeHeight: this.decodeH, resizeQuality: 'high' })
      } catch {
        // Older WebKit rejects resize options; fall through to a native-size decode.
      }
    }
    return createImageBitmap(blob)
  }
}
