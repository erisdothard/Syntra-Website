export function HeroSection() {
  return (
    <section id="section-1" className="h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="reveal text-[10px] uppercase tracking-[0.3em] text-accent mb-6 font-mono">
        AI Systems Engineering
      </p>
      <h1 className="reveal reveal-delay-1 text-6xl md:text-8xl lg:text-9xl font-bold text-white leading-none tracking-tight font-heading">
        SYNTRA
      </h1>
      <p className="reveal reveal-delay-2 mt-6 text-text-secondary max-w-md text-base md:text-lg leading-relaxed">
        Intelligent systems that automate, optimize, and scale your business operations.
      </p>
      <div className="reveal reveal-delay-3 mt-16 flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.3em] font-mono text-text-secondary/40">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-accent to-transparent animate-pulse" />
      </div>
    </section>
  )
}
