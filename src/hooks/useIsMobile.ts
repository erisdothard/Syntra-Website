import { useState, useEffect } from 'react'

/** Returns true on viewports ≤ 768px OR touch-primary devices */
export function useIsMobile() {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return mobile
}
