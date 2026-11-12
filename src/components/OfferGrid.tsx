import { offers } from '../data/portfolio'

/**
 * The three things a buyer can say yes to, with prices. Used on the home page and
 * on the addressed pages; copy and numbers come from `offers`, never from here.
 */
export function OfferGrid({ onBlueprint }: { onBlueprint: () => void }) {
  return (
    <ol className="grid lg:grid-cols-[1.25fr_1fr_1fr] gap-x-12 gap-y-10">
      {offers.map((o, i) => (
        <li key={o.name} className={`pt-6 border-t ${i === 0 ? 'border-accent' : 'border-border'}`}>
          <p className="mono-label mb-4">
            0{i + 1} · {o.name}
          </p>
          <p
            className="display text-text"
            style={{ fontSize: i === 0 ? 'clamp(2.4rem, 4.6vw, 3.8rem)' : 'clamp(1.5rem, 2.4vw, 2.1rem)', lineHeight: 1 }}
          >
            {o.price}
          </p>
          <p className={`hud mt-3 ${i === 0 ? 'text-accent' : ''}`}>{o.note}</p>
          <p className="mt-5 text-sm md:text-[15px] text-text-secondary leading-relaxed max-w-md">{o.desc}</p>
          {i === 0 && (
            <button type="button" className="btn-ghost offer-link mt-6" onClick={onBlueprint}>
              Get a Blueprint <span aria-hidden>→</span>
            </button>
          )}
        </li>
      ))}
    </ol>
  )
}
