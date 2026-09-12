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
          {act.specs && (
            <dl className={`spec-list tone-${act.tone} ${right ? 'is-right' : ''}`}>
              {act.specs.map((spec) => (
                <div key={spec.label} className="spec-row">
                  <dt className="spec-label">{spec.label}</dt>
                  <dd className="spec-value">{spec.values.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}
