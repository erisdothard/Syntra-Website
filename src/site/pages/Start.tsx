import { projects, services, buyerLine } from '../../data/portfolio'
import { OfferGrid } from '../../components/OfferGrid'
import { TestimonialBand } from '../../components/Testimonials'
import { start, caseStudies } from '../content'
import { Band, ClosingBand, PageHero, PointList } from '../SiteLayout'
import { useBlueprint } from '../useBlueprint'

/** The landing page for every referral, partner and outreach link. */
export function Start() {
  const openBlueprint = useBlueprint()
  return (
    <>
      <PageHero
        eyebrow={start.eyebrow}
        headline={start.headline}
        lead={
          <>
            {buyerLine} <span className="hidden sm:inline">{start.lead}</span>
          </>
        }
        art
        prices
      >
        <button type="button" className="btn-primary" onClick={() => openBlueprint('start-hero')}>
          <span>Get a Blueprint</span>
          <span aria-hidden>→</span>
        </button>
        <a className="btn-ghost" href="#pricing">
          See the prices <span aria-hidden>↓</span>
        </a>
      </PageHero>

      <Band n="01" title={start.problemsTitle}>
        <PointList points={start.problems} />
      </Band>

      <Band n="02" title="What gets built">
        <PointList points={services.map((s) => ({ title: s.title, text: s.desc }))} />
        <a className="btn-ghost mt-10" href="/services">
          How a build runs <span aria-hidden>→</span>
        </a>
      </Band>

      <Band n="03" title={start.proofTitle}>
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {caseStudies.map((c) => {
            const project = projects.find((p) => p.title === c.project)
            return (
              <li key={c.slug}>
                <a href={`/work/${c.slug}`} className="group grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-x-10 gap-y-2 py-7 items-baseline">
                  <h3 className="display text-text text-lg md:text-xl group-hover:text-accent transition-colors duration-300">
                    {c.project}
                  </h3>
                  <p className="text-sm md:text-[15px] text-text-secondary leading-relaxed">{project?.proof ?? c.headline}</p>
                  <span className="hud group-hover:text-text transition-colors">Read the build →</span>
                </a>
              </li>
            )
          })}
        </ul>
      </Band>

      <Band n="04" title="From clients">
        <TestimonialBand />
      </Band>

      <section id="pricing" className="px-6 md:px-12 lg:px-16 border-t border-border scroll-mt-24">
        <div className="max-w-[1400px] mx-auto py-16 md:py-24">
          <p className="mono-label text-accent mb-5">What it costs</p>
          <h2 className="display text-text max-w-3xl" style={{ fontSize: 'clamp(1.7rem, 3.6vw, 3rem)', lineHeight: 1.1 }}>
            Start with a Blueprint. Know the price before you commit to the build.
          </h2>
          <div className="mt-12">
            <OfferGrid onBlueprint={() => openBlueprint('start-pricing')} />
          </div>
        </div>
      </section>

      <ClosingBand text={start.closing} place="start-closing" />
    </>
  )
}
