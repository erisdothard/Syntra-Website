interface ServicesSectionProps {
  onTabOpen: (tab: 'portfolio' | 'services' | 'resume') => void
}

export function ServicesSection({ onTabOpen }: ServicesSectionProps) {
  return (
    <section id="section-3b" className="relative min-h-[140vh] py-32">
      <div className="flex items-center justify-end pl-5 pr-5 md:pl-10 md:pr-10 lg:pl-12 lg:pr-12">
        <div id="services-text" className="relative max-w-xl">
          <span className="section-number" style={{ left: 'auto', right: '-0.05em' }}>02</span>
          <p className="section-label mb-4">Core Infrastructure Offerings</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight font-heading mb-10">
            What we deploy.
          </h2>

          {/* Service items — transparent cards with left-accent borders */}
          <div className="flex flex-col gap-6">
            <div className="border-l-2 border-accent/40 pl-6">
              <h3 className="text-sm font-bold text-white font-heading tracking-wide uppercase mb-2">
                01 / Integration
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed max-w-md">
                Cross-stack API orchestration and robust data pipelines built for
                zero operational friction. We lead complex integration projects
                from initial data discovery straight through production go-live,
                ensuring flawless interoperability between your core databases
                and third-party networks.
              </p>
            </div>

            <div className="border-l-2 border-accent/40 pl-6">
              <h3 className="text-sm font-bold text-white font-heading tracking-wide uppercase mb-2">
                02 / Automation
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed max-w-md">
                Custom, resilient business logic engineered natively in Python
                and TypeScript. We eliminate structural overhead by constructing
                secure background automation networks, multi-point n8n workflows,
                low-latency LLM routing, and specialized voice-AI communication
                agents.
              </p>
            </div>

            <div className="border-l-2 border-accent/40 pl-6">
              <h3 className="text-sm font-bold text-white font-heading tracking-wide uppercase mb-2">
                03 / Applications
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed max-w-md">
                High-performance web endpoints and mobile applications built to
                serve as the visual user interface for your automation suite.
                Backed by proven experience building commercial-grade platforms
                like FreightX&mdash;integrating live telemetry, automated billing,
                and compliance verification layers.
              </p>
            </div>
          </div>

          <button onClick={() => onTabOpen('services')} className="cta-initialize mt-10 inline-flex items-center gap-2">
            Start Building <span className="text-lg">&rarr;</span>
          </button>
        </div>
      </div>
    </section>
  )
}
