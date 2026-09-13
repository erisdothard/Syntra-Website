import { useRef, useCallback } from 'react'
import type { ReactNode, MouseEvent, RefObject } from 'react'

type Props = {
  children: ReactNode
  className?: string
  strength?: number
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })

/** Desktop-only magnetic pull + hover-spot highlight. A link with `href`, a button with `onClick`. */
export function MagneticButton({ href, onClick, children, className = 'btn-primary', strength = 0.35 }: Props) {
  const ref = useRef<HTMLElement>(null)

  const onMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const el = ref.current
      if (!el || window.matchMedia('(pointer: coarse)').matches) return
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
    },
    [strength],
  )

  const onLeave = useCallback(() => {
    const el = ref.current
    if (el) el.style.transform = ''
  }, [])

  if (href !== undefined) {
    return (
      <a ref={ref as RefObject<HTMLAnchorElement>} href={href} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
        {children}
      </a>
    )
  }

  return (
    <button
      ref={ref as RefObject<HTMLButtonElement>}
      type="button"
      className={className}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </button>
  )
}
