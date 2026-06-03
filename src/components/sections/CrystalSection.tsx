export function CrystalSection() {
  return (
    <section id="section-4" className="h-screen relative flex items-start pt-32 px-6 md:px-12 lg:px-16">
      <div className="max-w-lg">
        <p className="section-label mb-4">Buy the Blueprint. Skip the Engineering Cycle.</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight font-heading mb-8">
          Digital Products<span className="text-accent">.</span>
        </h2>

        <div className="flex flex-col gap-5">
          <div className="border-l-2 border-accent/40 pl-6">
            <h3 className="text-sm font-bold text-white font-heading tracking-wide mb-1">
              The 3D Scrollytelling Boilerplate
              <span className="text-accent ml-2 font-mono text-xs">$199</span>
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed max-w-md">
              The exact React + R3F + GSAP framework used to drive this website.
              Built for freelancers and creative agencies looking to link premium
              hardware-accelerated vertex rotations directly to scroll depth.
            </p>
          </div>

          <div className="border-l-2 border-accent/40 pl-6">
            <h3 className="text-sm font-bold text-white font-heading tracking-wide mb-1">
              Pydantic Agentic Data Setup
              <span className="text-accent ml-2 font-mono text-xs">$149</span>
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed max-w-md">
              Production-grade, type-safe LLM structured data extraction
              templates. Includes strict validation schemas, automated retry
              logic, and multi-agent handoff frameworks to eliminate LLM
              hallucinations in production.
            </p>
          </div>

          <div className="border-l-2 border-accent/40 pl-6">
            <h3 className="text-sm font-bold text-white font-heading tracking-wide mb-1">
              Niche Automation Blueprints
              <span className="text-accent ml-2 font-mono text-xs">$99</span>
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed max-w-md">
              Pre-packaged, cross-stack n8n and Make.com operational workflows.
              Includes the raw JSON import files, Airtable schema architectures,
              and video implementation setup guides.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
