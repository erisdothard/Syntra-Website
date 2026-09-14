import { memo, useEffect, useRef } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { scrollState } from '../../lib/scrollState'
import { FrameSequence, fetchManifest } from '../../lib/frameSequence'

const FRAMES_BASE = '/frames/desktop'
const MAX_DPR = 2

/**
 * Fixed full-screen canvas that scrubs the offline-rendered launch sequence
 * with scroll (see render/SPEC.md → "Frame contract"). Sits in the slot
 * LaunchCanvas used to occupy and carries its id so TabOverlay can dim it.
 *
 * Reads scrollState on rAF, redraws only when the target frame or the canvas
 * size changes, and never touches React state on the hot path.
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
    let lastTarget = 0
    let lastDrawn = 0
    let revealed = false

    const resize = () => {
      const src = seq?.manifest
      // Never allocate a backing store larger than the source can fill.
      const cap = src ? Math.max(1, src.width / window.innerWidth) : MAX_DPR
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR, cap)
      const w = Math.round(window.innerWidth * dpr)
      const h = Math.round(window.innerHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      sizeDirty = false
    }

    const draw = (bmp: ImageBitmap) => {
      const cw = canvas.width
      const ch = canvas.height
      // Cover-fit, centre anchor: the vehicle is centred in the render.
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

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!seq) return
      const target = Math.round(scrollState.progress * (seq.count - 1)) + 1
      if (target !== lastTarget) {
        lastTarget = target
        seq.setFocus(target)
      } else if (!sizeDirty && !frameDirty) {
        return
      }
      frameDirty = false
      const index = seq.nearest(target)
      if (index === 0) return
      if (sizeDirty) resize()
      else if (index === lastDrawn) return
      const bmp = seq.get(index)
      if (!bmp) return
      draw(bmp)
      lastDrawn = index
      if (!revealed) reveal()
    }

    const onResize = () => {
      sizeDirty = true
    }
    window.addEventListener('resize', onResize)

    fetchManifest(FRAMES_BASE)
      .then((manifest) => {
        if (cancelled) return
        seq = new FrameSequence(manifest, {
          base: FRAMES_BASE,
          concurrency: 6,
          priorityRadius: 3,
          decodeWidth: mobile ? Math.round(manifest.width / 2) : undefined,
          decodeHeight: mobile ? Math.round(manifest.height / 2) : undefined,
          onFrame: () => {
            frameDirty = true
          },
        })
        if (import.meta.env.DEV) (window as unknown as { __frames: FrameSequence }).__frames = seq
        sizeDirty = true
        seq.setFocus(Math.round(scrollState.progress * (manifest.count - 1)) + 1)
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
