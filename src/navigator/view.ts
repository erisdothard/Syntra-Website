import { useEffect, useRef } from 'react'
import type { ExplainOutcome } from './api'
import { LAST_JOBS, CAREER_CENTER } from './data'
import { BARRIER_LABELS, EDUCATION_LABELS, GOAL_LABELS, HOUSEHOLD_LABELS, LANG_NAMES, money, STRINGS } from './i18n'
import type { AiCall, Lang, Plan, Profile } from './types'
import type { Removed } from './text'

/** Shared, non-component helpers for the navigator screens. */

export interface ParseInfo {
  call: AiCall
  removed: Removed[]
  /** Fields that were filled from the person's own words. */
  fromText: QuestionKey[]
}

export type S = (typeof STRINGS)[Lang]

export type QuestionKey = 'goal' | 'barriers' | 'education' | 'lastJob' | 'zip' | 'household'
export const QUESTION_ORDER: QuestionKey[] = ['goal', 'barriers', 'education', 'lastJob', 'zip', 'household']

export type ExplainState = { status: 'loading' } | { status: 'done'; outcome: ExplainOutcome }

export function wording(item: { id: string; why: string; next: string }, explain: ExplainState | undefined) {
  if (explain?.status === 'done') {
    const w = explain.outcome.items[item.id]
    if (w) return { why: w.why, next: w.next, ai: true }
  }
  return { why: item.why, next: item.next, ai: false }
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

export interface Destination {
  partnerId: string
  partnerName: string
  phone: string
  hours: string
}

export function careerCenterDestination(lang: Lang): Destination {
  return { partnerId: CAREER_CENTER.id, partnerName: CAREER_CENTER.name, phone: CAREER_CENTER.phone, hours: CAREER_CENTER.hours[lang] }
}

/** Exactly the rows a referral carries. The consent screen shows this list and the queue stores this list. */
export function sharedRows(
  profile: Profile,
  plan: Plan | null,
  lang: Lang,
  t: S,
  contact: string,
): { label: string; value: string }[] {
  const order: QuestionKey[] = ['goal', 'barriers', 'education', 'lastJob', 'zip', 'household']
  const rows = order.map((q) => {
    // The job category only: never the words the person typed.
    const value =
      q === 'lastJob' && profile.lastJob
        ? LAST_JOBS.find((j) => j.id === profile.lastJob)?.label[lang] ?? profile.lastJob
        : profileValue(q, profile, lang, t)
    return { label: fieldLabel(q, t), value }
  })
  const items = plan ? [...plan.support, ...plan.career, ...plan.training] : []
  rows.push({
    label: t.consentPlanItems,
    value: items.length
      ? items
          .map((i) =>
            i.kind === 'support' ? `${i.partner.name} (${i.id})` : i.kind === 'career' ? `${i.occupation.title[lang]} (${i.id})` : `${i.program.title[lang]} (${i.id})`,
          )
          .join('; ')
      : t.consentNone,
  })
  rows.push({ label: t.consentLanguage, value: LANG_NAMES[lang][lang] })
  if (contact.trim()) rows.push({ label: t.consentContact, value: contact.trim() })
  return rows
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

/** Moves focus to the screen's heading when the screen changes, so screen readers hear where they are. */
export function useScreenHeading<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ref.current?.focus()
    window.scrollTo({ top: 0 })
  }, [key])
  return ref
}

