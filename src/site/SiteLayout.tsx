import type { ReactNode } from 'react'
import { offers } from '../data/portfolio'
import { useBlueprint } from './useBlueprint'

const NAV = [
  { href: '/work', label: 'Work' },
  { href: '/services', label: 'Services' },
  { href: '/blueprint', label: 'Blueprint' },
]

/** Header and footer for the addressed pages: plain links, no scroll choreography, no 3D. */
export function SiteLayout({ path, children }: { path: string; children: ReactNode }) {
  const openBlueprint = useBlueprint()
  const link = (href: string) =>
    `inline-block py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 hover:text-text ${
      path === href || path.startsWith(`${href}/`) ? 'text-text' : 'text-text-secondary'
    }`

  return (
    <>
      <a href="#main" className="site-skip">
        Skip to content
      </a>
      <header className="site-header">
        <div className="px-6 md:px-12 lg:px-16">
          <div className="mx-auto max-w-[1400px] flex items-center justify-between py-2.5">
            <a href="/" className="py-3 display text-text text-[13px] tracking-[0.12em] flex items-center gap-3">
              <span className="inline-block w-2 h-2 rounded-full bg-accent shadow-[0_0_12px_rgba(255,106,26,0.8)]" />
              SYNTRA AI
            </a>
            <nav aria-label="Main navigation" className="flex items-center gap-6 lg:gap-9">
              <ul className="hidden sm:flex items-center gap-6 lg:gap-9">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className={link(n.href)} aria-current={path === n.href ? 'page' : undefined}>
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
              <button type="button" className="nav-cta" onClick={() => openBlueprint('header')}>
                Get a Blueprint
              </button>
            </nav>
          </div>
          {/* Phones: the three links get their own row instead of a menu to open. */}
          <ul className="sm:hidden mx-auto max-w-[1400px] flex gap-7 pb-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} className={link(n.href)} aria-current={path === n.href ? 'page' : undefined}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main id="main" className="site-main">
        {children}
      </main>

      <footer className="px-6 md:px-12 lg:px-16 pb-10 border-t border-border">
        <div className="max-w-[1400px] mx-auto pt-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex flex-col gap-1">
            <a href="/" className="display text-text text-sm tracking-wide">
              SYNTRA AI
            </a>
            <span className="hud">Software · Automation · Integration · Nashville, TN</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <a className="btn-ghost py-3" href="/start">Start</a>
            {NAV.map((n) => (
              <a key={n.href} className="btn-ghost py-3" href={n.href}>
                {n.label}
              </a>
            ))}
            <a className="btn-ghost py-3" href="mailto:agent@syntraai.tech">agent@syntraai.tech</a>
          </div>
          <div className="flex gap-6">
            <a className="hud hover:text-text transition-colors" href="/privacy.html">Privacy</a>
            <a className="hud hover:text-text transition-colors" href="/terms.html">Terms</a>
            <span className="hud">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </>
  )
}

/** The three prices on one line, so no page opens without saying what it costs. */
function PriceStrip() {
  return (
    <dl className="site-prices">
      {offers.map((o) => (
        <div key={o.name}>
          <dt className="hud">{o.name}</dt>
          <dd className="display text-text">{o.price}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Page opening: eyebrow, headline, lead, actions. `art` puts the launch still behind
 * it, `prices` adds the price strip, `compact` shortens the drop into the first section.
 */
export function PageHero({
  eyebrow,
  headline,
  lead,
  art = false,
  prices = false,
  compact = false,
  children,
}: {
  eyebrow: string
  headline: string
  lead?: ReactNode
  art?: boolean
  prices?: boolean
  compact?: boolean
  children?: ReactNode
}) {
  return (
    <section className={`site-hero ${art ? 'site-hero--art' : ''} ${compact ? 'site-hero--compact' : ''}`}>
      <div className="relative px-6 md:px-12 lg:px-16">
        <div className="max-w-[1400px] mx-auto">
          <p className="mono-label text-accent mb-6">{eyebrow}</p>
          <h1 className="display text-text max-w-5xl" style={{ fontSize: 'clamp(2.1rem, 5.4vw, 4.6rem)', lineHeight: 1 }}>
            {headline}
          </h1>
          {lead && <p className="mt-8 max-w-2xl text-base md:text-lg text-text-secondary leading-relaxed">{lead}</p>}
          {children && <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">{children}</div>}
          {prices && <PriceStrip />}
        </div>
      </div>
      {!art && <div className="site-hero-rule" aria-hidden />}
    </section>
  )
}

/** A ruled section: numbered label on the left, content on the right. */
export function Band({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="px-6 md:px-12 lg:px-16 border-t border-border">
      <div className="max-w-[1400px] mx-auto py-16 md:py-24 grid lg:grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)] gap-x-16 gap-y-8">
        <div>
          <p className="mono-label mb-3">{n}</p>
          <h2 className="display text-text" style={{ fontSize: 'clamp(1.35rem, 2.2vw, 1.9rem)', lineHeight: 1.08 }}>
            {title}
          </h2>
        </div>
        <div>{children}</div>
      </div>
    </section>
  )
}

/** Title-and-text rows separated by hairlines. */
export function PointList({ points, numbered = false }: { points: { title: string; text: string }[]; numbered?: boolean }) {
  return (
    <ul className="grid md:grid-cols-2 gap-x-12 gap-y-9">
      {points.map((p, i) => (
        <li key={p.title} className="border-t border-border pt-5">
          {numbered && <p className="hud mb-3">Step 0{i + 1}</p>}
          <h3 className="display text-text text-base md:text-lg mb-3" style={{ lineHeight: 1.15 }}>
            {p.title}
          </h3>
          <p className="text-sm md:text-[15px] text-text-secondary leading-relaxed max-w-md">{p.text}</p>
        </li>
      ))}
    </ul>
  )
}

/** The closing ask on every page. */
export function ClosingBand({ text, place }: { text: string; place: string }) {
  const openBlueprint = useBlueprint()
  return (
    <section className="px-6 md:px-12 lg:px-16 border-t border-border">
      <div className="max-w-[1400px] mx-auto py-20 md:py-28">
        <p className="display text-text max-w-3xl" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.8rem)', lineHeight: 1.1 }}>
          {text}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
          <button type="button" className="btn-primary" onClick={() => openBlueprint(place)}>
            <span>Get a Blueprint</span>
            <span aria-hidden>→</span>
          </button>
          <a className="btn-ghost" href="mailto:agent@syntraai.tech">
            or email agent@syntraai.tech
          </a>
        </div>
      </div>
    </section>
  )
}
