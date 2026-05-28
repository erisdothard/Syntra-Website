export function HeroSection() {
  return (
    <section id="section-1" className="h-screen flex flex-col justify-end pb-24 md:pb-32 px-6 md:px-12 lg:px-16">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <div>
          <p className="reveal section-label mb-3">Founder, Syntra AI</p>
          <h1 className="reveal reveal-delay-1 text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.9] tracking-tight font-heading">
            Eris
            <br />
            <span className="text-accent">Dothard</span>
          </h1>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <a href="#section-4" className="reveal reveal-delay-2 cta-primary inline-flex items-center gap-2 px-8 py-3.5 bg-accent text-void font-semibold text-sm rounded-full w-fit">
            See Our Work &rarr;
          </a>
          <a href="#section-7" className="reveal reveal-delay-3 inline-flex items-center gap-2 px-8 py-3.5 border border-border text-text-secondary font-medium text-xs rounded-full hover:border-accent hover:text-accent transition-colors duration-300 w-fit">
            Get Started
          </a>
        </div>
      </div>
    </section>
  )
}
