import { useEffect, useState } from 'react'

function SplitWord({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <span className="split-word">
      {text.split('').map((ch, i) => (
        <span key={i} className="split-char" style={{ '--i': offset + i } as React.CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  )
}

/** Sticky intro panel at the top of #launch. Fades as the scroll enters Act 1. */
export function Hero() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 150)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div
      data-act="0"
      className={`act-panel is-active ${ready ? 'is-ready' : ''}`}
    >
      <div className="relative w-full px-6 md:px-12 lg:px-16 pointer-events-none">
        <div className="max-w-[1400px] mx-auto">
          <p className="mono-label fade-up mb-6" style={{ '--d': '80ms' } as React.CSSProperties}>
            Syntra AI · Nashville
          </p>
          {/* One line per row down to 390px. "WE BUILD SOFTWARE" measured 13.4x the
              font size in Unbounded 900; "WE BUILD THE ROCKET." is 20 chars to
              its 17, so the cap and vw factor are scaled by 17/20 against an
              available width of min(1400, vw - 2 * gutter). Re-measure if the
              wording changes length. */}
          <h1 className="display text-text" style={{ fontSize: 'clamp(1.3rem, 5.35vw, 5.3rem)' }}>
            <SplitWord text="WE" offset={0} />{' '}
            <SplitWord text="BUILD" offset={2} />{' '}
            <SplitWord text="THE" offset={7} />{' '}
            <SplitWord text="ROCKET." offset={10} />
            <br />
            <span className="text-accent">
              <SplitWord text="YOU" offset={17} />{' '}
              <SplitWord text="OWN" offset={20} />{' '}
              <SplitWord text="IT." offset={23} />
            </span>
          </h1>
          <p className="fade-up mt-8 md:mt-10 max-w-xl text-base md:text-lg text-text-secondary leading-relaxed" style={{ '--d': '600ms' } as React.CSSProperties}>
            Your site, your CRM and the agents inside it, built as one system and handed over.
            Your business flies on it.
          </p>
          <div className="fade-up mt-8 flex items-center gap-4" style={{ '--d': '760ms' } as React.CSSProperties}>
            <span className="block w-px h-10 bg-white/40 scroll-hint-line" />
            <span className="hud">Scroll to ignite</span>
          </div>
        </div>
      </div>
    </div>
  )
}
