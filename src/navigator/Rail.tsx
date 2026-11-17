import { useEffect, useState } from 'react'
import { MODELS } from './config'
import { COPY } from './copy'
import { usd } from './i18n'
import type { Removed } from './text'
import type { AiCall, Lang, Profile } from './types'
import type { S } from './ui'
import { fieldLabel, profileValue, QUESTION_ORDER, type ParseInfo, type QuestionKey } from './view'

/**
 * The workspace's right-hand rail. On a laptop it sits beside the flow and shows
 * the two things evaluators most need to see happen: the profile being built from
 * the person's own words, and what each step cost. On a phone it folds into one
 * disclosure under the flow.
 */

function isAnswered(q: QuestionKey, p: Profile): boolean {
  switch (q) {
    case 'goal':
      return p.goal !== null
    case 'barriers':
      return p.barriersAnswered
    case 'education':
      return p.education !== null
    case 'lastJob':
      return p.lastJob !== null
    case 'zip':
      return p.zip !== null || p.zipSkipped
    case 'household':
      return p.household !== null
  }
}

function LiveProfile({ t, lang, profile, parse }: { t: S; lang: Lang; profile: Profile; parse: ParseInfo | null }) {
  const c = COPY[lang]
  const any = QUESTION_ORDER.some((q) => isAnswered(q, profile))
  const removedLabel: Record<Removed, string> = { name: t.removedName, phone: t.removedPhone, email: t.removedEmail, id: t.removedId }
  return (
    <section aria-labelledby="nv-rail-heard" className="nv-rail-block">
      <h2 id="nv-rail-heard" className="nv-rail-h">
        {c.railHeard}
      </h2>
      {!any && <p className="nv-rail-empty">{c.railHeardEmpty}</p>}
      <dl className="nv-facts">
        {QUESTION_ORDER.map((q) => {
          const done = isAnswered(q, profile)
          const fromText = parse?.fromText.includes(q)
          const src = !done ? null : fromText ? (parse?.call.path === 'model' ? 'ai' : 'rules') : 'tap'
          const value = done ? profileValue(q, profile, lang, t) : ''
          return (
            <div key={q} className="nv-fact" data-done={done}>
              <dt>{fieldLabel(q, t)}</dt>
              <dd>
                {done ? (
                  <span key={value} className="nv-fact-value">
                    {value}
                  </span>
                ) : (
                  <span className="nv-fact-blank" aria-label={t.notAnswered} />
                )}
                {src && (
                  <span className={`nv-src nv-src-${src}`}>{src === 'ai' ? c.srcAi : src === 'rules' ? c.srcRules : c.srcTap}</span>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      {parse && parse.removed.length > 0 && (
        <p className="nv-rail-note">{c.removedNote(parse.removed.map((r) => removedLabel[r]).join(', '))}</p>
      )}
    </section>
  )
}

export function HowItDecides({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  return (
    <section aria-labelledby="nv-rail-how" className="nv-rail-block">
      <h2 id="nv-rail-how" className="nv-rail-h">
        {c.railHow}
      </h2>
      <ol className="nv-how">
        {c.howSteps.map((s, i) => (
          <li key={s.h} className="nv-how-step">
            <span className="nv-how-n" aria-hidden>
              {i + 1}
            </span>
            <div>
              <p className="nv-how-h">{s.h}</p>
              <p className="nv-how-p">{s.p}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function SessionCost({ lang, calls, crisisChecks }: { lang: Lang; calls: AiCall[]; crisisChecks: number }) {
  const c = COPY[lang]
  const of = (step: AiCall['step']) => calls.filter((x) => x.step === step)
  const line = (cs: AiCall[], step: 'parse' | 'explain') => {
    if (cs.length === 0) return { how: c.costPending, tokens: '—', cost: '—', model: false }
    const model = cs.some((x) => x.path === 'model')
    const tin = cs.reduce((s, x) => s + x.inputTokens, 0)
    const tout = cs.reduce((s, x) => s + x.outputTokens, 0)
    return {
      how: model ? MODELS[step].label.replace('Claude ', '') : c.costRulesShort,
      tokens: `${(tin + tout).toLocaleString()}`,
      cost: usd(cs.reduce((s, x) => s + x.costUsd, 0)),
      model,
    }
  }
  const parse = line(of('parse'), 'parse')
  const explain = line(of('explain'), 'explain')
  const total = calls.reduce((s, x) => s + x.costUsd, 0)
  const rows = [
    { step: c.costSafety, how: `${c.costRulesShort}${crisisChecks ? ` ×${crisisChecks}` : ''}`, tokens: '0', cost: '$0', model: false },
    { step: c.costPrivacy, how: c.costRulesShort, tokens: '0', cost: '$0', model: false },
    { step: c.costRead, ...parse },
    { step: c.costMatch, how: c.costRulesShort, tokens: '0', cost: '$0', model: false },
    { step: c.costWords, ...explain },
  ]
  return (
    <section aria-labelledby="nv-rail-cost" className="nv-rail-block">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="nv-rail-cost" className="nv-rail-h">
          {c.railCost}
        </h2>
        <p className="nv-cost-total">
          <span className="sr-only">{c.costTotal}: </span>
          {usd(total)}
        </p>
      </div>
      <table className="nv-cost">
        <caption className="sr-only">{c.railCost}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Step</th>
            <th scope="col">How</th>
            <th scope="col">USD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.step} data-model={r.model}>
              <th scope="row">{r.step}</th>
              <td className="nv-cost-how">
                {r.how}
                {r.model && <span className="nv-cost-tok">{r.tokens} tokens</span>}
              </td>
              <td className="num">{r.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nv-rail-note">{c.railCostNote}</p>
    </section>
  )
}

export function Rail({
  t,
  lang,
  profile,
  parse,
  calls,
  crisisChecks,
  showHow,
}: {
  t: S
  lang: Lang
  profile: Profile
  parse: ParseInfo | null
  calls: AiCall[]
  crisisChecks: number
  showHow: boolean
}) {
  const c = COPY[lang]
  const wide = useWide()
  const body = (
    <>
      {showHow ? <HowItDecides lang={lang} /> : <LiveProfile t={t} lang={lang} profile={profile} parse={parse} />}
      <SessionCost lang={lang} calls={calls} crisisChecks={crisisChecks} />
    </>
  )
  return (
    <aside className="nv-rail nv-noprint" aria-label={c.railToggle}>
      {wide ? (
        <div className="nv-rail-wide">{body}</div>
      ) : (
        <details className="nv-rail-narrow">
          <summary>
            <span>{c.railToggle}</span>
            <span className="nv-cost-total">{usd(calls.reduce((s, x) => s + x.costUsd, 0))}</span>
          </summary>
          <div className="nv-rail-narrow-body">{body}</div>
        </details>
      )}
    </aside>
  )
}

/** True on laptop widths, where the rail sits beside the flow instead of folding under it. */
export function useWide(query = '(min-width: 1024px)'): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return wide
}
