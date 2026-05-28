import { useEffect, useState } from 'react'

const projects = [
  {
    title: 'FreightX',
    desc: 'Multi-role SaaS freight marketplace with AI-driven load matching, document automation, and real-time tracking.',
    stack: ['React', 'TypeScript', 'Python', 'Supabase'],
    featured: true,
  },
  {
    title: 'Syntra AI',
    desc: 'Agentic OS for SMBs — voice agents, automated outreach, ops scheduling, and lead generation pipelines.',
    stack: ['FastAPI', 'Claude API', 'LangGraph', 'SendGrid'],
    featured: true,
  },
  {
    title: 'BridgeLink HL7/FHIR',
    desc: 'Healthcare interoperability — HL7 v2.5 messages and FHIR R4 resources via Mirth Connect.',
    stack: ['HL7 v2.5', 'FHIR R4', 'Mirth Connect', 'PostgreSQL'],
    featured: false,
  },
  {
    title: 'CPI Card Group',
    desc: 'CJIS-certified banking pipelines. OAuth 2.0, XML/CSV/JSON mapping, SFTP batch automation.',
    stack: ['OAuth 2.0', 'SQL', 'SFTP', 'ETL'],
    featured: false,
  },
]

const timeline = [
  { date: '2025 – Present', role: 'Founder & Technical Lead', org: 'Syntra' },
  { date: '2021 – 2026', role: 'Integration Engineer', org: 'CPI Card Group' },
  { date: '2019 – 2021', role: 'Tier 2 Technical Support', org: 'Google Fiber' },
]

const certifications = [
  'Claude 101',
  'Building with the Claude API',
  'Introduction to MCP',
  'MCP Advanced Topics',
  'Claude Code in Action',
]

const services = [
  {
    title: 'AI Workflow Automation',
    desc: 'Agents, pipelines, and integrations that replace manual ops. From intake to execution — no human in the loop.',
  },
  {
    title: 'Custom Software',
    desc: 'AI-embedded apps, dashboards, and internal tools built to your exact workflow.',
  },
  {
    title: 'Ongoing Retainer',
    desc: 'Maintenance, monitoring, and iteration on shipped systems. We stay in the loop.',
  },
]

/* ── shared card style (no overflow:hidden so nothing clips) ── */
const card: React.CSSProperties = {
  background: 'rgba(19, 20, 26, 0.55)',
  backdropFilter: 'blur(20px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 14,
  transition: 'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1)',
}

const cardHoverProps = {
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.borderColor = 'rgba(0,182,122,0.2)'
    el.style.boxShadow = '0 8px 40px rgba(0,182,122,0.07), inset 0 1px 0 rgba(255,255,255,0.04)'
    el.style.transform = 'translateY(-2px)'
  },
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.borderColor = 'rgba(255,255,255,0.06)'
    el.style.boxShadow = 'none'
    el.style.transform = 'translateY(0)'
  },
}

function stagger(visible: boolean, i: number, base = 0.12): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(18px)',
    transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
    transitionDelay: `${base + i * 0.07}s`,
  }
}

/* ════════════════════════════════════════════════════════════════ */

interface TabOverlayProps {
  activeTab: 'portfolio' | 'services' | null
  onClose: () => void
}

export function TabOverlay({ activeTab, onClose }: TabOverlayProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!activeTab) { setVisible(false); return }
    requestAnimationFrame(() => setVisible(true))

    const canvas = document.getElementById('scene-canvas')
    document.body.style.overflow = 'hidden'
    if (canvas) {
      canvas.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1)'
      canvas.style.opacity = '0.1'
    }
    return () => {
      document.body.style.overflow = ''
      if (canvas) canvas.style.opacity = '1'
    }
  }, [activeTab])

  if (!activeTab) return null

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto"
      style={{
        background: visible
          ? 'radial-gradient(ellipse at 50% 0%, rgba(0,182,122,0.03) 0%, rgba(8,10,13,0.98) 50%, rgba(8,10,13,0.99) 100%)'
          : 'rgba(8,10,13,0)',
        transition: 'background 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* ── close button ── */}
      <button
        onClick={onClose}
        className="fixed top-5 right-8 md:right-12 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 text-text-muted hover:text-white hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 text-lg z-50"
        aria-label="Close"
      >
        &times;
      </button>

      {/* ── centered content column ── */}
      <div
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '7rem 2.5rem 5rem',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
          transitionDelay: '0.08s',
        }}
      >
        {activeTab === 'portfolio' && <PortfolioContent visible={visible} />}
        {activeTab === 'services' && <ServicesContent visible={visible} />}
      </div>
    </div>
  )
}

