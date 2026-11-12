import { MagneticButton } from '../ui/MagneticButton'
import { services, projects, buyerLine } from '../../data/portfolio'
import { OfferGrid } from '../OfferGrid'
import { track } from '../../lib/analytics'
import { DEMO_TOPICS, useDemoRequest } from '../demo-request/context'

/* What gets built, in the buyer's words. The stack lives in the Portfolio and About tabs. */
const marquee = [
  'Websites', 'Pricing configurators', 'Customer portals', 'Booking and ordering', 'CRMs',
  'Admin panels', 'Lead research', 'Follow-up drafts', 'Document reading', 'Payments',
  'Live GPS tracking', 'Voice agents',
]

interface Props {
  onTabOpen: (tab: 'portfolio' | 'services' | 'about') => void
}

/** Post-launch section: normal scroll, single strong CTA, quick links, footer. */
export function Outro({ onTabOpen }: Props) {
  const requestDemo = useDemoRequest()
  const openBlueprint = (place: string) => {
    track('blueprint_cta_clicked', { place })
    requestDemo(DEMO_TOPICS.blueprint)
  }
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
              Built once, handed over on orbit, yours to run or hand to the next developer.
            </p>
          </div>
        </div>

        {/* Proof strip — the three stages are all promises; this is the evidence,
            on the main scroll rather than behind the Portfolio overlay. Driven by
            `proof` on the project data so it cannot drift out of sync. */}
        <div className="px-6 md:px-12 lg:px-16 pb-20 md:pb-24">
          <div className="max-w-[1400px] mx-auto">
            <p className="mono-label text-accent mb-7">Recent builds</p>
            <ul className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8">
              {projects.filter((pr) => pr.proof).map((pr) => (
                <li key={pr.title} className="border-t border-border pt-5">
                  <h3 className="display text-text text-base md:text-lg mb-2">{pr.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{pr.proof}</p>
                  {pr.live ? (
                    <a
                      className="hud inline-flex items-center gap-2 mt-3 hover:text-text transition-colors"
                      href={pr.live}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit the live site <span aria-hidden>↗</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="hud inline-flex items-center gap-2 mt-3 hover:text-text transition-colors cursor-pointer"
                      onClick={() => onTabOpen('portfolio')}
                    >
                      See the full build <span aria-hidden>→</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
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

        {/* What it costs — the first step and the prices, in the open. Copy and
            numbers come from `offers` so no price is ever typed into a component. */}
        <div className="px-6 md:px-12 lg:px-16 pt-24 md:pt-32">
          <div className="max-w-[1400px] mx-auto">
            <p className="mono-label text-accent mb-5">What it costs</p>
            <h2 className="display text-text max-w-3xl" style={{ fontSize: 'clamp(1.7rem, 3.6vw, 3rem)', lineHeight: 1.1 }}>
              Start with a Blueprint. Know the price before you commit to the build.
            </h2>
            <div className="mt-12">
              <OfferGrid onBlueprint={() => openBlueprint('pricing')} />
            </div>
          </div>
        </div>

        {/* CTA — the navbar's Contact link lands here (scrollToId('contact')). */}
        <div id="contact" className="px-6 md:px-12 lg:px-16 pt-20 pb-28 md:pt-28 md:pb-40 scroll-mt-16">
          <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1.3fr_1fr] gap-16 items-end">
            <div>
              <p className="mono-label mb-6 text-accent">Start here</p>
              <h2 className="display text-text" style={{ fontSize: 'clamp(2.8rem, 8vw, 7.5rem)' }}>
                Ready for<br />liftoff?
              </h2>
              <p className="mt-8 max-w-lg text-text-secondary text-base md:text-lg leading-relaxed">
                {buyerLine} Tell us what you need built. We build the whole rocket,
                fly it with you, and hand it over. You own it outright.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <MagneticButton onClick={() => openBlueprint('contact')}>
                  <span>Get a Blueprint</span>
                  <span aria-hidden>→</span>
                </MagneticButton>
                <button className="btn-ghost" onClick={() => requestDemo(DEMO_TOPICS.launch)}>
                  Start a build <span aria-hidden>→</span>
                </button>
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
              <span className="hud">Built here · Flown with you · Yours at orbit · Nashville, TN</span>
            </div>
            <div className="flex flex-wrap gap-6">
              <button className="btn-ghost" onClick={() => onTabOpen('portfolio')}>Portfolio</button>
              <button className="btn-ghost" onClick={() => onTabOpen('services')}>Services</button>
              <button className="btn-ghost" onClick={() => onTabOpen('about')}>About</button>
              <a className="btn-ghost" href="/work">Case studies</a>
              <a className="btn-ghost" href="/blueprint">Blueprint</a>
              <a className="btn-ghost" href="mailto:agent@syntraai.tech">agent@syntraai.tech</a>
            </div>
            <div className="flex gap-6">
              <a className="hud hover:text-text transition-colors" href="/privacy.html">Privacy</a>
              <a className="hud hover:text-text transition-colors" href="/terms.html">Terms</a>
              <span className="hud">© {new Date().getFullYear()}</span>
            </div>
          </div>
          {/* CC-BY-4.0 attribution for the vehicle model in the launch render. */}
          <p className="max-w-[1400px] mx-auto pt-6 hud text-text-secondary/70">
            Launch rendered in Blender. Saturn V model based on{' '}
            <a
              className="underline decoration-border hover:text-text transition-colors"
              href="https://sketchfab.com/3d-models/apollo-saturn-v-launch-vehicle-7c61146069134981a84dc7ed951609a0"
              target="_blank"
              rel="noopener noreferrer license"
            >
              “Apollo | Saturn V Launch Vehicle”
            </a>{' '}
            by{' '}
            <a
              className="underline decoration-border hover:text-text transition-colors"
              href="https://sketchfab.com/devPilot0615"
              target="_blank"
              rel="noopener noreferrer"
            >
              devPilot
            </a>
            , CC BY 4.0. Pad and launcher from NASA 3D Resources.
          </p>
        </footer>
      </div>
    </section>
  )
}
