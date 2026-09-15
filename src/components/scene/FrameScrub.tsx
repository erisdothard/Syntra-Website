import { memo, useEffect, useRef } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { scrollState } from '../../lib/scrollState'
import { FrameSequence, fetchManifest } from '../../lib/frameSequence'

const DEFAULT_FRAMES_BASE = '/frames/desktop'
const MAX_DPR = 2

/** Dev-only `?frames=<dir>` points the player at another sequence under /frames/ (e.g. a placeholder set). */
function framesBase(): string {
  if (!import.meta.env.DEV || typeof window === 'undefined') return DEFAULT_FRAMES_BASE
  const dir = new URLSearchParams(window.location.search).get('frames')
  return dir && /^[a-z0-9-]+$/i.test(dir) ? `/frames/${dir}` : DEFAULT_FRAMES_BASE
}
/** Redraw once the fractional frame position moves this much. */
const SUBFRAME_STEP = 1 / 64
/** Below this weight the second frame of a dissolve is invisible; skip the draw. */
const MIN_BLEND = 0.02
/** How far ahead (ms) the decode window is pushed from the scroll velocity. */
const LOOKAHEAD_MS = 150

/**
 * Fixed full-screen canvas that scrubs the offline-rendered launch sequence
 * with scroll (see render/SPEC.md → "Frame contract"). Sits in the slot
 * LaunchCanvas used to occupy and carries its id so TabOverlay can dim it.
 *
 * Reads scrollState on rAF, redraws only when the (fractional) frame position
 * or the canvas size changes, and never touches React state on the hot path.
 * Between two frames it dissolves: frame ⌊f⌋ then ⌈f⌉ on top at alpha = frac,
 * which the renders' motion blur supports. Frames are decoded on demand into a
 * window ahead of the scroll; the draw always uses the nearest decoded frame.
 */
export const FrameScrub = memo(function FrameScrub() {
  const mobile = useIsMobile()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      console.error('FrameScrub: 2D context unavailable, leaving poster')
      return
    }
    const poster = document.querySelector<HTMLElement>('.poster')

    let seq: FrameSequence | null = null
    let raf = 0
    let cancelled = false
    let sizeDirty = true
    let frameDirty = false
    let lastF = -1
    let lastLo = 0
    let lastBase = 0
    let lastTop = 0
    let lastFrac = 0
    let lastTime = 0
    let velocity = 0 // frames per ms, smoothed
    let direction: 1 | -1 = 1
    let revealed = false

    const resize = () => {
      if (!seq) return
      const src = seq.manifest
      // The backing store never exceeds what the source can cover, so the
      // decoded bitmap is exactly the draw size and drawImage is a 1:1 copy.
      const cap = Math.min(src.width / window.innerWidth, src.height / window.innerHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR, cap)
      const w = Math.max(1, Math.round(window.innerWidth * dpr))
      const h = Math.max(1, Math.round(window.innerHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      // Cover-fit, centre anchor: the vehicle is centred in the render.
      const s = Math.max(w / src.width, h / src.height)
      const sw = w / s
      const sh = h / s
      seq.setDecodeSpec({ sx: (src.width - sw) / 2, sy: (src.height - sh) / 2, sw, sh, width: w, height: h })
      sizeDirty = false
    }

    const draw = (bmp: ImageBitmap) => {
      const cw = canvas.width
      const ch = canvas.height
      // 1:1 when the bitmap was decoded for this size; cover-fit for a native-size fallback.
      const s = Math.max(cw / bmp.width, ch / bmp.height)
      const dw = bmp.width * s
      const dh = bmp.height * s
      ctx.drawImage(bmp, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
    }

    const reveal = () => {
      revealed = true
      canvas.style.opacity = '1'
      if (poster) {
        poster.style.transition = 'opacity 0.6s ease-out'
        poster.style.opacity = '0'
      }
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!seq) return
      const count = seq.count
      const f = seq.frameAt(scrollState.progress) // fractional, 0-based output index
      const lo = Math.min(count, Math.floor(f) + 1)
      const hi = Math.min(count, lo + 1)
      const frac = f - Math.floor(f)

      if (lastF >= 0 && now > lastTime) {
        const v = (f - lastF) / (now - lastTime)
        velocity = velocity * 0.7 + v * 0.3
        if (f !== lastF) direction = f > lastF ? 1 : -1
      }
      const moved = lastF < 0 || Math.abs(f - lastF) >= SUBFRAME_STEP
      if (moved) {
        lastF = f
        lastTime = now
      }
      if (sizeDirty) resize()
      if (lo !== lastLo) {
        lastLo = lo
        seq.stats.target = lo
        const predicted = Math.round(f + velocity * LOOKAHEAD_MS)
        seq.setFocus(lo, direction, predicted)
      } else if (!moved && !frameDirty && lastBase !== 0) {
        return
      }
      frameDirty = false

      const base = seq.nearestDecoded(lo)
      if (base === 0) return
      const blend = frac >= MIN_BLEND && hi !== lo
      const topBmp = blend ? seq.get(hi) : undefined
      const top = topBmp ? hi : 0
      if (blend && !topBmp) seq.stats.blendMisses++
      if (base === lastBase && top === lastTop && Math.abs(frac - lastFrac) < SUBFRAME_STEP) return
      const baseBmp = seq.get(base)
      if (!baseBmp) return

      draw(baseBmp)
      if (topBmp) {
        ctx.globalAlpha = frac
        draw(topBmp)
        ctx.globalAlpha = 1
      }
      lastBase = base
      lastTop = top
      lastFrac = frac
      seq.stats.drawn = base
      if (!revealed) reveal()
    }

    const onResize = () => {
      sizeDirty = true
      lastBase = 0 // the backing store was cleared; redraw whatever is nearest
    }
    window.addEventListener('resize', onResize)

    const base = framesBase()
    fetchManifest(base)
      .then((manifest) => {
        if (cancelled) return
        seq = new FrameSequence(manifest, {
          base,
          concurrency: 6,
          priorityRadius: 3,
          // Desktop bitmaps are ~7.5 MB each (1728×1080); the cap keeps the renderer
          // under ~350 MB. Mobile crops to ~500×1080 (2 MB) and can afford more.
          decodeAhead: mobile ? 16 : 9,
          decodeBehind: mobile ? 4 : 2,
          maxBitmaps: mobile ? 24 : 12,
          decodeConcurrency: 4,
          onFrame: () => {
            frameDirty = true
          },
          onDecoded: () => {
            frameDirty = true
          },
        })
        if (import.meta.env.DEV) (window as unknown as { __frames: FrameSequence }).__frames = seq
        sizeDirty = true
        raf = requestAnimationFrame(tick)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('FrameScrub: manifest failed, leaving poster —', err instanceof Error ? err.message : err)
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      seq?.dispose()
      canvas.style.opacity = '0'
      if (poster) {
        poster.style.transition = ''
        poster.style.opacity = ''
      }
    }
  }, [mobile])

  return (
    <canvas
      ref={canvasRef}
      id="scene-canvas"
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 0, width: '100%', height: '100%', opacity: 0, transition: 'opacity 0.6s ease-out' }}
    />
  )
})
