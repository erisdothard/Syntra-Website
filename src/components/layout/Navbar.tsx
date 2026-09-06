import { useEffect, useState, useCallback } from 'react'
import { scrollToId } from '../../hooks/useLaunchScroll'

type Tab = 'portfolio' | 'services' | 'resume'

interface NavbarProps {
  onTabOpen: (tab: Tab) => void
}

const TABS: Tab[] = ['portfolio', 'services', 'resume']

export function Navbar({ onTabOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleTab = useCallback((tab: Tab) => { setMenuOpen(false); onTabOpen(tab) }, [onTabOpen])
  const handleContact = useCallback((e: React.MouseEvent) => { e.preventDefault(); setMenuOpen(false); scrollToId('outro') }, [])

  const link = 'font-mono text-[11px] uppercase tracking-[0.18em] text-text-secondary transition-colors duration-300 hover:text-text'

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled || menuOpen ? 'bg-void/60 backdrop-blur-xl border-b border-border' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 md:px-12 lg:px-16 py-4">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          className="display text-text text-[13px] tracking-[0.12em] select-none flex items-center gap-3"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-accent shadow-[0_0_12px_rgba(255,106,26,0.8)]" />
          SYNTRA AI
        </a>

        <ul className="hidden md:flex items-center gap-9">
          {TABS.map((t) => (
            <li key={t}><button onClick={() => handleTab(t)} className={link}>{t}</button></li>
          ))}
          <li><a href="#outro" onClick={handleContact} className={`${link} text-accent hover:text-accent-hot`}>Contact</a></li>
        </ul>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px]"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="block w-5 h-[1.5px] bg-white transition-all duration-300 origin-center" style={menuOpen ? { transform: 'translateY(3.25px) rotate(45deg)' } : {}} />
          <span className="block w-5 h-[1.5px] bg-white transition-all duration-300" style={menuOpen ? { opacity: 0 } : {}} />
          <span className="block w-5 h-[1.5px] bg-white transition-all duration-300 origin-center" style={menuOpen ? { transform: 'translateY(-3.25px) rotate(-45deg)' } : {}} />
        </button>
      </div>

      <div
        className="md:hidden overflow-hidden transition-all duration-400 ease-out"
        style={{ maxHeight: menuOpen ? 300 : 0, opacity: menuOpen ? 1 : 0, borderTop: menuOpen ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
      >
        <ul className="flex flex-col gap-1 px-6 py-5">
          {TABS.map((t) => (
            <li key={t}>
              <button onClick={() => handleTab(t)} className={`w-full text-left py-3 px-2 rounded ${link} text-[12px]`}>{t}</button>
            </li>
          ))}
          <li><a href="#outro" onClick={handleContact} className={`block py-3 px-2 rounded ${link} text-[12px] text-accent`}>Contact</a></li>
        </ul>
      </div>
    </nav>
  )
}
