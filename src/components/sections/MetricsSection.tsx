const timeline = [
  { date: '2024 – Now', role: 'Founder', org: 'Syntra AI' },
  { date: '2022 – 2024', role: 'Impl. Engineer', org: 'CPI Card Group' },
  { date: '2020 – 2022', role: 'Network Infra', org: 'Google Fiber' },
]

export function MetricsSection() {
  return (
    <section id="section-6" className="relative" style={{ minHeight: '200vh' }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center py-32 px-6 md:px-12 lg:px-16">
        <div className="max-w-xl bg-void/40 backdrop-blur-md rounded-2xl p-8 border border-white/5">
          <div className="relative mb-10">
            <span className="section-number">03</span>
            <p className="reveal section-label mb-4">About</p>
            <h2 className="reveal reveal-delay-1 text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight font-heading">
              Eris <span className="text-accent">Dothard</span>
            </h2>
          </div>
          <div className="reveal reveal-delay-2">
            {timeline.map((item, i) => (
              <div key={item.date} className={`bg-transparent backdrop-blur-[2px] border-l border-white/10 pl-6 py-3.5 ${i < timeline.length - 1 ? 'mb-4' : ''}`}>
                <p className="text-sm font-semibold text-white">{item.role}</p>
                <p className="text-xs text-text-secondary">{item.org}</p>
                <span className="text-[11px] font-mono text-text-muted mt-1 block">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
