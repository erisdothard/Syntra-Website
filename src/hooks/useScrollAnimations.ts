import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollState } from '../lib/scrollState'

gsap.registerPlugin(ScrollTrigger)

export function useScrollAnimations() {
  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), 100)

    const ctx = gsap.context(() => {
      // Section 2: Rings separate + deconstruct
      ScrollTrigger.create({
        trigger: '#section-2',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          scrollState.explode = self.progress
          scrollState.rotationY = self.progress * Math.PI * 1.5
          scrollState.envRotation = self.progress * Math.PI * 0.5
        },
      })

      // Section 3: Hold open + scale up + camera shift
      ScrollTrigger.create({
        trigger: '#section-3',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          scrollState.scale = 1 + self.progress * 0.3
          scrollState.cameraY = self.progress * 0.8
          scrollState.lookAtY = self.progress * -0.4
          scrollState.envRotation = Math.PI * 0.3 + self.progress * Math.PI * 0.2
        },
      })

      // Section 5: CrystalCore reveal
      ScrollTrigger.create({
        trigger: '#section-5',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          scrollState.crystalExplode = self.progress < 0.5
            ? self.progress * 2
            : 2 - self.progress * 2
          scrollState.crystalRotationY = self.progress * Math.PI * 2
          scrollState.crystalScale = 1 + self.progress * 0.2
        },
      })

      // Section 7: Reconstruct — rings converge
      ScrollTrigger.create({
        trigger: '#section-7',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          scrollState.explode = 1 - self.progress
          scrollState.rotationY = Math.PI * 1.5 + self.progress * Math.PI * 1.5
          scrollState.scale = 1.3 - self.progress * 0.3
          scrollState.cameraY = 0.8 - self.progress * 0.8
          scrollState.lookAtY = -0.4 + self.progress * 0.4
          scrollState.envRotation = Math.PI * 0.5 + self.progress * Math.PI * 0.5
        },
      })
    })

    return () => {
      clearTimeout(timer)
      ctx.revert()
    }
  }, [])
}
