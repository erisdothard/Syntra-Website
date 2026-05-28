import { useState } from 'react'

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

const timeline = [
  { date: '2024 – Now', role: 'Founder', org: 'Syntra AI' },
  { date: '2022 – 2024', role: 'Impl. Engineer', org: 'CPI Card Group' },
  { date: '2020 – 2022', role: 'Network Infra', org: 'Google Fiber' },
]

const services = [
  {
    title: 'AI Workflow Automation',
    desc: 'Agents, pipelines, and integrations that replace manual ops.',
  },
  {
    title: 'Custom Software',
    desc: 'AI-embedded apps, dashboards, and internal tools.',
  },
  {
    title: 'Ongoing Retainer',
    desc: 'Maintenance, monitoring, and iteration on shipped systems.',
  },
]

export function PortfolioServicesSection() {
  const [tab, setTab] = useState<'portfolio' | 'services'>('portfolio')

  return (
    <section id="section-4" className="relative" style={{ minHeight: '200vh' }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center py-32 px-6 md:px-12 lg:px-16">
        <div className="max-w-md bg-void/40 backdrop-blur-md rounded-2xl p-6 border border-white/5">
          {/* Tabs */}
          <div className="flex gap-6 mb-6 border-b border-white/10 pb-3">
            <button
              onClick={() => setTab('portfolio')}
              className={`text-sm font-heading font-semibold pb-1 transition-colors ${
                tab === 'portfolio'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setTab('services')}
              className={`text-sm font-heading font-semibold pb-1 transition-colors ${
                tab === 'services'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Services
            </button>
          </div>

          {/* Portfolio Tab */}
          {tab === 'portfolio' && (
            <div className="flex flex-col gap-5">
              {projects.map((proj) => (
                <div key={proj.title} className="border-l border-white/10 pl-4">
                  <h3 className="text-sm font-semibold text-white font-heading">{proj.title}</h3>
                  <p className="text-text-secondary text-xs mt-1 leading-relaxed">{proj.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {proj.stack.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono text-text-muted">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t border-white/10 pt-4 mt-1">
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-3">Experience</p>
                {timeline.map((item, i) => (
                  <div key={item.date} className={`pl-4 border-l border-white/10 ${i < timeline.length - 1 ? 'pb-3' : ''}`}>
                    <p className="text-xs font-semibold text-white">{item.role}</p>
                    <p className="text-[11px] text-text-secondary">{item.org}</p>
                    <span className="text-[10px] font-mono text-text-muted">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services Tab */}
          {tab === 'services' && (
            <div className="flex flex-col gap-5">
              {services.map((svc) => (
                <div key={svc.title} className="border-l border-accent/30 pl-4">
                  <h3 className="text-sm font-semibold text-white font-heading">{svc.title}</h3>
                  <p className="text-text-secondary text-xs mt-1 leading-relaxed">{svc.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
