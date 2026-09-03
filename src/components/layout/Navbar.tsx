import { useEffect, useState, useCallback } from 'react'

interface NavbarProps {
  onTabOpen: (tab: 'portfolio' | 'services' | 'resume') => void
}

export function Navbar({ onTabOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault()
      setMenuOpen(false)
      const target = document.querySelector(href)
      target?.scrollIntoView({ behavior: 'smooth' })
    },
    [],
  )

  const handleTabClick = useCallback(
    (tab: 'portfolio' | 'services' | 'resume') => {
      setMenuOpen(false)
      onTabOpen(tab)
    },
    [onTabOpen],
  )

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled || menuOpen
          ? 'bg-void/70 backdrop-blur-xl border-b border-border'
          : 'bg-transparent border-b border-transparent'
      }`}
      style={{ WebkitBackdropFilter: scrolled || menuOpen ? 'blur(24px) saturate(1.4)' : undefined }}
    >
      <div
        className="mx-auto max-w-7xl flex items-center justify-between px-5 md:px-10 lg:px-12 py-3 md:grid"
        style={{ gridTemplateColumns: '1fr auto 1fr' } as React.CSSProperties}
      >
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setMenuOpen(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="flex items-center gap-2.5 font-heading text-sm font-semibold tracking-widest text-text uppercase select-none transition-colors duration-300 hover:text-accent"
          style={{ fontVariant: 'all-small-caps', letterSpacing: '0.18em' }}
        >
          {/* Same file as the favicon and the TikTok app icon — one mark, three
              surfaces. TikTok app review rejects a submission whose icon does not
              match the one shown on the site. */}
          <img src="/favicon.svg" alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
          Eris Dothard &mdash; Syntra
        </a>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center justify-center gap-8">
          <li>
            <button
              onClick={() => handleTabClick('portfolio')}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary transition-colors duration-300 hover:text-accent"
            >
              Portfolio
            </button>
          </li>
          <li>
            <button
              onClick={() => handleTabClick('services')}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary transition-colors duration-300 hover:text-accent"
            >
              Services
            </button>
          </li>
          <li>
            <button
              onClick={() => handleTabClick('resume')}
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

        {/* Right cell — grid balance on desktop, hamburger on mobile */}
        <div className="flex justify-end">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px]"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span
              className="block w-5 h-[1.5px] bg-white transition-all duration-300 origin-center"
              style={menuOpen ? { transform: 'translateY(3.25px) rotate(45deg)' } : {}}
            />
            <span
              className="block w-5 h-[1.5px] bg-white transition-all duration-300"
              style={menuOpen ? { opacity: 0 } : {}}
            />
            <span
              className="block w-5 h-[1.5px] bg-white transition-all duration-300 origin-center"
              style={menuOpen ? { transform: 'translateY(-3.25px) rotate(-45deg)' } : {}}
            />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className="md:hidden overflow-hidden transition-all duration-400 ease-out"
        style={{
          maxHeight: menuOpen ? 280 : 0,
          opacity: menuOpen ? 1 : 0,
          borderTop: menuOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <ul className="flex flex-col gap-1 px-6 py-5">
          {(['portfolio', 'services', 'resume'] as const).map((tab) => (
            <li key={tab}>
              <button
                onClick={() => handleTabClick(tab)}
                className="w-full text-left font-mono text-[12px] uppercase tracking-[0.15em] text-text-secondary py-3 px-2 rounded transition-colors duration-200 hover:text-accent hover:bg-white/[0.03] active:bg-white/[0.06]"
              >
                {tab}
              </button>
            </li>
          ))}
          <li>
            <a
              href="#section-5"
              onClick={(e) => handleAnchorClick(e, '#section-5')}
              className="block font-mono text-[12px] uppercase tracking-[0.15em] text-text-secondary py-3 px-2 rounded transition-colors duration-200 hover:text-accent hover:bg-white/[0.03] active:bg-white/[0.06]"
            >
              Contact
            </a>
          </li>
        </ul>
      </div>
    </nav>
  )
}
