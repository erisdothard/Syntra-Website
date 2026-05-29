import { useState } from 'react'
import { SceneCanvas } from './components/scene/SceneCanvas'
import { useMouseTracking } from './hooks/useMouseTracking'
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
      <SceneCanvas />
      <div className="emblem-glow" />
      <Navbar onTabOpen={setActiveTab} />
      <TabOverlay activeTab={activeTab} onClose={() => setActiveTab(null)} />
      <div className="relative z-10 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <HeroSection />
        <DeconstructSection />
        <CoreSection />
        <div style={{ height: '45vh' }} />
        <ServicesSection />
        <CrystalSection />
        <ReconstructSection />
      </div>
    </>
  )
}
