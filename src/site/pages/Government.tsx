import { DEMO_TOPICS, useDemoRequest } from '../../components/demo-request/context'
import { OfferGrid } from '../../components/OfferGrid'
import { track } from '../../lib/analytics'
import { projects } from '../../data/portfolio'
import { caseStudies, government } from '../content'
import { Band, PageHero, PointList } from '../SiteLayout'

/** The page a public-sector buyer lands on: plain, complete, and written for a purchasing file. */
export function Government() {
  const requestDemo = useDemoRequest()
  const requestQuote = (place: string) => {
    track('quote_cta_clicked', { place })
    requestDemo(DEMO_TOPICS.quote)
  }
  return (
    <>
      <PageHero eyebrow={government.eyebrow} headline={government.headline} lead={government.lead} prices>
        <button type="button" className="btn-primary" onClick={() => requestQuote('government-hero')}>
          <span>Request a quote</span>
          <span aria-hidden>→</span>
        </button>
        <a className="btn-ghost" href="/work">
          See work in production <span aria-hidden>→</span>
        </a>
      </PageHero>

      <Band n="01" title={government.buildTitle}>
        <PointList points={government.build} />
      </Band>

      <Band n="02" title={government.buyTitle}>
        <PointList points={government.buy} />
      </Band>

      <Band n="03" title={government.experienceTitle}>
        <PointList points={government.experience} />
      </Band>

      <Band n="04" title={government.workTitle}>
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {caseStudies.map((c) => {
            const live = projects.find((p) => p.title === c.project)?.live
            return (
              <li key={c.slug} className="py-5 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] gap-x-8 gap-y-2 items-baseline">
                <a href={`/work/${c.slug}`} className="display text-text text-base md:text-lg hover:text-accent transition-colors duration-300">
                  {c.project}
                </a>
                <span className="text-sm text-text-secondary">{c.kind}</span>
                {live ? (
                  <a className="hud hover:text-text transition-colors" href={live} target="_blank" rel="noopener noreferrer">
                    Live site <span aria-hidden>↗</span>
                  </a>
                ) : (
                  <span />
                )}
              </li>
            )
          })}
        </ul>
      </Band>

      <Band n="05" title={government.enterpriseTitle}>
        <PointList points={government.enterprise} />
        <p className="mt-10 max-w-2xl text-sm text-text-secondary leading-relaxed border-l border-accent pl-4">{government.enterpriseNote}</p>
      </Band>

      <Band n="06" title={government.safeguardsTitle}>
        <PointList points={government.safeguards} />
      </Band>

      <section id="pricing" className="px-6 md:px-12 lg:px-16 border-t border-border scroll-mt-24">
        <div className="max-w-[1400px] mx-auto py-16 md:py-24">
          <p className="mono-label text-accent mb-10">Published prices</p>
          <OfferGrid items={government.offers} cta="Request a quote" onBlueprint={() => requestQuote('government-pricing')} />
        </div>
      </section>

      <Band n="07" title={government.classificationTitle}>
        <PointList points={government.classification} />
      </Band>

      <section className="px-6 md:px-12 lg:px-16 border-t border-border">
        <div className="max-w-[1400px] mx-auto py-20 md:py-28">
          <p className="display text-text max-w-3xl" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.8rem)', lineHeight: 1.1 }}>
            {government.closing}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
            <button type="button" className="btn-primary" onClick={() => requestQuote('government-closing')}>
              <span>Request a quote</span>
              <span aria-hidden>→</span>
            </button>
            <a className="btn-ghost" href={government.phone.href}>
              call {government.phone.display}
            </a>
            <a className="btn-ghost" href="mailto:erisdothard@syntraai.tech">
              or email erisdothard@syntraai.tech
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
