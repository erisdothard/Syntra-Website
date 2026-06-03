import { useState, lazy, Suspense } from 'react'
import { useMouseTracking } from './hooks/useMouseTracking'

const SceneCanvas = lazy(() => import('./components/scene/SceneCanvas').then(m => ({ default: m.SceneCanvas })))
import { useScrollAnimations } from './hooks/useScrollAnimations'
import { useTextReveals } from './hooks/useTextReveals'
import { Navbar } from './components/layout/Navbar'
import { TabOverlay } from './components/TabOverlay'
import { HeroSection } from './components/sections/HeroSection'
import { DeconstructSection } from './components/sections/DeconstructSection'
import { CoreSection } from './components/sections/CoreSection'
import { CrystalSection } from './components/sections/CrystalSection'
import { ServicesSection } from './components/sections/ServicesSection'
import { ReconstructSection } from './components/sections/ReconstructSection'

export default function App() {
  useMouseTracking()
  useScrollAnimations()
  useTextReveals()

  const [activeTab, setActiveTab] = useState<'portfolio' | 'services' | 'resume' | null>(null)

  return (
    <>
      <Suspense fallback={null}>
        <SceneCanvas />
      </Suspense>
      <div className="emblem-glow" />
      <Navbar onTabOpen={setActiveTab} />
      <TabOverlay activeTab={activeTab} onClose={() => setActiveTab(null)} />
      <div className="relative z-10 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <HeroSection />
        <DeconstructSection />
        <CoreSection onTabOpen={setActiveTab} />
        <div style={{ height: '40vh' }} />
        <ServicesSection onTabOpen={setActiveTab} />
        <div style={{ height: '55vh' }} />
        <CrystalSection />
        <div style={{ height: '75vh' }} />
        <ReconstructSection />
      </div>
    </>
  )
}
