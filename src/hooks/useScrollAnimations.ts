import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollState } from '../lib/scrollState'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

/** Hermite smoothstep — C1 continuous (no derivative jumps) */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function useScrollAnimations() {
  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), 100)

    const ctx = gsap.context(() => {
      // ONE global trigger — entire page drives one continuous motion
      ScrollTrigger.create({
        trigger: '#section-1',
        start: 'top top',
        endTrigger: '#section-5',
        end: 'bottom bottom',
        scrub: 1.4,
        onUpdate: (self) => {
          const p = self.progress

          // ─── Rotation — continuous, extends through section-4 ───
          const rotEase = smoothstep(0, 0.78, p)
          scrollState.rotationY = rotEase * Math.PI * 2

          // ─── Explode: decon through all text sections, reconstruct in final spacer ───
          const explodeIn  = smoothstep(0, 0.20, p)
          const explodeOut = 1 - smoothstep(0.82, 0.95, p)
          scrollState.explode = explodeIn * explodeOut

          // ─── Scale: gentle arc — peaks mid-page ───
          const scaleArc = Math.sin(smoothstep(0, 1, p) * Math.PI)
          scrollState.scale = 1 + scaleArc * 0.12

          // ─── Camera Y — subtle vertical drift ───
          scrollState.cameraY = scaleArc * 0.3
          scrollState.lookAtY = -scaleArc * 0.15

          // ─── Camera X — 5-phase choreography ───
          //
          // Progress map (with 80/105/75vh spacers, 140vh section-3b):
          //   section-1  hero        p ≈ 0.00
          //   section-2  decon       p ≈ 0.13
          //   section-3  core        p ≈ 0.20
          //   spacer 80vh            p ≈ 0.33–0.44
          //   section-3b services    p ≈ 0.44–0.63
          //   spacer 105vh           p ≈ 0.63–0.77
          //   section-4  crystal     p ≈ 0.77–0.90
          //   spacer 75vh            p ≈ 0.90–1.00
          //   section-5  reconstruct p ≈ 1.00
          //
          // Phase 0  Hero        (p 0.00–0.13) nudge right, model clears top-left name
          // Phase 1  Section 3   (p 0.15–0.28) pan LEFT  → model RIGHT (text left)
          // Phase 2  pre-3b      (p 0.26–0.38) swing RIGHT → model LEFT (text right)
          // Phase 3  Section 4   (p 0.65–0.78) pan LEFT  → model RIGHT (text left)
          // Phase 4  Section 5   (p 0.88–0.96) return CENTER (CTA centered)
          //
          // Cumulative: -3.5 → +3.5 → -2.0 → 0
          const narrow = window.innerWidth <= 768
          const m = narrow ? 1.4 : 1.0

          const heroNudge = (1 - smoothstep(0, 0.13, p)) * (narrow ? -1.2 : -0.4)
          const panL1     = smoothstep(0.15, 0.28, p)   // → -3.5
          const swingR    = smoothstep(0.26, 0.38, p)   // → +3.5  (net +3.5) — completes well before 3b at ~0.44
          const panL2     = smoothstep(0.65, 0.78, p)   // → -2.0  (net -2.0) — completes as section-4 arrives at ~0.77
          const toCenter  = smoothstep(0.88, 0.96, p)   // → 0     (net 0) — centers for CTA

          const camX = heroNudge + (-3.5 * panL1 + 7.0 * swingR - 5.5 * panL2 + 2.0 * toCenter) * m
          scrollState.cameraX = camX
          scrollState.lookAtX = camX * (1.5 / 3.5)

          // ─── Env rotation — continuous, eased ───
          scrollState.envRotation = rotEase * Math.PI
        },
      })

      // ─── Agentic text column fade in ───
      gsap.fromTo(
        '#agentic-text',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '#section-3',
            start: 'top 75%',
            end: 'top 30%',
            scrub: 1.4,
          },
        },
      )

      // ─── Services text column fade in ───
      gsap.fromTo(
        '#services-text',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '#section-3b',
            start: 'top 90%',
            end: 'top 50%',
            scrub: 1.4,
          },
        },
      )

      // Section 4: CrystalCore reveal (separate 3D object)
      ScrollTrigger.create({
        trigger: '#section-4',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.4,
        onUpdate: (self) => {
          const t = self.progress
          const up = smoothstep(0, 0.45, t)
          const down = 1 - smoothstep(0.55, 1, t)
          scrollState.crystalExplode = Math.min(up, down)
          scrollState.crystalRotationY = smoothstep(0, 1, t) * Math.PI * 2
          scrollState.crystalScale = 1 + smoothstep(0, 0.5, t) * 0.2
        },
      })
    })

    return () => {
      clearTimeout(timer)
      ctx.revert()
    }
  }, [])
}
