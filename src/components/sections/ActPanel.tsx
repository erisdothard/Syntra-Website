import type { Act } from '../../data/acts'

/**
 * Sticky, scroll-toggled narrative panel. Visibility is flipped by
 * useLaunchScroll via the `is-active` class; the CSS handles the reveal.
 */
export function ActPanel({ act }: { act: Act }) {
  const right = act.align === 'right'
  return (
    <div data-act={act.n} className="act-panel">
      <div className={`relative w-full px-6 md:px-12 lg:px-16 ${right ? 'md:flex md:justify-end' : ''}`}>
        <div className={`act-inner relative max-w-xl ${right ? 'md:text-right' : ''}`}>
          <span className="act-number" style={right ? { right: '-0.1em', top: '-0.55em' } : { left: '-0.1em', top: '-0.55em' }}>
            0{act.n}
          </span>
          <p className={`mono-label mb-5 ${act.tone === 'data' ? 'text-data' : act.tone === 'hot' ? 'text-accent-hot' : 'text-accent'}`}>
            {act.label}
          </p>
          <h2 className="display text-text" style={{ fontSize: 'clamp(2.2rem, 5.6vw, 5rem)' }}>
            {act.headline}
          </h2>
          <p className="mt-6 text-base md:text-lg text-text-secondary leading-relaxed">{act.body}</p>
          <div className={`mt-7 flex flex-wrap gap-2 ${right ? 'md:justify-end' : ''}`}>
            {act.chips.map((c) => (
              <span key={c} className={`chip tone-${act.tone}`}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