/* ═══════════════ PORTFOLIO ═══════════════ */

function PortfolioContent({ visible }: { visible: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

      {/* header */}
      <header style={{ textAlign: 'center' }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Selected Work</p>
        <h2 className="font-heading" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Portfolio<span style={{ color: 'var(--color-accent)' }}>.</span>
        </h2>
      </header>

      {/* ── project cards — 2-col bento ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}>
        {projects.map((proj, i) => (
          <div
            key={proj.title}
            style={{
              ...card,
              padding: '1.75rem 1.75rem 1.5rem',
              borderTop: proj.featured ? '2px solid rgba(0,182,122,0.35)' : '1px solid rgba(255,255,255,0.06)',
              ...stagger(visible, i, 0.15),
            }}
            {...cardHoverProps}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className="font-mono" style={{ fontSize: 10, color: 'rgba(0,182,122,0.5)', letterSpacing: '0.15em' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {proj.featured && (
                <span style={{ fontSize: 9, color: 'var(--color-accent)', background: 'rgba(0,182,122,0.08)', border: '1px solid rgba(0,182,122,0.15)', borderRadius: 20, padding: '2px 8px' }} className="font-mono">
                  FEATURED
                </span>
              )}
            </div>
            <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: 6 }}>
              {proj.title}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              {proj.desc}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {proj.stack.map((tag) => (
                <span
                  key={tag}
                  className="font-mono"
                  style={{ fontSize: 10, color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '3px 10px' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── experience + certs row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>

        {/* experience */}
        <div style={{ ...card, padding: '1.5rem 1.75rem', ...stagger(visible, 4, 0.15) }} {...cardHoverProps}>
          <p className="font-mono" style={{ fontSize: 10, color: 'rgba(0,182,122,0.55)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>
            Experience
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {timeline.map((item, i) => (
              <div key={item.date} style={{ paddingLeft: 16, borderLeft: i === 0 ? '2px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.role}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{item.org}</p>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{item.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* certifications */}
        <div style={{ ...card, padding: '1.5rem 1.75rem', ...stagger(visible, 5, 0.15) }} {...cardHoverProps}>
          <p className="font-mono" style={{ fontSize: 10, color: 'rgba(0,182,122,0.55)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>
            Certifications — Anthropic
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {certifications.map((cert, i) => (
              <div key={cert} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  className="font-mono"
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'rgba(0,182,122,0.08)', border: '1px solid rgba(0,182,122,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'var(--color-accent)', flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ SERVICES ═══════════════ */

function ServicesContent({ visible }: { visible: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

      {/* header */}
      <header style={{ textAlign: 'center' }}>
        <p className="section-label" style={{ marginBottom: 8 }}>What We Offer</p>
        <h2 className="font-heading" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Services<span style={{ color: 'var(--color-accent)' }}>.</span>
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 10, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          End-to-end AI systems — from strategy through implementation to ongoing support.
        </p>
      </header>

      {/* service cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680, margin: '0 auto', width: '100%' }}>
        {services.map((svc, i) => (
          <div
            key={svc.title}
            style={{
              ...card,
              padding: '1.75rem 2rem',
              borderLeft: '2px solid rgba(0,182,122,0.3)',
              ...stagger(visible, i, 0.15),
            }}
            {...cardHoverProps}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
              <span className="font-mono" style={{ fontSize: 10, color: 'rgba(0,182,122,0.45)', letterSpacing: '0.15em' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
                {svc.title}
              </h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65, paddingLeft: 34 }}>
              {svc.desc}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
          ...stagger(visible, 3, 0.15),
        }}
      >
        <a
          href="#section-7"
          className="cta-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: 'var(--color-accent)', color: 'var(--color-void)', fontWeight: 600, fontSize: 13, borderRadius: 999, textDecoration: 'none' }}
        >
          Start a Project &rarr;
        </a>
        <a
          href="mailto:eris@syntra.ai"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)', fontSize: 12, borderRadius: 999, textDecoration: 'none', transition: 'border-color 0.3s, color 0.3s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,182,122,0.4)'; e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          eris@syntra.ai
        </a>
      </div>
    </div>
  )
}
