import { useEffect, useRef } from 'react'
import { SceneCanvas } from './components/scene/SceneCanvas'
import { FloatingPanel } from './components/ui/FloatingPanel'
import { HeroSection } from './components/sections/HeroSection'
import { DeconstructSection } from './components/sections/DeconstructSection'
import { CoreSection } from './components/sections/CoreSection'
import { CapabilitiesSection } from './components/sections/CapabilitiesSection'
import { CrystalSection } from './components/sections/CrystalSection'
import { MetricsSection } from './components/sections/MetricsSection'
import { ReconstructSection } from './components/sections/ReconstructSection'
import { useScrollAnimations } from './hooks/useScrollAnimations'
import { useMouseTracking } from './hooks/useMouseTracking'
import { useTextReveals } from './hooks/useTextReveals'
import { scrollState } from './lib/scrollState'

export default function App() {
  useScrollAnimations()
  useMouseTracking()
  useTextReveals()
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tick = () => {
      if (glowRef.current) {
        const intensity = 0.08 + scrollState.explode * 0.12
        glowRef.current.style.background = `radial-gradient(circle, rgba(0, 182, 122, ${intensity}) 0%, transparent 70%)`
      }
      requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <>
      <div ref={glowRef} className="emblem-glow" />
      <SceneCanvas />
      <FloatingPanel />
      <div className="relative z-10" style={{ pointerEvents: 'auto' }}>
        <HeroSection />
        <DeconstructSection />
        <CoreSection />
        <CapabilitiesSection />
        <CrystalSection />
        <MetricsSection />
        <ReconstructSection />
      </div>
    </>
  )
}
