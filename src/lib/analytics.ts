/**
 * Vercel Web Analytics, loaded from the script Vercel serves on its own deploys.
 * No npm package: @vercel/analytics pulls an optional Remix peer that conflicts
 * with the React range @react-three/fiber allows.
 *
 * Page views are counted by the script itself. `track` records the handful of
 * events that say whether the site is doing its job: a request form opened, a
 * request sent, a request that failed.
 */

type EventData = Record<string, string | number | boolean | null>

declare global {
  interface Window {
    va?: (event: 'event' | 'pageview', payload?: unknown) => void
    vaq?: unknown[]
  }
}

const SCRIPT_SRC = '/_vercel/insights/script.js'

export function initAnalytics(): void {
  // The script only exists on a Vercel deploy; under `vite dev` it would 404.
  if (!import.meta.env.PROD || typeof window === 'undefined') return
  if (!window.va) {
    // Queue calls made before the script arrives; it drains window.vaq on load.
    window.va = (...args: unknown[]) => {
      ;(window.vaq = window.vaq ?? []).push(args)
    }
  }
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return
  const script = document.createElement('script')
  script.src = SCRIPT_SRC
  script.defer = true
  document.head.appendChild(script)
}

export function track(name: string, data?: EventData): void {
  if (typeof window === 'undefined' || !window.va) return
  try {
    window.va('event', { name, data })
  } catch {
    // Measurement must never break the page it is measuring.
  }
}
