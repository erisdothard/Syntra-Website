import { services } from '../../data/portfolio'
import { OfferGrid } from '../../components/OfferGrid'
import { servicesPage, start } from '../content'
import { Band, ClosingBand, PageHero, PointList } from '../SiteLayout'
import { useBlueprint } from '../useBlueprint'

export function Services() {
  const openBlueprint = useBlueprint()
  return (
    <>
      <PageHero eyebrow={servicesPage.eyebrow} headline={servicesPage.headline} lead={servicesPage.lead} prices>
        <button type="button" className="btn-primary" onClick={() => openBlueprint('services-hero')}>
          <span>Get a Blueprint</span>
          <span aria-hidden>→</span>
        </button>
        <a className="btn-ghost" href="/work">
          See shipped work <span aria-hidden>→</span>
        </a>
      </PageHero>

      <section className="px-6 md:px-12 lg:px-16 border-t border-border">
        <ol className="max-w-[1400px] mx-auto flex flex-col divide-y divide-border">
          {services.map((s, i) => (
            <li key={s.title} className="py-12 md:py-16 grid lg:grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)] gap-x-16 gap-y-5">
              <p className="mono-label">0{i + 1}</p>
              <div>
                <h2 className="display text-text" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.6rem)', lineHeight: 1.05 }}>
                  {s.title}
                </h2>
                <p className="mt-6 max-w-2xl text-base md:text-lg text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Band n="04" title={servicesPage.ownershipTitle}>
        <PointList points={servicesPage.ownership} />
      </Band>

      <Band n="05" title={servicesPage.howTitle}>
        <PointList points={servicesPage.how} numbered />
      </Band>

      <section className="px-6 md:px-12 lg:px-16 border-t border-border">
        <div className="max-w-[1400px] mx-auto py-16 md:py-24">
          <p className="mono-label text-accent mb-10">What it costs</p>
          <OfferGrid onBlueprint={() => openBlueprint('services-pricing')} />
        </div>
      </section>

      <ClosingBand text={start.closing} place="services-closing" />
    </>
  )
}
