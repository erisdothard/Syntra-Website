import { useState } from 'react'
import { MODELS } from './config'
import { CostPanel } from './CostPanel'
import { SKILLS } from './data'
import { BARRIER_NOUN, formatDate, LANG_NAMES, money } from './i18n'
import type { ExplainOutcome } from './api'
import type { AiCall, CareerItem, Lang, Plan, SupportItem, TrainingItem } from './types'
import { Icon, IdTag, SampleTag, useScreenHeading, type S } from './ui'

export type ExplainState = { status: 'loading' } | { status: 'done'; outcome: ExplainOutcome }

function WhyNext({ t, why, next, ai }: { t: S; why: string; next: string; ai: boolean }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="nv-field-label">
          {t.why}
          {ai && <span className="sr-only"> (AI)</span>}
        </p>
        <p>{why}</p>
      </div>
      <div>
        <p className="nv-field-label">{t.next}</p>
        <p>{next}</p>
      </div>
    </div>
  )
}

function wording(item: { id: string; why: string; next: string }, explain: ExplainState | undefined) {
  if (explain?.status === 'done') {
    const w = explain.outcome.items[item.id]
    if (w) return { why: w.why, next: w.next, ai: true }
  }
  return { why: item.why, next: item.next, ai: false }
}

function SupportCard({ t, lang, item, explain, onSend }: { t: S; lang: Lang; item: SupportItem; explain?: ExplainState; onSend: () => void }) {
  const p = item.partner
  const w = wording(item, explain)
  return (
    <li className="nv-card space-y-3">
      <div className="space-y-2">
        <h3>{p.name}</h3>
        <div className="nv-meta">
          <span className="nv-pill">{BARRIER_NOUN[p.service][lang]}</span>
          <IdTag id={p.id} t={t} />
          <SampleTag t={t} />
        </div>
      </div>
      <WhyNext t={t} {...w} />
      <dl className="nv-dl">
        <dt>{t.phone}</dt>
        <dd>
          <a href={`tel:${p.phone.replace(/\D/g, '')}`}>{p.phone}</a>
        </dd>
        <dt>{t.hours}</dt>
        <dd>{p.hours[lang]}</dd>
        <dt>{t.eligibility}</dt>
        <dd>{p.eligibility[lang]}</dd>
        <dt>{t.languages}</dt>
        <dd>{p.languages.map((l) => LANG_NAMES[l][lang]).join(', ')}</dd>
        <dt>{t.lastVerified}</dt>
        <dd>{formatDate(p.lastVerified, lang)}</dd>
      </dl>
      <button type="button" className="nv-btn nv-btn-secondary nv-btn-block nv-noprint" onClick={onSend}>
        <Icon name="person" size={18} />
        {t.sendToPerson}
      </button>
    </li>
  )
}

