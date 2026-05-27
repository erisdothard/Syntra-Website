import { SceneCanvas } from './components/scene/SceneCanvas'
import { useMouseTracking } from './hooks/useMouseTracking'
import { useScrollAnimations } from './hooks/useScrollAnimations'

export default function App() {
  useMouseTracking()
  useScrollAnimations()

  return (
    <>
      <SceneCanvas />
      {/* Subtle green glow behind emblem */}
      <div className="emblem-glow" />
      {/* Invisible spacers — ScrollTrigger reads section IDs */}
      <div id="section-1" className="h-screen" />
      <div id="section-2" className="h-screen" />
      <div id="section-3" className="h-screen" />
      <div id="section-4" className="h-screen" />
      <div id="section-5" className="h-screen" />
      <div id="section-6" className="h-screen" />
      <div id="section-7" className="h-screen" />
    </>
  )
}
