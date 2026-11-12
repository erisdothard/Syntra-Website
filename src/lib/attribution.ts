/**
 * Where a visitor came from, captured once on arrival and sent with any request
 * they submit, so a lead can be traced to the link, campaign or referrer that
 * produced it. Kept in sessionStorage: it describes this visit only.
 */

const STORAGE_KEY = 'syntra.attribution'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
const MAX_UTM = 120
const MAX_LONG = 500

export type Attribution = Partial<Record<(typeof UTM_KEYS)[number] | 'referrer' | 'landing_path', string>>

function read(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    // Storage is writable by anything on the page: keep known keys with string values only.
    const clean: Attribution = {}
    for (const key of [...UTM_KEYS, 'referrer', 'landing_path'] as const) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'string') clean[key] = value
    }
    return clean
  } catch {
    return null
  }
}

/** Records the first landing of the session. Later navigations never overwrite it. */
export function captureAttribution(): void {
  if (typeof window === 'undefined' || read()) return
  const params = new URLSearchParams(window.location.search)
  const found: Attribution = {}
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim()
    if (value) found[key] = value.slice(0, MAX_UTM)
  }
  // Only an outside referrer says anything; our own pages are not a source.
  if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
    found.referrer = document.referrer.slice(0, MAX_LONG)
  }
  found.landing_path = window.location.pathname.slice(0, MAX_LONG)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found))
  } catch {
    // Private windows can refuse storage; the request still sends without it.
  }
}

export function getAttribution(): Attribution {
  return read() ?? {}
}
