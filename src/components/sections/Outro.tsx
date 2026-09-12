import { MagneticButton } from '../ui/MagneticButton'
import { services, credentials, backgroundOrgs } from '../../data/portfolio'

const marquee = [
  'Next.js 16', 'React 19', 'TypeScript', 'Supabase', 'Postgres', 'FastAPI', 'Stripe', 'Mapbox',
  'Claude tool use',
  'MCP servers', 'ElevenLabs', 'Playwright', 'HL7 v2.5', 'FHIR R4', 'Mirth Connect',
  'Live GPS tracking', 'Agentic CRMs', 'Three.js',
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
        {/* Ownership band — closes the launch sequence, directly under Act 03.
            No bottom border: the marquee's border-y supplies the rule. */}
        <div className="px-6 md:px-12 lg:px-16 pt-20 pb-16 md:pt-24 md:pb-20">
          <div className="max-w-[1400px] mx-auto">
            <p className="display text-text max-w-3xl" style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.6rem)', lineHeight: 1.15 }}>
              You own all of it. The code, the database, the accounts.
            </p>
            <p className="mt-6 max-w-xl text-base md:text-lg text-text-secondary leading-relaxed">
              No monthly license, no seats to pay for, no waiting on somebody else’s roadmap.
            </p>
          </div>
        </div>

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

        {/* Principal — for a one-person firm the founder IS the differentiator,
            so this is a section, not a credentials footnote. */}
        <div className="px-6 md:px-12 lg:px-16 pt-24 md:pt-32">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-start">
              <div>
                <p className="mono-label mb-6 text-accent">Who builds it</p>
                <h2 className="display text-text" style={{ fontSize: 'clamp(2.2rem, 5vw, 4.25rem)' }}>
                  You deal with<br />the person<br />who builds it.
                </h2>
              </div>
              <div className="lg:pt-14">
                <p className="text-base md:text-lg text-text leading-relaxed">
                  No account manager. No handoff to a junior team once the contract is signed.
                  The person who scopes your build is the person who writes it, and the person
                  who answers when something breaks at 6pm on a Friday.
                </p>
                <p className="hud mt-9">Seven years in IT</p>
                {/* No separator glyphs: a "/" between items dangles at the end of a
                    line when the row wraps. Spacing separates them and cannot dangle. */}
                <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2">
                  {backgroundOrgs.map((org) => (
                    <span key={org} className="display text-text text-lg md:text-xl whitespace-nowrap">
                      {org}
                    </span>
                  ))}
                </div>
                <a className="btn-ghost inline-flex items-center gap-2 mt-9" href="/resume.html">
                  Full background <span aria-hidden>↗</span>
                </a>
              </div>
            </div>

            <dl className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-9 mt-20 md:mt-28">
              {credentials.map((c) => (
                <div key={c.claim} className="border-t border-border pt-5">
                  <dt className="display text-text text-base md:text-lg leading-tight mb-3 lg:min-h-[2.5em]">{c.claim}</dt>
                  <dd className="text-sm text-text-secondary leading-relaxed">{c.detail}</dd>
                </div>
              ))}
            </dl>
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
                Tell us what you need built. We scope it, build it, and hand you the system —
                front end through database, agents included. You own it outright.
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
              <span className="hud">Eris Dothard · Web · Applications · AI</span>
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
