/**
 * FloatingPanel — Mouse-activated glassmorphic info overlay.
 * Inspired by anubra266/floating-panel + float-controls (21st.dev).
 *
 * Slides up from bottom of 3D area on mouse movement,
 * auto-hides after idle timeout. Shows capability details
 * without navigating away from the scene.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface PanelItem {
  label: string
  title: string
  value: string
}

const panelItems: PanelItem[] = [
  { label: 'Model', title: 'Syntra Emblem', value: 'Procedural 3-ring construct' },
  { label: 'Engine', title: 'React Three Fiber', value: 'GPU-accelerated WebGL' },
  { label: 'FX', title: 'Post-Processing', value: 'Bloom · Vignette · Chromatic' },
  { label: 'Motion', title: 'Scroll-Driven', value: 'GSAP ScrollTrigger sync' },
]

const IDLE_MS = 2500
const SLIDE_DURATION = 400

export function FloatingPanel() {
  const [visible, setVisible] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const resetIdle = useCallback(() => {
    setVisible(true)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setVisible(false), IDLE_MS)
  }, [])

  useEffect(() => {
    const onMove = () => resetIdle()
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [resetIdle])

  return (
    <div
      ref={panelRef}
      className="floating-panel"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(calc(100% + 24px))',
        opacity: visible ? 1 : 0,
        transition: `transform ${SLIDE_DURATION}ms var(--ease-out-expo), opacity ${SLIDE_DURATION}ms ease`,
      }}
      aria-hidden={!visible}
    >
      <div className="floating-panel-grid">
        {panelItems.map((item) => (
          <div key={item.label} className="floating-panel-cell">
            <span className="floating-panel-label">{item.label}</span>
            <span className="floating-panel-title">{item.title}</span>
            <span className="floating-panel-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
