export function CoreSection() {
  return (
    <section id="section-3" className="h-screen flex flex-col justify-center items-end px-6 md:px-16 lg:px-24">
      <div className="max-w-3xl text-right">
        <p className="reveal text-[10px] uppercase tracking-[0.3em] text-accent mb-4 font-mono">
          02 &mdash; The Core
        </p>
        <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 font-heading">
          AI at the <span className="text-accent">center</span>
        </h2>
        <p className="reveal reveal-delay-2 text-text-secondary text-base md:text-lg leading-relaxed max-w-lg ml-auto">
          Autonomous agents, intelligent pipelines, production-grade systems. Not chatbot wrappers — real infrastructure.
        </p>
      </div>
    </section>
  )
}
