import { useEffect, useState, useCallback } from 'react'

interface NavbarProps {
  onTabOpen: (tab: 'portfolio' | 'services' | 'resume') => void
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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 md:px-10 lg:px-12 py-3">
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
          Eris Dothard &mdash; Syntra
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
            <button
              onClick={() => onTabOpen('resume')}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary transition-colors duration-300 hover:text-accent"
            >
              Resume
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

        {/* Spacer for layout balance */}
        <div className="w-20" />
      </div>
    </nav>
  )
}
