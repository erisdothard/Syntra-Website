import { MagneticButton } from '../ui/MagneticButton'
import { services } from '../../data/portfolio'

const marquee = [
  'Snowflake', 'Automated CRMs', 'HL7 / FHIR', 'Supabase',
  'Claude API', 'MCP', 'FastAPI', 'React', 'Postgres', 'ETL / ELT', 'Voice AI', 'Playwright',
]

interface Props {
  onTabOpen: (tab: 'portfolio' | 'services' | 'resume') => void
}

/** Post-launch section: normal scroll, single strong CTA, quick links, footer. */
export function Outro({ onTabOpen }: Props) {
  return (
    <section id="outro" className="relative z-10 pointer-events-auto">
      {/* Gradient veil so the canvas settles behind the content */}
      <div
        className="absolute inset-x-0 -top-40 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, var(--color-void))' }}
      />
      <div style={{ background: 'var(--color-void)' }}>
        {/* Marquee */}
        <div className="overflow-hidden border-y border-border py-4">
          <div className="marquee-track gap-10">
            {[...marquee, ...marquee].map((m, i) => (
              <span key={i} className="mono-label whitespace-nowrap flex items-center gap-10">
                {m}<span className="text-accent">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 md:px-12 lg:px-16 py-28 md:py-40">
          <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1.3fr_1fr] gap-16 items-end">
            <div>
              <p className="mono-label mb-6 text-accent">Mission control</p>
              <h2 className="display text-text" style={{ fontSize: 'clamp(2.8rem, 8vw, 7.5rem)' }}>
                Ready for<br />liftoff?
              </h2>
              <p className="mt-8 max-w-lg text-text-secondary text-base md:text-lg leading-relaxed">
                Tell us where the friction is. We scope it, wire it, and hand you a system that
                runs without anyone pushing it.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <MagneticButton href="mailto:agent@syntraai.tech?subject=Launch%20request">
                  <span>Start a launch</span>
                  <span aria-hidden>→</span>
                </MagneticButton>
                <button className="btn-ghost" onClick={() => onTabOpen('portfolio')}>
                  See shipped work <span aria-hidden>↗</span>
                </button>
              </div>
            </div>

            <ul className="flex flex-col divide-y divide-border">
              {services.map((s, i) => (
                <li key={s.title} className="py-6 group cursor-pointer" onClick={() => onTabOpen('services')}>
                  <div className="flex items-baseline gap-6">
                    <span className="mono-label">0{i + 1}</span>
                    <h3 className="display text-text text-xl md:text-2xl group-hover:text-accent transition-colors duration-300">
                      {s.title}
                    </h3>
                    <span className="ml-auto text-text-secondary group-hover:text-accent transition-colors" aria-hidden>→</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 md:px-12 lg:px-16 pb-10 border-t border-border">
          <div className="max-w-[1400px] mx-auto pt-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="display text-text text-sm tracking-wide">SYNTRA AI</span>
              <span className="hud">Eris Dothard · Integration · Data · AI</span>
            </div>
            <div className="flex flex-wrap gap-6">
              <button className="btn-ghost" onClick={() => onTabOpen('portfolio')}>Portfolio</button>
              <button className="btn-ghost" onClick={() => onTabOpen('services')}>Services</button>
              <button className="btn-ghost" onClick={() => onTabOpen('resume')}>Resume</button>
              <a className="btn-ghost" href="mailto:agent@syntraai.tech">agent@syntraai.tech</a>
            </div>
            <div className="flex gap-6">
              <a className="hud hover:text-text transition-colors" href="/privacy.html">Privacy</a>
              <a className="hud hover:text-text transition-colors" href="/terms.html">Terms</a>
              <span className="hud">© {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>
    </section>
  )
}
