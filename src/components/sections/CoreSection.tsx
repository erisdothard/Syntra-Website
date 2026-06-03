interface CoreSectionProps {
  onTabOpen: (tab: 'portfolio' | 'services' | 'resume') => void
}

export function CoreSection({ onTabOpen }: CoreSectionProps) {
  return (
    <section id="section-3" className="relative min-h-screen py-32">
      <div className="flex items-center pl-5 pr-5 md:pl-10 md:pr-10 lg:pl-12 lg:pr-12">
        {/* Left-aligned heavy typography column — canvas slides right via GSAP */}
        <div id="agentic-text" className="relative max-w-xl">
          <span className="section-number">01</span>
          <p className="section-label mb-4">The Operator</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight font-heading">
            Systemic integration
            <br />
            is the core of automation.
          </h2>
          <p className="mt-6 text-text-secondary text-base md:text-lg leading-relaxed max-w-md">
            Engineered by technical operators with a deep background in
            high-stakes logistics and enterprise data infrastructure. We
            specialize in cross-stack interoperability, building resilient data
            highways that connect legacy backbones directly to autonomous AI
            engines.
          </p>
          <button onClick={() => onTabOpen('services')} className="cta-initialize mt-10 inline-flex items-center gap-2">
            Initialize System <span className="text-lg">&rarr;</span>
          </button>
        </div>
      </div>
    </section>
  )
}
