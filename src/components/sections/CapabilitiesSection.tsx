const capabilities = [
  { label: '01', title: 'Workflow Automation', description: 'End-to-end process automation that eliminates manual bottlenecks and reduces operational overhead.' },
  { label: '02', title: 'Intelligent Pipelines', description: 'Data flows that adapt, learn, and optimize themselves — turning raw input into actionable intelligence.' },
  { label: '03', title: 'Custom Agents', description: 'Purpose-built AI agents deployed to your exact specifications — not off-the-shelf chatbot wrappers.' },
  { label: '04', title: 'System Integration', description: 'Seamless connection between your existing tools, databases, and platforms with AI at the orchestration layer.' },
]

export function CapabilitiesSection() {
  return (
    <section id="section-4" className="min-h-screen flex flex-col justify-center px-6 md:px-16 lg:px-24 py-24">
      <div className="max-w-5xl mx-auto w-full">
        <p className="reveal text-[10px] uppercase tracking-[0.3em] text-accent mb-4 font-mono">
          03 &mdash; Capabilities
        </p>
        <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl font-bold text-white leading-tight mb-12 font-heading">
          What we <span className="text-accent">build</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {capabilities.map((cap, i) => (
            <div key={cap.label} className={`reveal reveal-delay-${Math.min(i + 1, 4)} glass-panel p-6 md:p-8 group`}>
              <div className="flex items-start gap-4">
                <span className="text-[10px] font-mono text-accent/50 pt-1">{cap.label}</span>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-2 font-heading group-hover:text-accent transition-colors duration-300">
                    {cap.title}
                  </h3>
                  <p className="text-text-secondary text-sm md:text-base leading-relaxed">{cap.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
