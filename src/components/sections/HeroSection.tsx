export function HeroSection() {
  return (
    <section id="section-1" className="h-screen relative px-8 md:px-16 lg:px-18">
      {/* Top-left quadrant: title + name + hook + CTA */}
      <div className="absolute top-28 md:top-32 left-8 md:left-16 lg:left-18 max-w-md">
        <p className="section-label text-white/70 tracking-widest text-[11px] font-mono uppercase mb-5 leading-relaxed">
          Founder &amp; Integrations Engineer
        </p>
        <h1 className="text-5xl md:text-6xl font-bold text-white leading-[0.9] tracking-tight font-heading">
          Eris
          <br />
          Dothard
        </h1>
        <p className="mt-6 text-text-secondary text-base md:text-lg leading-relaxed">
          we build automated infrastructure.
        </p>
        <a href="mailto:agent@syntraai.tech" className="cta-initialize mt-8 inline-flex items-center gap-2">
          Start a Project <span className="text-lg">&rarr;</span>
        </a>
      </div>

      {/* Bottom-center: scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <div className="reveal reveal-delay-3 flex flex-col items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent/50">Scroll</span>
          <svg className="scroll-chevron-svg" width="14" height="8" viewBox="0 0 14 8" fill="none">
            <path d="M1 1L7 7L13 1" stroke="rgba(0,182,122,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  )
}
