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
            Syntra AI · Integration · Data · Automation
          </p>
          <h1 className="display text-text" style={{ fontSize: 'clamp(3.4rem, 11.5vw, 11rem)' }}>
            <SplitWord text="FROM" offset={0} />{' '}
            <SplitWord text="FRICTION" offset={4} />
            <br />
            <span className="text-accent">
              <SplitWord text="TO" offset={12} />{' '}
              <SplitWord text="LIFTOFF" offset={14} />
            </span>
          </h1>
          <p className="fade-up mt-8 md:mt-10 max-w-xl text-base md:text-lg text-text-secondary leading-relaxed" style={{ '--d': '600ms' } as React.CSSProperties}>
            We engineer the pipelines, automations, and integrations that take enterprise operations
            from manual friction to full thrust. Scroll to ignite.
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
