import { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'

/* ── data ── */

const projects = [
  { title: 'FreightX', tag: 'AI Freight Marketplace', stack: 'React · Python · Supabase', featured: true },
  { title: 'Syntra AI', tag: 'Agentic OS for SMBs', stack: 'FastAPI · Claude API · LangGraph', featured: true },
  { title: 'BridgeLink', tag: 'HL7/FHIR Interop', stack: 'Mirth Connect · PostgreSQL', featured: false },
  { title: 'CPI Card Group', tag: 'CJIS Fintech Pipelines', stack: 'OAuth 2.0 · ETL · SFTP', featured: false },
]

const experience = [
  { role: 'Founder', org: 'Syntra', date: '2025 –' },
  { role: 'Integration Engineer', org: 'CPI Card Group', date: '2021 – 26' },
  { role: 'Technical Support', org: 'Google Fiber', date: '2019 – 21' },
]

const services = [
  { title: 'AI Workflow Automation', desc: 'Agents and pipelines that replace manual ops end-to-end.' },
  { title: 'Custom Software', desc: 'AI-embedded apps and tools built to your exact workflow.' },
  { title: 'Ongoing Retainer', desc: 'Maintenance, monitoring, and iteration on shipped systems.' },
]

/* ── component ── */

interface TabOverlayProps {
  activeTab: 'portfolio' | 'services' | null
  onClose: () => void
}

export function TabOverlay({ activeTab, onClose }: TabOverlayProps) {
  const [visible, setVisible] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    if (!activeTab) { setVisible(false); return }
    requestAnimationFrame(() => setVisible(true))

    const canvas = document.getElementById('scene-canvas')
    document.body.style.overflow = 'hidden'
    if (canvas) {
      canvas.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1)'
      canvas.style.opacity = '0.08'
    }
    return () => {
      document.body.style.overflow = ''
      if (canvas) canvas.style.opacity = '1'
    }
  }, [activeTab])

  /* GSAP entrance */
  useEffect(() => {
    if (!visible || !contentRef.current) return
    tlRef.current?.kill()

    const el = contentRef.current
    const cards = el.querySelectorAll<HTMLElement>('[data-animate="card"]')
    const items = el.querySelectorAll<HTMLElement>('[data-animate="item"]')

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

    // header wipe
    tl.fromTo(
      el.querySelector('[data-animate="header"]'),
      { opacity: 0, x: -40, clipPath: 'inset(0 100% 0 0)' },
      { opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.7 },
      0.1,
    )

    // cards stagger from alternating sides
    cards.forEach((card, i) => {
      const fromRight = i % 2 === 1
      tl.fromTo(
        card,
        { opacity: 0, x: fromRight ? 60 : -60, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 0.6 },
        0.15 + i * 0.08,
      )
    })

    // bottom items fade up
    tl.fromTo(
      items,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.05 },
      0.4,
    )

    // animated border sweep on cards
    cards.forEach((card) => {
      const border = card.querySelector<HTMLElement>('[data-animate="border"]')
      if (border) {
        tl.fromTo(
          border,
          { backgroundPosition: '-200% 0' },
          { backgroundPosition: '200% 0', duration: 1.8, ease: 'none', repeat: -1 },
          0.5,
        )
      }
    })

    tlRef.current = tl
    return () => { tl.kill() }
  }, [visible, activeTab])

  if (!activeTab) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{
        background: visible
          ? 'radial-gradient(ellipse at 50% 30%, rgba(0,255,204,0.02) 0%, rgba(8,10,13,0.98) 50%)'
          : 'rgba(8,10,13,0)',
        transition: 'background 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Scanline texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.007) 3px, rgba(255,255,255,0.007) 4px)',
        }}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="fixed top-5 right-8 md:right-12 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 text-text-muted hover:text-white hover:border-[#00FFCC]/40 transition-all duration-300 text-lg z-50"
        aria-label="Close"
      >
        &times;
      </button>

      {/* Content — vertically centered, single viewport */}
      <div
        ref={contentRef}
        className="relative z-10 w-full px-6 md:px-12"
        style={{ maxWidth: 960 }}
      >
        {activeTab === 'portfolio' ? <PortfolioView /> : <ServicesView />}
      </div>
    </div>
  )
}