function CareerCard({ t, lang, item, explain }: { t: S; lang: Lang; item: CareerItem; explain?: ExplainState }) {
  const o = item.occupation
  const w = wording(item, explain)
  const meets = item.wageGap >= 0
  const pctOfLiving = Math.min(100, Math.round((o.sampleMedianWage / item.livingWage) * 100))
  return (
    <li className="nv-card space-y-3">
      <div className="space-y-2">
        <h3>{o.title[lang]}</h3>
        <div className="nv-meta">
          <span className="nv-pill">{o.cluster[lang]}</span>
          <IdTag id={o.id} t={t} />
          <SampleTag t={t} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="nv-small nv-muted">{t.sampleWage}</p>
          <p className="text-xl font-bold">
            {money(o.sampleMedianWage, lang)}
            <span className="text-base font-medium">{t.perHour}</span>
          </p>
          <p className="nv-small">
            {t.livingWage}: {money(item.livingWage, lang)}
            {t.perHour}
          </p>
          <div className="nv-meter" aria-hidden>
            <span className={meets ? 'nv-meter-good' : 'nv-meter-warn'} style={{ width: `${pctOfLiving}%` }} />
          </div>
          <p className={`nv-tag nv-tag-wrap ${meets ? 'nv-tag-good' : 'nv-tag-warn'}`}>
            {meets ? t.meetsLiving : t.belowLiving(money(-item.wageGap, lang))}
          </p>
        </div>
        <div className="space-y-1">
          <p className="nv-small nv-muted">{t.skillOverlap}</p>
          <p className="text-xl font-bold">{item.overlapPct}%</p>
          <div className="nv-meter" aria-hidden>
            <span style={{ width: `${item.overlapPct}%` }} />
          </div>
        </div>
      </div>

      {item.haveSkills.length > 0 && (
        <div>
          <p className="nv-field-label">{t.skillsHave}</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {item.haveSkills.map((s) => (
              <li key={s} className="nv-pill nv-pill-have">
                {SKILLS[s][lang]}
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.missingSkills.length > 0 && (
        <div>
          <p className="nv-field-label">{t.skillsBuild}</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {item.missingSkills.map((s) => (
              <li key={s} className="nv-pill nv-pill-build">
                {SKILLS[s][lang]}
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.needsCredential && <p className="nv-note nv-note-rules nv-small">{t.needsCredential}</p>}
      <WhyNext t={t} {...w} />
    </li>
  )
}

function TrainingCard({ t, lang, item, explain }: { t: S; lang: Lang; item: TrainingItem; explain?: ExplainState }) {
  const p = item.program
  const w = wording(item, explain)
  return (
    <li className="nv-card space-y-3">
      <div className="space-y-2">
        <h3>{p.title[lang]}</h3>
        <p className="nv-small nv-muted">{p.provider[lang]}</p>
        <div className="nv-meta">
          <IdTag id={p.id} t={t} />
          <SampleTag t={t} />
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        <li className="nv-pill">{t.weeks(p.weeks)}</li>
        <li className="nv-pill">{t.cost[p.cost]}</li>
        <li className="nv-pill">{t.schedule[p.schedule]}</li>
        <li className="nv-pill">{p.languages.map((l) => LANG_NAMES[l][lang]).join(' / ')}</li>
      </ul>
      {item.closes.length > 0 && (
        <p className="nv-small">
          <span className="font-semibold">{t.closes}: </span>
          {item.closes.map((s) => SKILLS[s][lang]).join(', ')}
        </p>
      )}
      <WhyNext t={t} {...w} />
    </li>
  )
}

export function planAsText(plan: Plan, lang: Lang, t: S, explain?: ExplainState): string {
  const lines: string[] = [`${t.title} — ${t.planH1}`, t.sampleBanner, '']
  lines.push(`== ${t.steadyH2} ==`)
  if (plan.support.length === 0) lines.push(t.steadyNone)
  for (const s of plan.support) {
    const w = wording(s, explain)
    lines.push(`• ${s.partner.name} [${s.id}] — ${s.partner.phone}, ${s.partner.hours[lang]}`, `  ${w.next}`)
  }
  lines.push('', `== ${t.careerH2} ==`)
  for (const c of plan.career) {
    const w = wording(c, explain)
    lines.push(
      `• ${c.occupation.title[lang]} [${c.id}] — ${money(c.occupation.sampleMedianWage, lang)}${t.perHour}, ${c.overlapPct}%`,
      `  ${w.next}`,
    )
  }
  lines.push('', `== ${t.trainingH2} ==`)
  for (const p of plan.training) {
    const w = wording(p, explain)
    lines.push(`• ${p.program.title[lang]} [${p.id}] — ${t.weeks(p.program.weeks)}`, `  ${w.next}`)
  }
  lines.push('', t.footer)
  return lines.join('\n')
}

export function PlanView({
  t,
  lang,
  plan,
  explain,
  calls,
  crisisChecks,
  onSend,
  onStartOver,
  onEdit,
}: {
  t: S
  lang: Lang
  plan: Plan
  explain?: ExplainState
  calls: AiCall[]
  crisisChecks: number
  onSend: (partnerId: string | null) => void
  onStartOver: () => void
  onEdit: () => void
}) {
  const h = useScreenHeading<HTMLHeadingElement>('plan')
  const [showHow, setShowHow] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const explainCall = explain?.status === 'done' ? explain.outcome.call : null
  const aiCount = explain?.status === 'done' ? Object.keys(explain.outcome.items).length : 0

  const copy = async () => {
    const text = planAsText(plan, lang, t, explain)
    try {
      await navigator.clipboard.writeText(text)
      setToast(t.copied)
    } catch {
      // Clipboard blocked: fall back to a download.
      const blob = new Blob([text], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'my-plan.txt'
      a.click()
      setToast(t.copied)
    }
    window.setTimeout(() => setToast(null), 3500)
  }

  return (
    <section aria-labelledby="nv-h1" className="space-y-6">
      <div className="space-y-2">
        <h1 id="nv-h1" ref={h} tabIndex={-1}>
          {t.planH1}
        </h1>
        <p>{t.planIntro}</p>
        <div aria-live="polite">
          {explain?.status === 'loading' ? (
            <p className="nv-note nv-note-rules flex items-center gap-3 nv-small">
              <span className="nv-spinner" aria-hidden />
              {t.explainLoading}
            </p>
          ) : explainCall?.path === 'model' && aiCount > 0 ? (
            <p className="nv-note nv-note-ai nv-small">
              <span className="nv-tag nv-tag-ai mr-2">AI</span>
              {t.explainModel.replace('Claude Sonnet 5.5', MODELS.explain.label)}
            </p>
          ) : (
            <p className="nv-note nv-note-rules nv-small">
              <span className="nv-tag nv-tag-id mr-2">{lang === 'es' ? 'REGLAS' : 'RULES'}</span>
              {t.explainRules}
            </p>
          )}
        </div>
      </div>

      <ol className="nv-route">
      <li className="nv-stop">
      <span className="nv-stop-mark" aria-hidden>1</span>
      <section aria-labelledby="nv-steady" className="space-y-3">
        <div>
          <h2 id="nv-steady">{t.steadyH2}</h2>
          <p className="nv-muted">{t.steadyIntro}</p>
        </div>
        {plan.support.length === 0 && plan.supportGaps.length === 0 && <p className="nv-note">{t.steadyNone}</p>}
        <ul className="space-y-3">
          {plan.support.map((s) => (
            <SupportCard key={s.id} t={t} lang={lang} item={s} explain={explain} onSend={() => onSend(s.partner.id)} />
          ))}
        </ul>
        {plan.supportGaps.map((g) => (
          <p key={g} className="nv-note nv-note-rules">
            {t.steadyGap(BARRIER_NOUN[g][lang])}
          </p>
        ))}
      </section>

      </li>
      <li className="nv-stop">
      <span className="nv-stop-mark" aria-hidden>2</span>
      <section aria-labelledby="nv-career" className="space-y-3">
        <div>
          <h2 id="nv-career">{t.careerH2}</h2>
          <p className="nv-muted">{t.careerIntro}</p>
        </div>
        <ul className="space-y-3">
          {plan.career.map((c) => (
            <CareerCard key={c.id} t={t} lang={lang} item={c} explain={explain} />
          ))}
        </ul>
      </section>

      </li>
      <li className="nv-stop">
      <span className="nv-stop-mark" aria-hidden>3</span>
      <section aria-labelledby="nv-training" className="space-y-3">
        <div>
          <h2 id="nv-training">{t.trainingH2}</h2>
          <p className="nv-muted">{t.trainingIntro}</p>
        </div>
        {plan.training.length === 0 && <p className="nv-note">{t.trainingNone}</p>}
        <ul className="space-y-3">
          {plan.training.map((p) => (
            <TrainingCard key={p.id} t={t} lang={lang} item={p} explain={explain} />
          ))}
        </ul>
      </section>
      </li>
      </ol>

      <div className="nv-noprint flex flex-col gap-3">
        <button type="button" className="nv-btn nv-btn-primary nv-btn-block" onClick={() => onSend(null)}>
          <Icon name="person" />
          {t.sendToPerson}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="nv-btn nv-btn-secondary" onClick={copy}>
            <Icon name="text" size={18} />
            {t.saveText}
          </button>
          <button type="button" className="nv-btn nv-btn-secondary" onClick={() => window.print()}>
            {t.printPlan}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="nv-btn nv-btn-ghost" onClick={onEdit}>
            <Icon name="back" size={18} />
            {t.heardH1}
          </button>
          <button type="button" className="nv-btn nv-btn-ghost" onClick={onStartOver}>
            {t.startOver}
          </button>
        </div>
      </div>

      <div className="nv-noprint space-y-3">
        <button
          type="button"
          className="nv-btn nv-btn-secondary nv-btn-block"
          aria-expanded={showHow}
          aria-controls="nv-how"
          onClick={() => setShowHow((v) => !v)}
        >
          <Icon name="info" size={18} />
          {showHow ? t.hideHowItWorks : t.howItWorks}
        </button>
        <div id="nv-how" hidden={!showHow}>
          {showHow && <CostPanel t={t} lang={lang} calls={calls} crisisChecks={crisisChecks} />}
        </div>
      </div>

      <p className={toast ? 'nv-toast' : 'sr-only'} role="status">
        {toast}
      </p>
    </section>
  )
}
