import { useEffect, useRef, useState } from 'react'

const metrics = [
  { value: '3x', suffix: '', label: 'Faster Deployment' },
  { value: '40', suffix: '%', label: 'Cost Reduction' },
  { value: '24/7', suffix: '', label: 'Autonomous Operation' },
]

function MetricCard({ value, suffix, label, index }: { value: string; suffix: string; label: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState('0')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true) }, { threshold: 0.3 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const num = parseInt(value)
    if (isNaN(num)) { setDisplay(value); return }
    let current = 0
    const step = Math.max(1, Math.floor(num / 30))
    const interval = setInterval(() => {
      current += step
      if (current >= num) { current = num; clearInterval(interval) }
      setDisplay(String(current))
    }, 40)
    return () => clearInterval(interval)
  }, [value, visible])

  return (
    <div ref={ref} className={`reveal reveal-delay-${index + 1} text-center`}>
      <div className="text-5xl md:text-7xl lg:text-8xl font-bold font-heading text-white mb-2">
        {display}<span className="text-accent">{suffix}</span>
      </div>
      <p className="text-text-secondary text-sm md:text-base uppercase tracking-[0.15em] font-mono">{label}</p>
    </div>
  )
}

export function MetricsSection() {
  return (
    <section id="section-6" className="min-h-screen flex flex-col justify-center px-6 md:px-16 lg:px-24 py-24">
      <div className="max-w-5xl mx-auto w-full">
        <p className="reveal text-[10px] uppercase tracking-[0.3em] text-accent mb-4 font-mono text-center">05 &mdash; Impact</p>
        <h2 className="reveal reveal-delay-1 text-3xl md:text-4xl font-bold text-white leading-tight mb-16 font-heading text-center">
          Results that <span className="text-accent">compound</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {metrics.map((m, i) => <MetricCard key={m.label} {...m} index={i} />)}
        </div>
      </div>
    </section>
  )
}
