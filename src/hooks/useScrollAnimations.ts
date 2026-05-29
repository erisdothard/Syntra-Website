import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollState } from '../lib/scrollState'

gsap.registerPlugin(ScrollTrigger)

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
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress

          // One continuous 360° rotation — smoothstep eased for gentle start/end
          const rotEase = smoothstep(0, 1, p)
          scrollState.rotationY = rotEase * Math.PI * 2

          // Explode: smooth ramp up (0–0.25), smooth ramp down (0.35–0.85)
          const explodeUp = smoothstep(0.05, 0.25, p)
          const explodeDown = 1 - smoothstep(0.35, 0.85, p)
          scrollState.explode = Math.min(explodeUp, explodeDown)

          // Scale: gentle arc — peaks mid-page
          const scaleArc = Math.sin(smoothstep(0, 1, p) * Math.PI)
          scrollState.scale = 1 + scaleArc * 0.12

          // Camera drift — subtle
          scrollState.cameraY = scaleArc * 0.3
          scrollState.lookAtY = -scaleArc * 0.15

          // Env rotation — continuous, eased
          scrollState.envRotation = rotEase * Math.PI
        },
      })

      // ─── Camera pans right during section-3 (GPU-native, no DOM jank) ───
      ScrollTrigger.create({
        trigger: '#section-3',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 2,
        onUpdate: (self) => {
          const t = smoothstep(0, 0.6, self.progress)
          scrollState.cameraX = t * -3.5
          scrollState.lookAtX = t * -1.5
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
            start: 'top 90%',
            end: 'top 50%',
            scrub: 0.4,
          },
        },
      )

      // ─── Camera returns to center for footer ───
      ScrollTrigger.create({
        trigger: '#section-5',
        start: 'top bottom',
        end: 'top center',
        scrub: 2,
        onUpdate: (self) => {
          const t = smoothstep(0, 1, self.progress)
          scrollState.cameraX = -3.5 * (1 - t)
          scrollState.lookAtX = -1.5 * (1 - t)
        },
      })

      // Section 4: CrystalCore reveal (separate 3D object)
      ScrollTrigger.create({
        trigger: '#section-4',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
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
