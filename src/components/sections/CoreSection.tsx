export function CoreSection() {
  return (
    <section id="section-3" className="relative" style={{ minHeight: '130vh' }}>
      <div className="sticky top-0 h-screen flex items-center px-6 md:px-12 lg:px-16">
        {/* Left-aligned heavy typography column — canvas slides right via GSAP */}
        <div id="agentic-text" className="max-w-xl">
          <span className="section-number">01</span>
          <p className="section-label mb-4">What We Build</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight font-heading">
            Build your
            <br />
            Agentic OS.
          </h2>
          <p className="mt-6 text-text-secondary text-base md:text-lg leading-relaxed max-w-md">
            Zero overhead. Infinite capacity. Custom-built AI pipelines,
            deep-tier integrations, and autonomous workforces engineered to
            replace manual friction entirely.
          </p>
          <a href="#section-5" className="cta-initialize mt-10 inline-flex items-center gap-2">
            Initialize System <span className="text-lg">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  )
}