/* ═══════════════ PORTFOLIO ═══════════════ */

function PortfolioView() {
  return (
    <>
      {/* Header */}
      <div data-animate="header" style={{ marginBottom: 40 }}>
        <p className="font-mono" style={{ fontSize: 10, color: '#00FFCC', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.7, marginBottom: 8 }}>
          Selected Work
        </p>
        <h2 className="font-heading" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.95 }}>
          Portfolio<span style={{ color: '#00FFCC' }}>.</span>
        </h2>
      </div>

      {/* 2×2 bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12, marginBottom: 36 }}>
        {projects.map((proj) => (
          <div
            key={proj.title}
            data-animate="card"
            className="tab-card"
            style={{ position: 'relative', padding: '24px 24px 20px', overflow: 'hidden' }}
          >
            {/* Animated border sweep */}
            <div
              data-animate="border"
              style={{
                position: 'absolute', inset: 0, borderRadius: 'inherit', padding: 1, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,204,0) 30%, rgba(0,255,204,0.3) 50%, rgba(0,255,204,0) 70%, transparent 100%)',
                backgroundSize: '200% 100%',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                opacity: 0.6,
              }}
            />

            {proj.featured && (
              <span className="font-mono" style={{ fontSize: 8, color: '#00FFCC', letterSpacing: '0.15em', display: 'block', marginBottom: 8 }}>
                FEATURED
              </span>
            )}
            <h3 className="font-heading" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {proj.title}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
              {proj.tag}
            </p>
            <p className="font-mono" style={{ fontSize: 9, color: 'rgba(0,255,204,0.4)', letterSpacing: '0.06em' }}>
              {proj.stack}
            </p>
          </div>
        ))}
      </div>

      {/* Experience — compact horizontal row */}
      <div data-animate="item" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {experience.map((item, i) => (
          <div key={item.date} data-animate="item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#00FFCC' : 'rgba(255,255,255,0.15)', boxShadow: i === 0 ? '0 0 8px rgba(0,255,204,0.3)' : 'none', flexShrink: 0 }} />
            <span className="font-heading" style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.role}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.org} · {item.date}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ═══════════════ SERVICES ═══════════════ */

function ServicesView() {
  return (
    <>
      {/* Header */}
      <div data-animate="header" style={{ marginBottom: 40 }}>
        <p className="font-mono" style={{ fontSize: 10, color: '#00FFCC', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.7, marginBottom: 8 }}>
          What We Offer
        </p>
        <h2 className="font-heading" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.95 }}>
          Services<span style={{ color: '#00FFCC' }}>.</span>
        </h2>
      </div>

      {/* 3-column service cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, marginBottom: 36 }}>
        {services.map((svc, i) => (
          <div
            key={svc.title}
            data-animate="card"
            className="tab-card"
            style={{ position: 'relative', padding: '28px 24px 24px', overflow: 'hidden' }}
          >
            {/* Animated border sweep */}
            <div
              data-animate="border"
              style={{
                position: 'absolute', inset: 0, borderRadius: 'inherit', padding: 1, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,204,0) 30%, rgba(0,255,204,0.3) 50%, rgba(0,255,204,0) 70%, transparent 100%)',
                backgroundSize: '200% 100%',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                opacity: 0.6,
              }}
            />

            <span className="font-mono" style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.04)', position: 'absolute', top: 16, right: 20, lineHeight: 1, pointerEvents: 'none' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="font-heading" style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              {svc.title}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {svc.desc}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div data-animate="item">
        <a
          href="mailto:eris@syntra.ai"
          className="cta-initialize"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          Start a Project <span style={{ fontSize: 16 }}>&rarr;</span>
        </a>
      </div>
    </>
  )
}
