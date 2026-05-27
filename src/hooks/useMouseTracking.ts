import { useEffect } from 'react'
import { scrollState } from '../lib/scrollState'

export function useMouseTracking() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return

    const onMove = (e: MouseEvent) => {
      scrollState.mouseX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.mouseY = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
}
