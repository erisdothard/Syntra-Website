import { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'
import { projects, experience, services, skills, certifications } from '../data/portfolio'
import type { Project } from '../data/portfolio'

/* ── component ── */

interface TabOverlayProps {
  activeTab: 'portfolio' | 'services' | 'resume' | null
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
      canvas.style.transition = 'opacity 0.3s ease-out'
      canvas.style.opacity = '0.08'
    }
    return () => {
      document.body.style.overflow = ''
      if (canvas) {
        canvas.style.transition = 'opacity 0.15s ease-out'
        canvas.style.opacity = '1'
      }
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

  if (!activeTab) {
    tlRef.current?.kill()
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        background: visible
          ? 'radial-gradient(ellipse at 50% 30%, rgba(0,255,204,0.03) 0%, transparent 50%), rgba(8,10,13,1)'
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

      {/* Content — vertically centered, scrollable */}
      <div
        ref={contentRef}
        className="relative z-10 w-full px-6 md:px-12 max-h-[85vh] overflow-y-auto"
        style={{ maxWidth: 960 }}
      >
        {activeTab === 'portfolio' && <PortfolioView />}
        {activeTab === 'services' && <ServicesView />}
        {activeTab === 'resume' && <ResumeView />}
      </div>
    </div>
  )
}

/* ── Shared card border component ── */

function AnimatedBorder() {
  return (
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
  )
}

/* ═══════════════ PORTFOLIO ═══════════════ */

function PortfolioView() {
  const [selected, setSelected] = useState<Project | null>(null)

  if (selected) {
    return <ProjectDetail project={selected} onBack={() => setSelected(null)} />
  }

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

      {/* Project grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12, marginBottom: 36 }}>
        {projects.map((proj) => (
          <button
            key={proj.title}
            data-animate="card"
            className="tab-card"
            style={{ position: 'relative', padding: '24px 24px 20px', overflow: 'hidden', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => setSelected(proj)}
          >
            <AnimatedBorder />

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
            <p className="font-mono" style={{ fontSize: 10, color: 'rgba(0,255,204,0.55)', letterSpacing: '0.06em' }}>
              {proj.stack}
            </p>
          </button>
        ))}
      </div>

      {/* Experience — compact horizontal row */}
      <div data-animate="item" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {experience.map((item, i) => (
          <div key={item.org} data-animate="item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#00FFCC' : 'rgba(255,255,255,0.15)', boxShadow: i === 0 ? '0 0 8px rgba(0,255,204,0.3)' : 'none', flexShrink: 0 }} />
            <span className="font-heading" style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.role}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.org} · {item.date}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ── Project detail sub-view ── */

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  return (
    <>
      <div data-animate="header" style={{ marginBottom: 32 }}>
        <button
          onClick={onBack}
          className="font-mono"
          style={{ fontSize: 10, color: '#00FFCC', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.7, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          &larr; Back to Portfolio
        </button>
        {project.featured && (
          <span className="font-mono" style={{ fontSize: 8, color: '#00FFCC', letterSpacing: '0.15em', display: 'block', marginBottom: 8 }}>
            FEATURED
          </span>
        )}
        <h2 className="font-heading" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.95 }}>
          {project.title}<span style={{ color: '#00FFCC' }}>.</span>
        </h2>
        <p className="font-mono" style={{ fontSize: 11, color: 'rgba(0,255,204,0.5)', letterSpacing: '0.08em', marginTop: 8 }}>
          {project.tag}
        </p>
      </div>

      <div data-animate="card" className="tab-card" style={{ position: 'relative', padding: '32px 28px', overflow: 'hidden', marginBottom: 20 }}>
        <AnimatedBorder />
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
          {project.description}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {project.stack.split(' · ').map((tech) => (
            <span
              key={tech}
              className="font-mono"
              style={{
                fontSize: 10,
                color: '#00FFCC',
                letterSpacing: '0.05em',
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid rgba(0,255,204,0.15)',
                background: 'rgba(0,255,204,0.04)',
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Action links */}
      <div data-animate="item" style={{ display: 'flex', gap: 12 }}>
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-initialize"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            View on GitHub <span style={{ fontSize: 16 }}>&rarr;</span>
          </a>
        )}
        {!project.github && (
          <a
            href="mailto:erisdothard1@gmail.com?subject=FreightX Demo Request"
            className="cta-initialize"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            Request a Demo <span style={{ fontSize: 16 }}>&rarr;</span>
          </a>
        )}
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
          What We Build
        </p>
        <h2 className="font-heading" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.95 }}>
          Services<span style={{ color: '#00FFCC' }}>.</span>
        </h2>
      </div>

      {/* Stacked service cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
        {services.map((svc, i) => (
          <div
            key={svc.title}
            data-animate="card"
            className="tab-card"
            style={{ position: 'relative', padding: '28px 28px 24px', overflow: 'hidden', display: 'flex', gap: 24, alignItems: 'flex-start' }}
          >
            <AnimatedBorder />

            {/* Editorial number */}
            <span className="font-heading" style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 700, color: 'rgba(255,255,255,0.05)', lineHeight: 1, flexShrink: 0, minWidth: 56 }}>
              {String(i + 1).padStart(2, '0')}
            </span>

            <div style={{ flex: 1 }}>
              <h3 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                {svc.title}
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.75 }}>
                {svc.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div data-animate="item">
        <a
          href="mailto:erisdothard1@gmail.com"
          className="cta-initialize"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          Start a Project <span style={{ fontSize: 16 }}>&rarr;</span>
        </a>
      </div>
    </>
  )
}

