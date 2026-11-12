import { offers } from '../../data/portfolio'
import { blueprint } from '../content'
import { Band, ClosingBand, PageHero, PointList } from '../SiteLayout'
import { useBlueprint } from '../useBlueprint'

export function Blueprint() {
  const openBlueprint = useBlueprint()
  const offer = offers[0]
  return (
    <>
      <PageHero eyebrow={blueprint.eyebrow} headline={blueprint.headline} lead={offer.desc}>
        <button type="button" className="btn-primary" onClick={() => openBlueprint('blueprint-hero')}>
          <span>Get a Blueprint</span>
          <span aria-hidden>→</span>
        </button>
        <p className="flex items-baseline gap-4">
          <span className="display text-text" style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', lineHeight: 1 }}>
            {offer.price}
          </span>
          <span className="hud text-accent">{offer.note}</span>
        </p>
      </PageHero>

      <Band n="01" title={blueprint.looksAtTitle}>
        <PointList points={blueprint.looksAt} />
      </Band>

      <Band n="02" title={blueprint.receiveTitle}>
        <PointList points={blueprint.receive} />
      </Band>

      <Band n="03" title="What comes after">
        <ul className="grid md:grid-cols-2 gap-x-12 gap-y-9">
          {offers.slice(1).map((o) => (
            <li key={o.name} className="border-t border-border pt-5">
              <p className="mono-label mb-3">{o.name}</p>
              <p className="display text-text" style={{ fontSize: 'clamp(1.4rem, 2.2vw, 1.9rem)', lineHeight: 1 }}>
                {o.price}
              </p>
              <p className="hud mt-3">{o.note}</p>
              <p className="mt-4 text-sm md:text-[15px] text-text-secondary leading-relaxed max-w-md">{o.desc}</p>
            </li>
          ))}
        </ul>
      </Band>

      <ClosingBand text={blueprint.closing} place="blueprint-closing" />
    </>
  )
}
