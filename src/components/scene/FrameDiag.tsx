import { useEffect, useRef } from 'react'
import type { FrameSequence } from '../../lib/frameSequence'

declare global {
  interface Window {
    __frames?: FrameSequence
  }
}

/** Starvation is counted on ticks where the target frame changed and the drawn one was 2+ frames away. */
const REPORT_MS = 250

export function FrameDiag() {
  const ref = useRef<HTMLPreElement>(null)

  useEffect(() => {
    let raf = 0
    let frames = 0
    let lastReport = performance.now()
    let moving = 0
    let starved = 0
    let worst = 0
    let lastTarget = 0
    const nav = navigator as Navigator & { deviceMemory?: number }
    const coarse = window.matchMedia('(pointer: coarse)').matches

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      frames++
      const s = window.__frames?.stats
      if (s && s.target !== lastTarget) {
        moving++
        const gap = Math.abs(s.target - s.drawn)
        if (gap >= 2) starved++
        worst = Math.max(worst, gap)
        lastTarget = s.target
      }
      if (t - lastReport < REPORT_MS) return
      const fps = Math.round((frames * 1000) / (t - lastReport))
      frames = 0
      lastReport = t
      const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement | null
      const pct = moving ? Math.round((100 * starved) / moving) : 0
      const lines = [
        `fps ${fps}`,
        s ? `frame ${s.drawn}/${s.target} (want ${s.target})  gap ${Math.abs(s.target - s.drawn)}` : 'player not started',
        `starved ${starved}/${moving} ticks (${pct}%)  worst gap ${worst}`,
        s ? `decoded ${s.decoded}  dropped ${s.droppedDecodes}  cached ${s.cached}  blendMiss ${s.blendMisses}` : '',
        s ? `loaded ${s.loaded}/${window.__frames?.count ?? '?'}  failed ${s.failed}` : '',
        `dpr ${window.devicePixelRatio}  canvas ${canvas?.width ?? '?'}x${canvas?.height ?? '?'}  viewport ${window.innerWidth}x${window.innerHeight}`,
        `cores ${navigator.hardwareConcurrency}  mem ${nav.deviceMemory ?? '?'} GB  pointer ${coarse ? 'coarse' : 'fine'}`,
        navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 90),
      ]
      if (ref.current) ref.current.textContent = lines.join('\n')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <pre
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed', top: 72, left: 12, zIndex: 100, margin: 0,
        font: '11px/1.45 ui-monospace, Menlo, monospace', color: '#9EF59E',
        background: 'rgba(0, 0, 0, 0.72)', padding: '6px 8px', borderRadius: 4,
        pointerEvents: 'none', whiteSpace: 'pre',
      }}
    />
  )
}
