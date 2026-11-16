import { PARTNERS } from './data'
import type { AiCall, Lang, Partner, Referral } from './types'

/**
 * Demo storage in this browser's localStorage. In production these are the
 * handoff_queue, providers and ai_call_log tables behind row-level security.
 * Every read and write is guarded: a private window or blocked storage still
 * leaves a working navigator, it just forgets on reload.
 */

const KEYS = {
  partners: 'syntra.navigator.partners.v1',
  referrals: 'syntra.navigator.referrals.v1',
  calls: 'syntra.navigator.calls.v1',
  lang: 'syntra.navigator.lang',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: keep working in memory */
  }
  window.dispatchEvent(new CustomEvent('navigator-store', { detail: key }))
}

/** The service matrix with any staff edits applied. */
export function loadPartners(): Partner[] {
  const edits = read<Record<string, Partial<Partner>>>(KEYS.partners, {})
  return PARTNERS.map((p) => ({ ...p, ...(edits[p.id] ?? {}), id: p.id }))
}

export function savePartner(id: string, patch: Partial<Partner>): void {
  const edits = read<Record<string, Partial<Partner>>>(KEYS.partners, {})
  edits[id] = { ...(edits[id] ?? {}), ...patch }
  write(KEYS.partners, edits)
}

export function loadReferrals(): Referral[] {
  return read<Referral[]>(KEYS.referrals, [])
}

export function addReferral(r: Referral): void {
  write(KEYS.referrals, [r, ...loadReferrals()])
}

export function setReferralStatus(code: string, status: Referral['status']): void {
  write(
    KEYS.referrals,
    loadReferrals().map((r) => (r.code === code ? { ...r, status } : r)),
  )
}

export interface LoggedCall extends AiCall {
  sessionId: string
  at: string
}

export function loadCalls(): LoggedCall[] {
  return read<LoggedCall[]>(KEYS.calls, [])
}

export function logCall(sessionId: string, call: AiCall): void {
  const calls = [{ ...call, sessionId, at: new Date().toISOString() }, ...loadCalls()].slice(0, 200)
  write(KEYS.calls, calls)
}

export function loadLang(): Lang | null {
  const v = read<string | null>(KEYS.lang, null)
  return v === 'en' || v === 'es' ? v : null
}

export function saveLang(lang: Lang): void {
  write(KEYS.lang, lang)
}

export function resetDemo(): void {
  try {
    window.localStorage.removeItem(KEYS.partners)
    window.localStorage.removeItem(KEYS.referrals)
    window.localStorage.removeItem(KEYS.calls)
  } catch {
    /* nothing stored */
  }
  window.dispatchEvent(new CustomEvent('navigator-store', { detail: 'reset' }))
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function newReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `CW-${s.slice(0, 3)}-${s.slice(3)}`
}

export function newSessionId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
