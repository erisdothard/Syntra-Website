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

/** Fast burst that decelerates — used for explode outward */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function useScrollAnimations() {
  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), 100)

    // Snapshot viewport width once — avoids layout-triggering read on every scroll event
    let narrow = window.innerWidth <= 768
    const onResize = () => { narrow = window.innerWidth <= 768 }
    window.addEventListener('resize', onResize)

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

          // ─── Rotation — base + accent flips at text-box transitions ───
          const rotEase = smoothstep(0, 0.78, p)
          const accent2 = smoothstep(0.24, 0.38, p)   // speed-up during swing to text box 2
          const accent3 = smoothstep(0.65, 0.78, p)   // speed-up during pan to text box 3
          scrollState.rotationY = rotEase * Math.PI * 2 + (accent2 + accent3) * Math.PI * 0.5

          // ─── Explode: asymmetric easing ───
          // Out = exponential burst (fast separation, slow settle)
          // In  = double-smoothstep (controlled, deliberate reassembly)
          const explodeIn  = easeOutExpo(smoothstep(0, 0.20, p))
          const implodeT   = smoothstep(0.82, 0.95, p)
          const explodeOut = 1 - implodeT * implodeT * (3 - 2 * implodeT)
          scrollState.explode = explodeIn * explodeOut

          // ─── Scale: gentle arc — peaks mid-page ───
          const scaleArc = Math.sin(smoothstep(0, 1, p) * Math.PI)
          scrollState.scale = 1 + scaleArc * 0.12

          // ─── Camera Y — vertical drift (increased amplitude) ───
          scrollState.cameraY = scaleArc * 0.5
          scrollState.lookAtY = -scaleArc * 0.25

          // ─── Camera Z — depth movement ───
          // Push in during explode (immersive), drift back for text, return for CTA
          const zPush   = easeOutExpo(smoothstep(0.05, 0.22, p))
          const zPull   = smoothstep(0.35, 0.55, p)
          const zReturn = smoothstep(0.88, 0.96, p)
          scrollState.cameraZ = -zPush * 0.8 + zPull * 0.5 + zReturn * 0.3

          // ─── Camera X — 5-phase choreography ───
          //
          // Progress map (with 55/80/75vh spacers, 140vh section-3b):
          //   section-1  hero        p ≈ 0.00
          //   section-2  decon       p ≈ 0.13
          //   section-3  core        p ≈ 0.20
          //   spacer 55vh            p ≈ 0.33–0.42
          //   section-3b services    p ≈ 0.42–0.62
          //   spacer 80vh            p ≈ 0.62–0.76
          //   section-4  crystal     p ≈ 0.76–0.89
          //   spacer 75vh            p ≈ 0.89–1.00
          //   section-5  reconstruct p ≈ 1.00
          //
          // Phase 0  Hero        (p 0.00–0.13) nudge right, model clears top-left name
          // Phase 1  Section 3   (p 0.15–0.28) pan LEFT  → model RIGHT (text left)
          // Phase 2  pre-3b      (p 0.22–0.34) swing RIGHT → model LEFT (text right)
          // Phase 3  Section 4   (p 0.65–0.78) pan LEFT  → model RIGHT (text left)
          // Phase 4  Section 5   (p 0.88–0.96) return CENTER (CTA centered)
          //
          // Cumulative: -3.5 → +3.5 → -2.0 → 0
          const m = narrow ? 1.4 : 1.0

          const heroNudge = (1 - smoothstep(0, 0.13, p)) * (narrow ? -1.2 : -0.4)
          const panL1     = smoothstep(0.15, 0.28, p)   // → -3.5
          const swingR    = smoothstep(0.22, 0.34, p)   // → +3.5  (net +3.5) — shifted 4pts earlier for text box 2 clearance
          const panL2     = smoothstep(0.58, 0.72, p)   // → -2.0  (net -2.0) — completes before section-4 arrives at ~0.76
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
      window.removeEventListener('resize', onResize)
      ctx.revert()
    }
  }, [])
}
