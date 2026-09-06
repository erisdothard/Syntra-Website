import { useRef, useCallback } from 'react'
import type { ReactNode, MouseEvent } from 'react'

interface Props {
  href: string
  children: ReactNode
  className?: string
  strength?: number
}

/** Desktop-only magnetic pull + hover-spot highlight. Falls back to a plain link on touch. */
export function MagneticButton({ href, children, className = 'btn-primary', strength = 0.35 }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)

  const onMove = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
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

  return (
    <a ref={ref} href={href} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </a>
  )
}
