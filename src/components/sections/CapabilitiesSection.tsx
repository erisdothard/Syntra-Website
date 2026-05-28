const projects = [
  {
    title: 'FreightX',
    desc: 'AI freight marketplace — matching, docs, tracking.',
    stack: ['React', 'Python', 'Supabase'],
  },
  {
    title: 'Syntra AI',
    desc: 'Agentic OS for SMBs — outreach, ops, scheduling.',
    stack: ['FastAPI', 'Claude API', 'LangGraph'],
  },
  {
    title: 'Enterprise Fintech',
    desc: 'CJIS-certified banking pipelines. OAuth 2.0.',
    stack: ['OAuth 2.0', 'Data Mapping'],
  },
  {
    title: 'AI Consulting',
    desc: 'Workflow automation and agent builds.',
    stack: ['LangChain', 'Docker', 'PostgreSQL'],
  },
]

export function CapabilitiesSection() {
  return (
    <section id="section-4" className="relative" style={{ minHeight: '200vh' }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center py-32 px-6 md:px-12 lg:px-16">
        <div className="max-w-xl bg-void/40 backdrop-blur-md rounded-2xl p-8 border border-white/5">
          <div className="relative mb-10">
            <span className="section-number">02</span>
            <p className="reveal section-label mb-4">Selected Work</p>
            <h2 className="reveal reveal-delay-1 text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight font-heading">
              Shipped<span className="text-accent">.</span>
            </h2>
          </div>
          <div className="flex flex-col gap-8">
            {projects.map((proj, i) => (
              <div key={proj.title} className={`reveal reveal-delay-${Math.min(i + 1, 4)} bg-transparent backdrop-blur-[2px] border-l border-white/10 pl-6`}>
                <h3 className="text-sm font-semibold text-white font-heading">
                  {proj.title}
                </h3>
                <p className="text-text-secondary text-xs mt-1.5 leading-relaxed">{proj.desc}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {proj.stack.map((tag) => (
                    <span key={tag} className="text-[11px] font-mono text-text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
