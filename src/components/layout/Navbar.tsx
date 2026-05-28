import { useEffect, useState, useCallback } from 'react'

interface NavbarProps {
  onTabOpen: (tab: 'portfolio' | 'services') => void
}

export function Navbar({ onTabOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault()
      const target = document.querySelector(href)
      target?.scrollIntoView({ behavior: 'smooth' })
    },
    [],
  )

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-void/70 backdrop-blur-xl border-b border-border'
          : 'bg-transparent border-b border-transparent'
      }`}
      style={{ WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(1.4)' : undefined }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="font-heading text-sm font-semibold tracking-widest text-text uppercase select-none transition-colors duration-300 hover:text-accent"
          style={{ fontVariant: 'all-small-caps', letterSpacing: '0.18em' }}
        >
          Eris Dothard
        </a>

        {/* Center nav links */}
        <ul className="hidden md:flex items-center gap-8">
          <li>
            <button
              onClick={() => onTabOpen('portfolio')}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary transition-colors duration-300 hover:text-accent"
            >
              Portfolio
            </button>
          </li>
          <li>
            <button
              onClick={() => onTabOpen('services')}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary transition-colors duration-300 hover:text-accent"
            >
              Services
            </button>
          </li>
          <li>
            <a
              href="#section-5"
              onClick={(e) => handleAnchorClick(e, '#section-5')}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary transition-colors duration-300 hover:text-accent"
            >
              Contact
            </a>
          </li>
        </ul>

        {/* Resume button */}
        <a
          href="/resume.pdf"
          download
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent border border-accent/30 rounded-full px-4 py-1.5 transition-all duration-300 hover:bg-accent/10 hover:border-accent/50 hover:shadow-[0_0_16px_rgba(0,182,122,0.15)]"
        >
          Resume
        </a>
      </div>
    </nav>
  )
}
