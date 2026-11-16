import { LAST_JOBS } from './data'
import { BARRIER_LABELS, EDUCATION_LABELS, GOAL_LABELS, HOUSEHOLD_LABELS } from './i18n'
import type { QuestionKey } from './Intake'
import type { Removed } from './text'
import type { AiCall, Lang, Profile } from './types'
import { Icon, useScreenHeading, type S } from './ui'

export interface ParseInfo {
  call: AiCall
  removed: Removed[]
  /** Fields that were filled from the person's own words. */
  fromText: QuestionKey[]
}

export function profileValue(q: QuestionKey, p: Profile, lang: Lang, t: S): string {
  switch (q) {
    case 'goal':
      return p.goal ? GOAL_LABELS[p.goal][lang] : t.notAnswered
    case 'barriers':
      if (!p.barriersAnswered && p.barriers.length === 0) return t.notAnswered
      return p.barriers.length ? p.barriers.map((b) => BARRIER_LABELS[b][lang]).join(', ') : t.noBarriers
    case 'education':
      return p.education ? EDUCATION_LABELS[p.education][lang] : t.notAnswered
    case 'lastJob': {
      if (!p.lastJob) return t.notAnswered
      const label = LAST_JOBS.find((j) => j.id === p.lastJob)?.label[lang] ?? p.lastJob
      return p.lastJobText ? `${label} (“${p.lastJobText}”)` : label
    }
    case 'zip':
      return p.zip ?? (p.zipSkipped ? t.skipped : t.notAnswered)
    case 'household':
      return p.household ? HOUSEHOLD_LABELS[p.household][lang] : t.notAnswered
  }
}

export function fieldLabel(q: QuestionKey, t: S): string {
  return {
    goal: t.fieldGoal,
    barriers: t.fieldBarriers,
    education: t.fieldEducation,
    lastJob: t.fieldLastJob,
    zip: t.fieldZip,
    household: t.fieldHousehold,
  }[q]
}

export function Heard({
  t,
  lang,
  profile,
  order,
  parse,
  onChange,
  onConfirm,
}: {
  t: S
  lang: Lang
  profile: Profile
  order: QuestionKey[]
  parse: ParseInfo | null
  onChange: (q: QuestionKey) => void
  onConfirm: () => void
}) {
  const h = useScreenHeading<HTMLHeadingElement>('heard')
  const removedLabel: Record<Removed, string> = {
    name: t.removedName,
    phone: t.removedPhone,
    email: t.removedEmail,
    id: t.removedId,
  }
  return (
    <section aria-labelledby="nv-h1" className="space-y-5">
      <h1 id="nv-h1" ref={h} tabIndex={-1}>
        {t.heardH1}
      </h1>
      <p>{t.heardBody}</p>

      {parse && (
        <div className={`nv-note ${parse.call.path === 'model' ? 'nv-note-ai' : 'nv-note-rules'} space-y-1`}>
          <p className="flex flex-wrap items-center gap-2">
            <span className={`nv-tag ${parse.call.path === 'model' ? 'nv-tag-ai' : 'nv-tag-id'}`}>
              {parse.call.path === 'model' ? 'AI' : lang === 'es' ? 'REGLAS' : 'RULES'}
            </span>
            <span>{parse.call.path === 'model' ? t.readByModel : t.readByRules}</span>
          </p>
          {parse.call.path === 'rules' && parse.call.reason && t.readByRulesWhy[parse.call.reason] && (
            <p className="nv-small">{t.readByRulesWhy[parse.call.reason]}</p>
          )}
          {parse.removed.length > 0 && (
            <p className="nv-small">
              {t.removedBefore} {parse.removed.map((r) => removedLabel[r]).join(', ')}.
            </p>
          )}
        </div>
      )}

      <div className="nv-card p-0">
        <ul className="divide-y divide-[#d3d9d1]">
          {order.map((q) => (
            <li key={q} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="nv-muted nv-small">{fieldLabel(q, t)}</p>
                <p className="font-semibold break-words">{profileValue(q, profile, lang, t)}</p>
                {parse?.fromText.includes(q) && (
                  <p className="nv-from-text mt-1">
                    <Icon name="text" size={14} />
                    {t.fromText}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="nv-btn nv-btn-secondary nv-btn-small flex-none"
                onClick={() => onChange(q)}
                aria-label={`${t.change}: ${fieldLabel(q, t)}`}
              >
                {t.change}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="nv-btn nv-btn-primary nv-btn-block" onClick={onConfirm}>
        {t.looksRight}
        <Icon name="arrow" />
      </button>
    </section>
  )
}
