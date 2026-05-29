export function ServicesSection() {
  return (
    <section id="section-3b" className="relative" style={{ minHeight: '130vh' }}>
      <div className="sticky top-0 h-screen flex items-center justify-end pl-5 pr-5 md:pl-10 md:pr-10 lg:pl-12 lg:pr-12" style={{ willChange: 'transform' }}>
        {/* Right-aligned text column — mirrors CoreSection but on opposite side */}
        <div id="services-text" className="relative max-w-xl text-right">
          <span className="section-number" style={{ left: 'auto', right: '-0.05em' }}>02</span>
          <p className="section-label mb-4">How We Engineer</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight font-heading">
            Complex systems.
            <br />
            Proven builds.
          </h2>
          <p className="mt-6 text-text-secondary text-base md:text-lg leading-relaxed">
            FreightX &mdash; a multi-role freight marketplace. CJIS-certified
            banking pipelines with OAuth 2.0 data mapping. Logistics automation
            that moves real cargo. We build where the integrations are hard
            and the stakes are enterprise-grade.
          </p>
          <a href="#section-5" className="cta-initialize mt-10 inline-flex items-center gap-2">
            Start Building <span className="text-lg">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  )
}
