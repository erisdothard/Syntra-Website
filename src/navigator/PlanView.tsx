import { useState } from 'react'
import { MODELS } from './config'
import { COPY } from './copy'
import { SKILLS } from './data'
import { BARRIER_NOUN, LANG_NAMES, money } from './i18n'
import type { CareerItem, Lang, Plan, SupportItem, TrainingItem } from './types'
import { Icon, IdTag, type S } from './ui'
import { planAsText, useScreenHeading, wording, type ExplainState } from './view'

/**
 * The plan. Order is fixed by the product (steady things, then jobs, then
 * training), but the jobs are the part that changes a life, so they carry the
 * one strong visual on the page: pay against the living wage, drawn to scale.
 */

function Wording({ t, why, next, ai, loading }: { t: S; why: string; next: string; ai: boolean; loading: boolean }) {
  return (
    <div className="nv-wording" data-loading={loading}>
      <p>
        <span className="nv-wording-k">{t.why}</span>
        {why}
        {ai && <span className="sr-only"> (AI)</span>}
      </p>
      <p>
        <span className="nv-wording-k">{t.next}</span>
        {next}
      </p>
    </div>
  )
}

function SupportRow({ t, lang, item, explain, onSend }: { t: S; lang: Lang; item: SupportItem; explain?: ExplainState; onSend: () => void }) {
  const c = COPY[lang]
  const p = item.partner
  const w = wording(item, explain)
  return (
    <li className="nv-support">
      <div className="nv-support-main">
        <div className="nv-support-title">
          <h3>{p.name}</h3>
          <span className="nv-pill">{BARRIER_NOUN[p.service][lang]}</span>
          <IdTag id={p.id} t={t} />
        </div>
        <Wording t={t} {...w} loading={explain?.status === 'loading'} />
      </div>
      <div className="nv-support-side">
        <a className="nv-phone" href={`tel:${p.phone.replace(/\D/g, '')}`}>
          <Icon name="phone" size={16} />
          <span className="sr-only">{c.callLabel} </span>
          {p.phone}
        </a>
        <p className="nv-small nv-muted">{p.hours[lang]}</p>
        <p className="nv-small nv-muted">{p.languages.map((l) => LANG_NAMES[l][lang]).join(' · ')}</p>
        <button type="button" className="nv-btn nv-btn-secondary nv-btn-small nv-noprint" onClick={onSend}>
          <Icon name="person" size={16} />
          {c.send}
        </button>
      </div>
    </li>
  )
}

