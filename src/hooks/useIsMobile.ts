import { useState, useEffect } from 'react'

const compute = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches)

/** True on viewports ≤ 768px OR touch-primary devices. Tracks both. */
export function useIsMobile() {
  const [mobile, setMobile] = useState(compute)

  useEffect(() => {
    const width = window.matchMedia('(max-width: 768px)')
    const pointer = window.matchMedia('(pointer: coarse)')
    const handler = () => setMobile(compute())
    width.addEventListener('change', handler)
    pointer.addEventListener('change', handler)
    return () => {
      width.removeEventListener('change', handler)
      pointer.removeEventListener('change', handler)
    }
  }, [])

  return mobile
}
