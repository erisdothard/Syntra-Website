import { useState, lazy, Suspense } from 'react'
import { useMouseTracking } from './hooks/useMouseTracking'
import { useLaunchScroll } from './hooks/useLaunchScroll'
import { Navbar } from './components/layout/Navbar'
import { TabOverlay } from './components/TabOverlay'
import { Hero } from './components/sections/Hero'
import { ActPanel } from './components/sections/ActPanel'
import { Telemetry } from './components/sections/Telemetry'
import { Outro } from './components/sections/Outro'
import { DemoRequestProvider } from './components/demo-request/DemoRequestProvider'
import { acts } from './data/acts'
import { FrameScrub } from './components/scene/FrameScrub'
import { dbg } from './lib/dbg'

// The live WebGL scene stays reachable in dev via ?webgl for side-by-side
// comparison with the rendered sequence; it is never in the default bundle path.
const LaunchCanvas = lazy(() =>
  import('./components/scene/LaunchCanvas').then((m) => ({ default: m.LaunchCanvas })),
)

type Tab = 'portfolio' | 'services' | 'resume' | null

export default function App() {
  useMouseTracking()
  useLaunchScroll()
  const [activeTab, setActiveTab] = useState<Tab>(null)

  return (
    <DemoRequestProvider>
      <div className="poster" aria-hidden />
      {dbg('webgl') ? (
        <Suspense fallback={null}>
          <LaunchCanvas />
        </Suspense>
      ) : (
        <FrameScrub />
      )}
      <Telemetry />
      <Navbar onTabOpen={setActiveTab} />
      <TabOverlay activeTab={activeTab} onClose={() => setActiveTab(null)} />

      <main className="relative z-10">
        {/* One tall scroll track. Every act boundary lives in launchTimeline.PHASES. */}
        <section id="launch" style={{ height: '640vh' }} className="relative">
          <Hero />
          {acts.map((a) => (
            <ActPanel key={a.n} act={a} />
          ))}
        </section>
        <Outro onTabOpen={setActiveTab} />
      </main>
    </DemoRequestProvider>
  )
}
