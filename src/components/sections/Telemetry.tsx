import { useEffect, useRef } from 'react'
import { scrollState } from '../../lib/scrollState'
import { PHASES } from '../../lib/launchTimeline'

const pad = (n: number, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, '0')

/**
 * Fixed HUD in the corners. Reads scrollState on rAF at ~12 Hz and writes
 * text directly — no React state, no re-renders.
 */
export function Telemetry() {
  const tminus = useRef<HTMLSpanElement>(null)
  const status = useRef<HTMLSpanElement>(null)
  const pressure = useRef<HTMLElement>(null)
  const throttle = useRef<HTMLElement>(null)
  const altitude = useRef<HTMLSpanElement>(null)
  const velocity = useRef<HTMLSpanElement>(null)
  const act = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 80) return
      last = t
      const s = scrollState
      const p = s.progress

      // Hide once the outro scrolls into view
      const launch = document.getElementById('launch')
      if (root.current && launch) {
        const bottom = launch.getBoundingClientRect().bottom
        root.current.style.opacity = bottom < window.innerHeight * 0.85 ? '0' : '1'
      }

      // Countdown: T-00:10:00 at hero → T-00:00:00 at ignition → T+ after
      const secsBefore = 600 * (1 - Math.min(1, p / PHASES.ignitionStart))
      const secsAfter = ((p - PHASES.ignitionStart) / (1 - PHASES.ignitionStart)) * 180
      const before = p < PHASES.ignitionStart
      const secs = before ? secsBefore : Math.max(0, secsAfter)
      const mm = Math.floor(secs / 60)
      const ss = Math.floor(secs % 60)
      const cs = Math.floor((secs * 100) % 100)
      if (tminus.current) tminus.current.textContent = `T${before ? '−' : '+'}${pad(mm)}:${pad(ss)}.${pad(cs)}`

      if (status.current) {
        status.current.textContent =
          s.act === 0 ? 'Pad · Holding' :
          s.act === 1 ? 'Pressurizing' :
          s.ignition < 0.98 && s.act === 2 ? 'Ignition sequence' :
          s.act === 2 ? 'Full stage · Release' :
          s.altitude > 0.9 ? 'Nominal · On orbit trajectory' : 'Liftoff · Max Q'
        status.current.style.color = s.act === 2 ? '#FF6A1A' : ''
      }
      if (pressure.current) pressure.current.style.transform = `scaleX(${Math.max(s.pressure, s.ignition)})`
      if (throttle.current) throttle.current.style.transform = `scaleX(${Math.min(1, s.ignition * 0.7 + s.thrust * 0.3)})`
      const alt = s.lift * s.lift * 42.0 // km, eased
      if (altitude.current) altitude.current.textContent = `${alt.toFixed(1).padStart(5, '0')} km`
      const vel = s.thrust * 900 + s.lift * 6400
      if (velocity.current) velocity.current.textContent = `${pad(vel, 4)} m/s`
      if (act.current) act.current.textContent = s.act === 0 ? '00' : `0${s.act}`
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div ref={root} className="fixed inset-0 z-20 pointer-events-none hidden md:block transition-opacity duration-500" aria-hidden>
      {/* corners */}
      <i className="hud-corner" style={{ top: 88, left: 40, borderRight: 0, borderBottom: 0 }} />
      <i className="hud-corner" style={{ top: 88, right: 40, borderLeft: 0, borderBottom: 0 }} />
      <i className="hud-corner" style={{ bottom: 40, left: 40, borderRight: 0, borderTop: 0 }} />
      <i className="hud-corner" style={{ bottom: 40, right: 40, borderLeft: 0, borderTop: 0 }} />

      {/* bottom-left: clock + status */}
      <div className="absolute left-14 bottom-12 flex flex-col gap-2">
        <span ref={tminus} className="hud text-text" style={{ fontSize: 13, letterSpacing: '0.1em' }}>
          T−10:00.00
        </span>
        <span ref={status} className="hud">Pad · Holding</span>
      </div>

      {/* bottom-right: gauges */}
      <div className="absolute right-14 bottom-12 w-44 flex flex-col gap-3">
        <div>
          <div className="flex justify-between hud mb-1"><span>Chamber</span><span>PSI</span></div>
          <div className="hud-bar"><i ref={pressure} /></div>
        </div>
        <div>
          <div className="flex justify-between hud mb-1"><span>Throttle</span><span>%</span></div>
          <div className="hud-bar"><i ref={throttle} /></div>
        </div>
        <div className="flex justify-between hud pt-1">
          <span>Alt</span><span ref={altitude} className="text-text">000.0 km</span>
        </div>
        <div className="flex justify-between hud">
          <span>Vel</span><span ref={velocity} className="text-text">0000 m/s</span>
        </div>
      </div>

      {/* top-right: act index */}
      <div className="absolute right-14 top-[88px] flex items-baseline gap-2">
        <span className="hud">Act</span>
        <span ref={act} className="hud text-text" style={{ fontSize: 13 }}>00</span>
        <span className="hud">/ 03</span>
      </div>
    </div>
  )
}
