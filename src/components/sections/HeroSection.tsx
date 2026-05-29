export function HeroSection() {
  return (
    <section id="section-1" className="h-screen relative px-6 md:px-12 lg:px-16">
      {/* Top-left quadrant: subtitle + dominant name */}
      <div className="absolute top-28 md:top-32 left-6 md:left-12 lg:left-16">
        <p className="reveal section-label text-[#00FFCC] tracking-widest text-[11px] font-mono uppercase mb-3 opacity-90">
          Founder &amp; Integrations Engineer
        </p>
        <h1 className="reveal reveal-delay-1 text-5xl md:text-6xl font-bold text-white leading-[0.9] tracking-tight font-heading">
          Eris
          <br />
          Dothard
        </h1>
      </div>

      {/* Bottom-right: tagline + grouped CTAs */}
      <div className="absolute bottom-24 md:bottom-32 right-6 md:right-12 lg:right-16 text-right max-w-md">
        <p className="reveal text-sm md:text-base text-text-secondary leading-relaxed mb-8 font-body">
          <span className="text-white font-semibold font-heading">Syntra AI</span>{' '}
          &mdash; Architecting autonomous operations for enterprise&nbsp;scaling.
        </p>
        <div className="flex flex-col gap-3 items-end">
          <a
            href="#section-4"
            className="reveal reveal-delay-2 cta-primary inline-flex items-center gap-2 px-8 py-3.5 bg-accent text-void font-semibold text-sm rounded-full"
          >
            See Our Work &rarr;
          </a>
          <a
            href="#section-5"
            className="reveal reveal-delay-3 inline-flex items-center gap-2 px-8 py-3.5 border border-white/10 text-text-secondary font-medium text-xs rounded-full hover:border-[#00FFCC]/50 hover:text-[#00FFCC] transition-colors duration-300"
          >
            Get Started
          </a>
        </div>
      </div>
    </section>
  )
}
