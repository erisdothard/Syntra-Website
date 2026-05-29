interface CoreSectionProps {
  onTabOpen: (tab: 'portfolio' | 'services' | 'resume') => void
}

export function CoreSection({ onTabOpen }: CoreSectionProps) {
  return (
    <section id="section-3" className="relative min-h-screen py-40">
      <div className="flex items-center pl-5 pr-5 md:pl-10 md:pr-10 lg:pl-12 lg:pr-12">
        {/* Left-aligned heavy typography column — canvas slides right via GSAP */}
        <div id="agentic-text" className="relative max-w-xl">
          <span className="section-number">01</span>
          <p className="section-label mb-4">What We Build</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight font-heading">
            Autonomous
            <br />
            Infrastructure.
          </h2>
          <p className="mt-6 text-text-secondary text-base md:text-lg leading-relaxed max-w-md">
            Custom integration logic and agentic workflows that eliminate
            operational friction. We don&apos;t build standard software
            wrappers &mdash; we build resilient, production-ready system
            architecture designed to replace manual enterprise overhead entirely.
          </p>
          <button onClick={() => onTabOpen('services')} className="cta-initialize mt-10 inline-flex items-center gap-2">
            Initialize System <span className="text-lg">&rarr;</span>
          </button>
        </div>
      </div>
    </section>
  )
}
