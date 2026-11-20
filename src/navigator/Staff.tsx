import { Fragment, useEffect, useState } from 'react'
import { costUsd, MODELS, TYPICAL, typicalSessionUsd } from './config'
import { COPY } from './copy'
import { BARRIER_NOUN, formatDate, LANG_NAMES, usd } from './i18n'
import { BARRIER_ORDER, REGION_ORDER, SAMPLE_NEEDS, SAMPLE_WEEK } from './opsSample'
import { loadCalls, loadPartners, loadReferrals, resetDemo, savePartner, setReferralStatus, todayIso, type LoggedCall } from './store'
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

function Funnel({ lang, referrals, calls }: { lang: Lang; referrals: Referral[]; calls: LoggedCall[] }) {
  const c = COPY[lang]
  const sessions = new Set(calls.map((x) => x.sessionId))
  const plans = new Set(calls.filter((x) => x.step === 'explain').map((x) => x.sessionId))
  const values = [
    SAMPLE_WEEK.started + sessions.size,
    SAMPLE_WEEK.plans + plans.size,
    SAMPLE_WEEK.askedPerson + referrals.length,
    SAMPLE_WEEK.contacted + referrals.filter((r) => r.status === 'contacted').length,
  ]
  const max = values[0]
  return (
    <section aria-labelledby="nv-ops-week" className="nv-panel nv-ops-week">
      <h2 id="nv-ops-week">{c.opsWeek}</h2>
      <ol className="nv-funnel">
        {values.map((v, i) => (
          <li key={c.funnel[i]}>
            <div className="nv-funnel-top">
              <span>{c.funnel[i]}</span>
              <strong>{v.toLocaleString()}</strong>
            </div>
            <span className="nv-funnel-bar" aria-hidden>
              <span style={{ width: `${(v / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ol>
      <p className="nv-panel-note">{c.opsWeekNote}</p>
    </section>
  )
}

function Needs({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const max = Math.max(...REGION_ORDER.flatMap((r) => BARRIER_ORDER.map((b) => SAMPLE_NEEDS[r][b])))
  return (
    <section aria-labelledby="nv-ops-needs" className="nv-panel nv-ops-needs">
      <h2 id="nv-ops-needs">{c.needsH2}</h2>
      <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-labelledby="nv-ops-needs">
        <table className="nv-heat">
          <caption className="sr-only">{c.needsNote}</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{c.colArea}</span>
              </th>
              {BARRIER_ORDER.map((b) => (
                <th key={b} scope="col">
                  {BARRIER_NOUN[b][lang]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REGION_ORDER.map((r) => (
              <tr key={r}>
                <th scope="row">{c.regions[r]}</th>
                {BARRIER_ORDER.map((b) => {
                  const v = SAMPLE_NEEDS[r][b]
                  return (
                    <td key={b} style={{ ['--heat' as string]: (v / max).toFixed(2) }}>
                      {v}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nv-panel-note">{c.needsNote}</p>
    </section>
  )
}

function CostSplit({ t, lang }: { t: S; lang: Lang }) {
  const c = COPY[lang]
  const parse = costUsd('parse', TYPICAL.parse.inputTokens, TYPICAL.parse.outputTokens)
  const words = costUsd('explain', TYPICAL.explain.inputTokens, TYPICAL.explain.outputTokens)
  const rows = [
    { k: c.costSafety, v: 0, how: c.costRulesShort },
    { k: c.costRead, v: parse, how: MODELS.parse.label },
    { k: c.costMatch, v: 0, how: c.costRulesShort },
    { k: c.costWords, v: words, how: MODELS.explain.label },
  ]
  const max = Math.max(...rows.map((r) => r.v))
  return (
    <section aria-labelledby="nv-ops-cost" className="nv-panel nv-ops-cost">
      <h2 id="nv-ops-cost">{c.costH2}</h2>
      <p className="nv-big-figure">{c.costAvg(usd(typicalSessionUsd()))}</p>
      <ul className="nv-split">
        {rows.map((r) => (
          <li key={r.k}>
            <div className="nv-funnel-top">
              <span>
                {r.k} <span className="nv-muted">· {r.how}</span>
              </span>
              <strong>{r.v === 0 ? '$0' : usd(r.v)}</strong>
            </div>
            <span className="nv-funnel-bar" aria-hidden>
              <span style={{ width: r.v === 0 ? '0%' : `${Math.max(2, (r.v / max) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="nv-panel-note">
        {c.costSplit} {t.costRates}
      </p>
    </section>
  )
}

function Queue({ t, lang, referrals }: { t: S; lang: Lang; referrals: Referral[] }) {
  const c = COPY[lang]
  return (
    <section aria-labelledby="nv-ops-queue" className="nv-panel nv-ops-queue">
      <div className="nv-panel-head">
        <h2 id="nv-ops-queue">
          {t.staffQueue} <span className="nv-count">{referrals.length}</span>
        </h2>
      </div>
      {referrals.length === 0 ? (
        <div className="nv-empty">
          <p>{c.queueEmpty}</p>
          <a href="/demo/navigator" target="_blank" rel="noopener" className="nv-btn nv-btn-secondary nv-btn-small">
            {c.openNavigatorNew}
            <Icon name="arrow" size={16} />
          </a>
        </div>
      ) : (
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-labelledby="nv-ops-queue">
          <table className="nv-table nv-table-ops">
            <thead>
              <tr>
                <th scope="col">{c.colCode}</th>
                <th scope="col">{c.colReceived}</th>
                <th scope="col">{c.colTo}</th>
                <th scope="col">{c.colNeeds}</th>
                <th scope="col">{c.colLang}</th>
                <th scope="col">{c.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => {
                const needs = r.shared.find((x) => x.label === t.fieldBarriers)?.value ?? '—'
                return (
                  <tr key={r.code}>
                    <td className="font-mono font-semibold">{r.code}</td>
                    <td>{new Date(r.createdAt).toLocaleString(lang === 'es' ? 'es-US' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>{r.partnerName}</td>
                    <td>{needs}</td>
                    <td>{LANG_NAMES[r.lang][lang]}</td>
                    <td>
                      {r.status === 'new' ? (
                        <button type="button" className="nv-btn nv-btn-secondary nv-btn-xs" onClick={() => setReferralStatus(r.code, 'contacted')}>
                          {t.staffMarkContacted}
                        </button>
                      ) : (
                        <span className="nv-state is-good">{t.staffContacted}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ResourceRow({ p, t, lang, onSaved }: { p: Partner; t: S; lang: Lang; onSaved: (m: string) => void }) {
  const c = COPY[lang]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ phone: p.phone, hoursEn: p.hours.en, hoursEs: p.hours.es, eligEn: p.eligibility.en, eligEs: p.eligibility.es })
  const stale = daysSince(p.lastVerified) > STALE_DAYS
  const verifiedToday = p.lastVerified === todayIso()
  const fid = (k: string) => `nv-${p.id}-${k}`
  return (
    <Fragment>
      <tr data-stale={stale}>
        <td>
          <span className="font-semibold">{p.name}</span>
          <span className="nv-id">{p.id}</span>
        </td>
        <td><span className="nv-cap">{BARRIER_NOUN[p.service][lang]}</span></td>
        <td>{p.regions === 'county' ? t.staffCountyWide : p.regions.map((r) => c.regions[r]).join(', ')}</td>
        <td className="nv-nowrap">{p.phone}</td>
        <td>
          {formatDate(p.lastVerified, lang)}
          {stale && <span className="nv-state is-warn">{t.staffStale}</span>}
        </td>
        <td className="nv-actions-cell">
          <button type="button" className="nv-btn nv-btn-ghost nv-btn-xs" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
            {t.staffEdit}
          </button>
          <button
            type="button"
            className="nv-btn nv-btn-secondary nv-btn-xs"
            disabled={verifiedToday}
            onClick={() => {
              savePartner(p.id, { lastVerified: todayIso() })
              onSaved(`${p.name}: ${t.staffVerifiedToday}.`)
            }}
          >
            <Icon name="check" size={14} />
            {verifiedToday ? t.staffVerifiedToday : t.staffMarkVerified}
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="nv-edit-row">
          <td colSpan={6}>
            <form
              className="nv-edit-form"
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
              <div className="nv-edit-actions">
                <button type="submit" className="nv-btn nv-btn-primary nv-btn-small">
                  {t.staffSave}
                </button>
                <button type="button" className="nv-btn nv-btn-ghost nv-btn-small" onClick={() => setEditing(false)}>
                  {t.staffCancel}
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function Resources({ t, lang, partners, onSaved }: { t: S; lang: Lang; partners: Partner[]; onSaved: (m: string) => void }) {
  const c = COPY[lang]
  const stale = partners.filter((p) => daysSince(p.lastVerified) > STALE_DAYS).length
  return (
    <section aria-labelledby="nv-ops-res" className="nv-panel nv-ops-res">
      <div className="nv-panel-head">
        <h2 id="nv-ops-res">
          {t.staffResources} <span className="nv-count">{partners.length}</span>
        </h2>
        <p className={`nv-state ${stale ? 'is-warn' : 'is-good'}`}>{stale ? c.staleCount(stale) : c.allFresh}</p>
      </div>
      <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-labelledby="nv-ops-res">
        <table className="nv-table nv-table-ops">
          <thead>
            <tr>
              <th scope="col">{c.colPartner}</th>
              <th scope="col">{c.colService}</th>
              <th scope="col">{c.colArea}</th>
              <th scope="col">{t.phone}</th>
              <th scope="col">{c.colVerified}</th>
              <th scope="col">
                <span className="sr-only">{c.colActions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <ResourceRow key={`${p.id}-${p.lastVerified}-${p.phone}-${p.hours.en}`} p={p} t={t} lang={lang} onSaved={onSaved} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CostLog({ calls, t, lang }: { calls: LoggedCall[]; t: S; lang: Lang }) {
  const c = COPY[lang]
  return (
    <section aria-labelledby="nv-ops-log" className="nv-panel nv-ops-log">
      <h2 id="nv-ops-log">{t.staffCostLog}</h2>
      {calls.length === 0 ? (
        <p className="nv-empty">{t.staffNoCalls}</p>
      ) : (
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-labelledby="nv-ops-log">
          <table className="nv-table nv-table-ops">
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
              {calls.slice(0, 40).map((x, i) => (
                <tr key={`${x.sessionId}-${x.at}-${i}`}>
                  <td className="font-mono text-xs">{x.sessionId.slice(-8)}</td>
                  <td>{x.step === 'parse' ? c.costRead : c.costWords}</td>
                  <td>{x.path === 'model' ? MODELS[x.step].label : `${c.costRulesShort}${x.reason ? ` (${x.reason})` : ''}`}</td>
                  <td className="num">{(x.inputTokens + x.outputTokens).toLocaleString()}</td>
                  <td className="num">{usd(x.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function Staff({ t, lang }: { t: S; lang: Lang }) {
  const c = COPY[lang]
  const { partners, referrals, calls } = useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const flash = (m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg(null), 4000)
  }
  return (
    <div className="nv-ops">
      <header className="nv-ops-head">
        <div>
          <h1>{c.opsH1}</h1>
          <p className="nv-muted">{c.opsIntro}</p>
        </div>
        <div className="nv-ops-tools">
          <a href="/demo/navigator" className="nv-btn nv-btn-secondary nv-btn-small">
            <Icon name="back" size={16} />
            {t.staffOpenNavigator}
          </a>
          <button
            type="button"
            className="nv-btn nv-btn-ghost nv-btn-small"
            onClick={() => {
              resetDemo()
              flash(t.staffResetDone)
            }}
          >
            {t.staffReset}
          </button>
        </div>
      </header>
      <p className={msg ? 'nv-toast' : 'sr-only'} role="status">
        {msg}
      </p>
      <div className="nv-ops-grid">
        <Queue t={t} lang={lang} referrals={referrals} />
        <Funnel lang={lang} referrals={referrals} calls={calls} />
        <Needs lang={lang} />
        <CostSplit t={t} lang={lang} />
        <Resources t={t} lang={lang} partners={partners} onSaved={flash} />
        <CostLog calls={calls} t={t} lang={lang} />
      </div>
    </div>
  )
}