/* ═══════════════ RESUME ═══════════════ */

function ResumeView() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <>
      {/* Header */}
      <div data-animate="header" style={{ marginBottom: 40 }}>
        <p className="font-mono" style={{ fontSize: 10, color: '#00FFCC', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.7, marginBottom: 8 }}>
          Background
        </p>
        <h2 className="font-heading" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.95 }}>
          Resume<span style={{ color: '#00FFCC' }}>.</span>
        </h2>
      </div>

      {/* Experience */}
      <div style={{ marginBottom: 36 }}>
        <p className="font-mono" style={{ fontSize: 10, color: 'rgba(0,255,204,0.5)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>
          Experience
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {experience.map((item) => {
            const isExpanded = expanded === item.org
            const hasContent = (item.bullets && item.bullets.length > 0) || (item.sections && item.sections.length > 0)
            return (
              <div
                key={item.org}
                data-animate="card"
                className="tab-card"
                style={{ position: 'relative', overflow: 'hidden', cursor: hasContent ? 'pointer' : 'default' }}
                onClick={() => hasContent && setExpanded(isExpanded ? null : item.org)}
              >
                <AnimatedBorder />
                <div style={{ padding: '20px 24px' }}>
                  <h3 className="font-heading" style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                    {item.role}
                  </h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                    {item.org} · {item.date}
                  </p>
                </div>
                {isExpanded && item.sections && (
                  <div style={{ padding: '0 24px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {item.sections.map((section) => (
                      <div key={section.label} style={{ marginTop: 16 }}>
                        <span className="font-mono" style={{ fontSize: 9, color: '#00FFCC', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 10 }}>
                          {section.label}
                        </span>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {section.bullets.map((bullet) => (
                            <li key={bullet} style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, paddingLeft: 14, position: 'relative', marginBottom: 6 }}>
                              <span style={{ position: 'absolute', left: 0, color: 'rgba(0,255,204,0.4)' }}>›</span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && item.bullets && (
                  <div style={{ padding: '0 24px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
                      {item.bullets.map((bullet) => (
                        <li key={bullet} style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, paddingLeft: 14, position: 'relative', marginBottom: 6 }}>
                          <span style={{ position: 'absolute', left: 0, color: 'rgba(0,255,204,0.4)' }}>›</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 36 }}>
        <p className="font-mono" style={{ fontSize: 10, color: 'rgba(0,255,204,0.5)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>
          Skills
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 12 }}>
          {skills.map((group) => (
            <div key={group.category} data-animate="card" className="tab-card" style={{ position: 'relative', padding: '20px 20px 16px', overflow: 'hidden' }}>
              <AnimatedBorder />
              <h4 className="font-heading" style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {group.category}
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {group.items.map((skill) => (
                  <span
                    key={skill}
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      color: 'rgba(0,255,204,0.6)',
                      letterSpacing: '0.04em',
                      padding: '3px 8px',
                      borderRadius: 3,
                      border: '1px solid rgba(0,255,204,0.1)',
                      background: 'rgba(0,255,204,0.03)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div style={{ marginBottom: 36 }}>
        <p className="font-mono" style={{ fontSize: 10, color: 'rgba(0,255,204,0.5)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>
          Certifications
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
          {certifications.map((cert) => (
            <div key={cert.name} data-animate="card" className="tab-card" style={{ position: 'relative', padding: '18px 20px', overflow: 'hidden', display: 'flex', gap: 14, alignItems: 'center' }}>
              <AnimatedBorder />
              <img src="/anthropic-icon.svg" alt="" style={{ width: 24, height: 24, opacity: 0.6, flexShrink: 0 }} />
              <div>
                <h4 className="font-heading" style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
                  {cert.name}
                </h4>
                <p className="font-mono" style={{ fontSize: 9, color: 'rgba(0,255,204,0.5)', letterSpacing: '0.06em' }}>
                  {cert.issuer}{cert.date ? ` · ${cert.date}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div data-animate="item" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <a
          href="/resume.html"
          download="Eris_Dothard_Resume.html"
          className="cta-initialize"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          Download Resume <span style={{ fontSize: 16 }}>&darr;</span>
        </a>
        <a
          href="mailto:erisdothard1@gmail.com"
          className="cta-initialize"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          Get in Touch <span style={{ fontSize: 16 }}>&rarr;</span>
        </a>
      </div>
    </>
  )
}
