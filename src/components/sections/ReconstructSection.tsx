export function ReconstructSection() {
  return (
    <section id="section-7" className="h-screen flex flex-col items-center justify-center text-center px-6 relative">
      <p className="reveal text-[10px] uppercase tracking-[0.3em] text-accent mb-4 font-mono">
        06 &mdash; Rebuild
      </p>
      <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 font-heading">
        Built to <span className="text-accent">scale.</span>
      </h2>
      <p className="reveal reveal-delay-2 text-text-secondary max-w-md text-base md:text-lg mb-10 leading-relaxed">
        Every layer reconnects. Tighter, smarter, automated. Your operations — running on intelligence.
      </p>
      <a href="mailto:eris@syntra.ai" className="cta-primary reveal reveal-delay-3 inline-flex items-center gap-2 px-10 py-4 bg-accent text-void font-semibold text-sm rounded-full">
        Get in Touch
      </a>
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <p className="text-text-secondary/30 text-[10px] font-mono tracking-[0.2em] uppercase">Syntra AI &mdash; 2026</p>
      </div>
    </section>
  )
}
