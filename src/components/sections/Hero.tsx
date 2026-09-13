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
            Syntra AI · Software · Data · AI
          </p>
          {/* One line per row down to 390px. The longest line measures 9.5x the
              font size in Space Grotesk 700, against an available width of
              min(1400, vw - 2 * gutter) — so the cap and the vw factor are both
              derived, not guessed. Re-measure if the wording or the face changes;
              Unbounded ran 14x, which is why this was 6.25rem before. */}
          <h1 className="display text-text" style={{ fontSize: 'clamp(2rem, 8.8vw, 8.5rem)' }}>
            <SplitWord text="WE" offset={0} />{' '}
            <SplitWord text="BUILD" offset={2} />{' '}
            <SplitWord text="SOFTWARE" offset={7} />
            <br />
            <span className="text-accent">
              <SplitWord text="FOR" offset={15} />{' '}
              <SplitWord text="YOUR" offset={18} />{' '}
              <SplitWord text="BUSINESS" offset={22} />
            </span>
          </h1>
          <p className="fade-up mt-8 md:mt-10 max-w-xl text-base md:text-lg text-text-secondary leading-relaxed" style={{ '--d': '600ms' } as React.CSSProperties}>
            Start with a site that works. End with a system that runs itself. You own every
            stage of it.
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
