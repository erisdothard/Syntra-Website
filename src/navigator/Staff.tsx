import { useEffect, useState } from 'react'
import { BARRIER_LABELS, formatDate, LANG_NAMES, usd } from './i18n'
import { MODELS } from './config'
import {
  loadCalls,
  loadPartners,
  loadReferrals,
  resetDemo,
  savePartner,
  setReferralStatus,
  todayIso,
  type LoggedCall,
} from './store'
import type { Lang, Partner, Referral } from './types'
import { Icon, type S } from './ui'

const STALE_DAYS = 60

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / 86_400_000)
}

/** Re-reads demo storage whenever the navigator (any tab) writes to it. */
function useStore() {
  const [state, setState] = useState(() => ({ partners: loadPartners(), referrals: loadReferrals(), calls: loadCalls() }))
  useEffect(() => {
    const refresh = () => setState({ partners: loadPartners(), referrals: loadReferrals(), calls: loadCalls() })
    window.addEventListener('navigator-store', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('navigator-store', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return state
}

function ReferralCard({ r, t, lang }: { r: Referral; t: S; lang: Lang }) {
  const created = new Date(r.createdAt)
  return (
    <li className="nv-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-lg font-bold">{r.code}</p>
        <span className={`nv-tag ${r.status === 'new' ? 'nv-tag-warn' : 'nv-tag-good'}`}>
          {r.status === 'new' ? t.staffNew : t.staffContacted}
        </span>
      </div>
      <p className="nv-small nv-muted">
        {t.staffReceived}: {created.toLocaleString(lang === 'es' ? 'es-US' : 'en-US')} · {t.staffSendTo}: {r.partnerName} ({r.partnerId}) ·{' '}
        {LANG_NAMES[r.lang][lang]}
      </p>
      <dl className="space-y-1">
        {r.shared.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(7rem,35%)_1fr] gap-2 text-[0.95rem]">
            <dt className="nv-muted">{row.label}</dt>
            <dd className="m-0 break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
      {r.status === 'new' && (
        <button type="button" className="nv-btn nv-btn-secondary nv-btn-small" onClick={() => setReferralStatus(r.code, 'contacted')}>
          {t.staffMarkContacted}
        </button>
      )}
    </li>
  )
}

function PartnerRow({ p, t, lang, onSaved }: { p: Partner; t: S; lang: Lang; onSaved: (msg: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ phone: p.phone, hoursEn: p.hours.en, hoursEs: p.hours.es, eligEn: p.eligibility.en, eligEs: p.eligibility.es })
  const stale = daysSince(p.lastVerified) > STALE_DAYS
  const verifiedToday = p.lastVerified === todayIso()
  const fid = (k: string) => `nv-${p.id}-${k}`

  return (
    <li className="nv-card space-y-3">
      <div className="space-y-2">
        <h3>{p.name}</h3>
        <div className="nv-meta">
          <span className="nv-pill">{BARRIER_LABELS[p.service][lang]}</span>
          <span className="nv-tag nv-tag-id">{p.id}</span>
          {stale && <span className="nv-tag nv-tag-warn">{t.staffStale}</span>}
        </div>
      </div>
      {!editing ? (
        <>
          <dl className="nv-dl">
            <dt>{t.phone}</dt>
            <dd>{p.phone}</dd>
            <dt>{t.hours}</dt>
            <dd>
              {p.hours.en}
              <br />
              <span lang="es">{p.hours.es}</span>
            </dd>
            <dt>{t.eligibility}</dt>
            <dd>{p.eligibility[lang]}</dd>
            <dt>{t.staffArea}</dt>
            <dd>{p.regions === 'county' ? t.staffCountyWide : p.regions.join(', ')}</dd>
            <dt>{t.languages}</dt>
            <dd>{p.languages.map((l) => LANG_NAMES[l][lang]).join(', ')}</dd>
            <dt>{t.lastVerified}</dt>
            <dd>
              <strong>{formatDate(p.lastVerified, lang)}</strong>
            </dd>
            <dt>{t.staffSteward}</dt>
            <dd>{p.steward}</dd>
          </dl>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="nv-btn nv-btn-secondary nv-btn-small" onClick={() => setEditing(true)}>
              {t.staffEdit}
            </button>
            <button
              type="button"
              className="nv-btn nv-btn-primary nv-btn-small"
              disabled={verifiedToday}
              onClick={() => {
                savePartner(p.id, { lastVerified: todayIso() })
                onSaved(`${p.name}: ${t.staffVerifiedToday}.`)
              }}
            >
              <Icon name="check" size={16} />
              {verifiedToday ? t.staffVerifiedToday : t.staffMarkVerified}
            </button>
          </div>
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            savePartner(p.id, {
              phone: draft.phone.trim() || p.phone,
              hours: { en: draft.hoursEn.trim() || p.hours.en, es: draft.hoursEs.trim() || p.hours.es },
              eligibility: { en: draft.eligEn.trim() || p.eligibility.en, es: draft.eligEs.trim() || p.eligibility.es },
            })
            setEditing(false)
            onSaved(t.staffSaved)
          }}
        >
          {(
            [
              ['phone', t.phone, draft.phone, (v: string) => setDraft({ ...draft, phone: v })],
              ['hoursEn', `${t.hours} (English)`, draft.hoursEn, (v: string) => setDraft({ ...draft, hoursEn: v })],
              ['hoursEs', `${t.hours} (Español)`, draft.hoursEs, (v: string) => setDraft({ ...draft, hoursEs: v })],
              ['eligEn', `${t.eligibility} (English)`, draft.eligEn, (v: string) => setDraft({ ...draft, eligEn: v })],
              ['eligEs', `${t.eligibility} (Español)`, draft.eligEs, (v: string) => setDraft({ ...draft, eligEs: v })],
            ] as const
          ).map(([k, label, value, set]) => (
            <div key={k}>
              <label htmlFor={fid(k)} className="nv-label">
                {label}
              </label>
              <input id={fid(k)} className="nv-input" value={value} maxLength={160} onChange={(e) => set(e.target.value)} />
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="nv-btn nv-btn-primary nv-btn-small">
              {t.staffSave}
            </button>
            <button type="button" className="nv-btn nv-btn-secondary nv-btn-small" onClick={() => setEditing(false)}>
              {t.staffCancel}
            </button>
          </div>
        </form>
      )}
    </li>
  )
}

function CostLog({ calls, t, lang }: { calls: LoggedCall[]; t: S; lang: Lang }) {
  if (calls.length === 0) return <p className="nv-note nv-note-rules">{t.staffNoCalls}</p>
  const sessions = new Map<string, LoggedCall[]>()
  for (const c of calls) sessions.set(c.sessionId, [...(sessions.get(c.sessionId) ?? []), c])
  return (
    <div className="-mx-2 overflow-x-auto" tabIndex={0} role="region" aria-label={t.staffCostLog}>
      <table className="nv-table">
        <caption className="sr-only">{t.staffCostLog}</caption>
        <thead>
          <tr>
            <th scope="col">{lang === 'es' ? 'Sesión' : 'Session'}</th>
            <th scope="col">{t.costStep}</th>
            <th scope="col">{t.costHow}</th>
            <th scope="col" className="num">
              {t.costTokens}
            </th>
            <th scope="col" className="num">
              {t.costUsd}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...sessions.entries()].map(([sid, cs]) => {
            const total = cs.reduce((s, c) => s + c.costUsd, 0)
            return [
              ...cs.map((c, i) => (
                <tr key={`${sid}-${i}`}>
                  <td className="font-mono text-xs">{i === 0 ? sid.slice(-8) : ''}</td>
                  <td>{c.step === 'parse' ? t.costRows.parse : t.costRows.explain}</td>
                  <td>{c.path === 'model' ? MODELS[c.step].label : `${t.costRules}${c.reason ? ` (${c.reason})` : ''}`}</td>
                  <td className="num">
                    {c.inputTokens} / {c.outputTokens}
                  </td>
                  <td className="num">{usd(c.costUsd)}</td>
                </tr>
              )),
              <tr key={`${sid}-total`}>
                <td />
                <td colSpan={3} className="font-semibold">
                  {t.costTotal} ({lang === 'es' ? 'búsqueda: 0 tokens' : 'matching: 0 tokens'})
                </td>
                <td className="num font-semibold">{usd(total)}</td>
              </tr>,
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Staff({ t, lang }: { t: S; lang: Lang }) {
  const { partners, referrals, calls } = useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const flash = (m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg(null), 4000)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1>{t.staffH1}</h1>
        <div className="flex flex-wrap gap-3">
          <a href="/demo/navigator" className="nv-btn nv-btn-secondary nv-btn-small">
            <Icon name="back" size={18} />
            {t.staffOpenNavigator}
          </a>
          <button
            type="button"
            className="nv-btn nv-btn-ghost"
            onClick={() => {
              resetDemo()
              flash(t.staffResetDone)
            }}
          >
            {t.staffReset}
          </button>
        </div>
      </div>
      <p className={msg ? 'nv-toast' : 'sr-only'} role="status">
        {msg}
      </p>

      <section aria-labelledby="nv-q" className="space-y-3">
        <h2 id="nv-q">
          {t.staffQueue} ({referrals.length})
        </h2>
        {referrals.length === 0 ? (
          <p className="nv-note nv-note-rules">{t.staffQueueEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {referrals.map((r) => (
              <ReferralCard key={r.code} r={r} t={t} lang={lang} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="nv-res" className="space-y-3">
        <h2 id="nv-res">
          {t.staffResources} ({partners.length})
        </h2>
        <ul className="space-y-3">
          {partners.map((p) => (
            <PartnerRow key={`${p.id}-${p.lastVerified}-${p.phone}-${p.hours.en}`} p={p} t={t} lang={lang} onSaved={flash} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="nv-cost" className="space-y-3">
        <h2 id="nv-cost">{t.staffCostLog}</h2>
        <CostLog calls={calls} t={t} lang={lang} />
      </section>
    </div>
  )
}
