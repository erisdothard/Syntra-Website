import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { scrollState } from '../lib/scrollState'
import { mapProgress, PHASES } from '../lib/launchTimeline'

gsap.registerPlugin(ScrollTrigger)

const ACT_WINDOWS: Array<[number, number]> = [
  [0, PHASES.heroEnd],
  [PHASES.act1Start, PHASES.act1End],
  [PHASES.act2Start, PHASES.act2End],
  [PHASES.act3Start, PHASES.act3End + 0.01],
]

/**
 * Lenis smooth scroll (desktop only) synced to GSAP ScrollTrigger, plus one
 * scrubbed trigger over #launch that feeds the launch state, and per-act
 * triggers that toggle the DOM panels.
 */
export function useLaunchScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const noLenis = new URLSearchParams(window.location.search).has('nolenis')
    if (import.meta.env.DEV) (window as unknown as { __ST: typeof ScrollTrigger }).__ST = ScrollTrigger
    const narrow = () => window.innerWidth <= 768

    ScrollTrigger.config({ ignoreMobileResize: true })

    /* ── Lenis ── */
    let lenis: Lenis | null = null
    if (!coarse && !reduced && !noLenis) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true })
      lenis.on('scroll', ScrollTrigger.update)
      const tick = (time: number) => lenis?.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
      // store for cleanup
      ;(lenis as unknown as { _tick: typeof tick })._tick = tick
    }

    /* ── Master scrub over the launch section ── */
    const launch = document.getElementById('launch')
    if (!launch) return

    // Panel visibility is derived from the same progress value the scene
    // uses, so DOM and WebGL can never disagree about which act is on screen.
    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-act]'))
    const applyPanels = (p: number) => {
      for (const el of panels) {
        const [a, b] = ACT_WINDOWS[Number(el.dataset.act)] ?? [0, 0]
        el.classList.toggle('is-active', p >= a && p < b)
      }
    }
    const update = (p: number) => {
      mapProgress(p, scrollState, narrow())
      applyPanels(p)
    }

    const master = ScrollTrigger.create({
      trigger: launch,
      start: 'top top',
      end: 'bottom bottom',
      scrub: reduced ? false : 1.15,
      onUpdate: (self) => update(self.progress),
      onRefresh: (self) => update(self.progress),
    })
    update(0)

    /* ── Refresh once fonts are in (layout shifts otherwise) ── */
    const refresh = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refresh)
    const t = window.setTimeout(refresh, 250)

    return () => {
      window.clearTimeout(t)
      master.kill()
      if (lenis) {
        gsap.ticker.remove((lenis as unknown as { _tick: (t: number) => void })._tick)
        lenis.destroy()
      }
    }
  }, [])
}

/** Smooth scroll to an element id, works with or without Lenis. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