function JobRow({
  t,
  lang,
  item,
  scale,
  first,
  explain,
}: {
  t: S
  lang: Lang
  item: CareerItem
  scale: number
  first: boolean
  explain?: ExplainState
}) {
  const c = COPY[lang]
  const o = item.occupation
  const meets = item.wageGap >= 0
  const w = wording(item, explain)
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100).toFixed(2)}%`
  return (
    <li className="nv-job">
      <div className="nv-job-row">
        <div className="nv-job-name">
          <h3>{o.title[lang]}</h3>
          <p className="nv-small nv-muted">
            {o.cluster[lang]} · {c.demand[o.demand - 1]}
          </p>
        </div>
        <div className="nv-job-chart" aria-hidden>
          <div className="nv-bar">
            <span className={`nv-bar-fill ${meets ? 'is-good' : 'is-short'}`} style={{ width: pct(o.sampleMedianWage) }} />
            <span className="nv-living" style={{ left: pct(item.livingWage) }}>
              {first && (
                <span className="nv-living-label">
                  {c.livingLine} {money(item.livingWage, lang)}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="nv-job-pay">
          <p className="nv-pay">
            {money(o.sampleMedianWage, lang)}
            <span>{c.perHr}</span>
          </p>
          <p className={`nv-delta ${meets ? 'is-good' : 'is-short'}`}>
            {meets ? c.overGap(money(item.wageGap, lang)) : c.underGap(money(-item.wageGap, lang))}
          </p>
        </div>
      </div>
      <div className="nv-job-detail">
        <div className="nv-skills">
          <div className="nv-overlap">
            <span className="nv-overlap-n">{item.overlapPct}%</span>
            <span className="nv-small">{t.skillOverlap}</span>
            <span className="nv-meter" aria-hidden>
              <span style={{ width: `${item.overlapPct}%` }} />
            </span>
          </div>
          {item.haveSkills.length > 0 && (
            <ul className="nv-chips" aria-label={t.skillsHave}>
              {item.haveSkills.map((s) => (
                <li key={s} className="nv-chip is-have">
                  <Icon name="check" size={12} />
                  {SKILLS[s][lang]}
                </li>
              ))}
            </ul>
          )}
          {item.missingSkills.length > 0 && (
            <ul className="nv-chips" aria-label={t.skillsBuild}>
              {item.missingSkills.map((s) => (
                <li key={s} className="nv-chip is-build">
                  {SKILLS[s][lang]}
                </li>
              ))}
            </ul>
          )}
          {item.needsCredential && <p className="nv-small nv-flag">{t.needsCredential}</p>}
        </div>
        <Wording t={t} {...w} loading={explain?.status === 'loading'} />
      </div>
      <p className="sr-only">
        {t.sampleWage}: {money(o.sampleMedianWage, lang)}
        {c.perHr}. {t.livingWage}: {money(item.livingWage, lang)}
        {c.perHr}.
      </p>
    </li>
  )
}

function TrainingRow({ t, lang, item, plan, explain }: { t: S; lang: Lang; item: TrainingItem; plan: Plan; explain?: ExplainState }) {
  const c = COPY[lang]
  const p = item.program
  const w = wording(item, explain)
  const opens = item.forOccupations
    .map((id) => plan.career.find((x) => x.id === id || x.occupation.id === id)?.occupation.title[lang])
    .filter((x): x is string => !!x)
  return (
    <li className="nv-train">
      <div className="nv-train-head">
        <div>
          <h3>{p.title[lang]}</h3>
          <p className="nv-small nv-muted">
            {p.provider[lang]} · <IdTag id={p.id} t={t} />
          </p>
        </div>
        <ul className="nv-facts-inline">
          <li>{t.weeks(p.weeks)}</li>
          <li>{t.cost[p.cost]}</li>
          <li>{t.schedule[p.schedule]}</li>
          <li>{p.languages.map((l) => LANG_NAMES[l][lang]).join(' / ')}</li>
        </ul>
      </div>
      {opens.length > 0 && (
        <p className="nv-opens">
          <span>{c.unlocks}</span>
          {opens.map((o) => (
            <strong key={o}>{o}</strong>
          ))}
        </p>
      )}
      {item.closes.length > 0 && (
        <ul className="nv-chips" aria-label={t.closes}>
          {item.closes.map((s) => (
            <li key={s} className="nv-chip is-build">
              {SKILLS[s][lang]}
            </li>
          ))}
        </ul>
      )}
      <Wording t={t} {...w} loading={explain?.status === 'loading'} />
    </li>
  )
}

export function PlanView({
  t,
  lang,
  plan,
  explain,
  onSend,
  onStartOver,
  onEdit,
}: {
  t: S
  lang: Lang
  plan: Plan
  explain?: ExplainState
  onSend: (partnerId: string | null) => void
  onStartOver: () => void
  onEdit: () => void
}) {
  const h = useScreenHeading<HTMLHeadingElement>('plan')
  const c = COPY[lang]
  const [toast, setToast] = useState<string | null>(null)
  const explainCall = explain?.status === 'done' ? explain.outcome.call : null
  const aiCount = explain?.status === 'done' ? Object.keys(explain.outcome.items).length : 0
  const meets = plan.career.filter((x) => x.wageGap >= 0).length
  const scale = Math.max(plan.livingWage, ...plan.career.map((x) => x.occupation.sampleMedianWage)) * 1.12

  const copy = async () => {
    const text = planAsText(plan, lang, t, explain)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const blob = new Blob([text], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'my-plan.txt'
      a.click()
    }
    setToast(t.copied)
    window.setTimeout(() => setToast(null), 3500)
  }

  return (
    <section aria-labelledby="nv-h1" className="nv-plan">
      <header className="nv-plan-head">
        <div className="space-y-2">
          <h1 id="nv-h1" ref={h} tabIndex={-1}>
            {t.planH1}
          </h1>
          <p className="nv-plan-summary">{c.planSummary(plan.support.length, meets, plan.career.length, money(plan.livingWage, lang))}</p>
          <p className="nv-status" aria-live="polite">
            {explain?.status === 'loading' ? (
              <>
                <span className="nv-dot is-busy" aria-hidden />
                {t.explainLoading}
              </>
            ) : explainCall?.path === 'model' && aiCount > 0 ? (
              <>
                <span className="nv-dot is-ai" aria-hidden />
                {t.explainModel.replace('Claude Sonnet 5.5', MODELS.explain.label)}
              </>
            ) : (
              <>
                <span className="nv-dot" aria-hidden />
                {t.explainRules}
              </>
            )}
          </p>
        </div>
        <div className="nv-plan-actions nv-noprint">
          <button type="button" className="nv-btn nv-btn-primary" onClick={() => onSend(null)}>
            <Icon name="person" size={18} />
            {t.sendToPerson}
          </button>
          <button type="button" className="nv-btn nv-btn-secondary" onClick={copy}>
            <Icon name="text" size={18} />
            {t.saveText}
          </button>
          <button type="button" className="nv-btn nv-btn-secondary" onClick={() => window.print()}>
            {t.printPlan}
          </button>
        </div>
      </header>

      <section aria-labelledby="nv-steady" className="nv-part">
        <div className="nv-part-head">
          <span className="nv-step-n" aria-hidden>
            1
          </span>
          <div>
            <h2 id="nv-steady">{t.steadyH2}</h2>
            <p className="nv-muted">{t.steadyIntro}</p>
          </div>
        </div>
        {plan.support.length === 0 && plan.supportGaps.length === 0 && <p className="nv-note">{t.steadyNone}</p>}
        {plan.support.length > 0 && (
          <ul className="nv-list">
            {plan.support.map((s) => (
              <SupportRow key={s.id} t={t} lang={lang} item={s} explain={explain} onSend={() => onSend(s.partner.id)} />
            ))}
          </ul>
        )}
        {plan.supportGaps.map((g) => (
          <p key={g} className="nv-note nv-note-rules">
            {t.steadyGap(BARRIER_NOUN[g][lang])}
          </p>
        ))}
      </section>

      <section aria-labelledby="nv-career" className="nv-part">
        <div className="nv-part-head">
          <span className="nv-step-n" aria-hidden>
            2
          </span>
          <div>
            <h2 id="nv-career">{c.jobsH2}</h2>
            <p className="nv-muted">{c.jobsIntro}</p>
          </div>
        </div>
        <ul className="nv-list nv-jobs">
          {plan.career.map((x, i) => (
            <JobRow key={x.id} t={t} lang={lang} item={x} scale={scale} first={i === 0} explain={explain} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="nv-training" className="nv-part">
        <div className="nv-part-head">
          <span className="nv-step-n" aria-hidden>
            3
          </span>
          <div>
            <h2 id="nv-training">{c.trainingH2}</h2>
            <p className="nv-muted">{t.trainingIntro}</p>
          </div>
        </div>
        {plan.training.length === 0 ? (
          <p className="nv-note">{t.trainingNone}</p>
        ) : (
          <ul className="nv-list">
            {plan.training.map((p) => (
              <TrainingRow key={p.id} t={t} lang={lang} item={p} plan={plan} explain={explain} />
            ))}
          </ul>
        )}
      </section>

      <div className="nv-plan-foot nv-noprint">
        <button type="button" className="nv-btn nv-btn-primary" onClick={() => onSend(null)}>
          <Icon name="person" size={18} />
          {t.sendToPerson}
        </button>
        <button type="button" className="nv-btn nv-btn-ghost" onClick={onEdit}>
          <Icon name="back" size={18} />
          {t.heardH1}
        </button>
        <button type="button" className="nv-btn nv-btn-ghost" onClick={onStartOver}>
          {t.startOver}
        </button>
      </div>

      <p className={toast ? 'nv-toast' : 'sr-only'} role="status">
        {toast}
      </p>
    </section>
  )
}
