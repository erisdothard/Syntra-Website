import { BARRIER_NOUN, EDUCATION_LABELS, GOAL_LABELS, LANG_NAMES, money } from './i18n'
import { SKILLS } from './data'
import { costUsd } from './config'
import { keywordParse, scrubPii, type ParsedFields, type Removed } from './text'
import type { AiCall, Lang, Plan, Profile } from './types'

/**
 * Browser side of the two AI calls. Each one has a deterministic fallback, so a
 * missing key, a network failure or a bad answer never stops the navigator.
 */

type ApiFail = { ok: false; reason: string }

const FALLBACK_REASONS = new Set(['no_key', 'error', 'invalid', 'refusal', 'empty', 'crisis', 'offline'])

function reasonOf(r: string): NonNullable<AiCall['reason']> {
  return (FALLBACK_REASONS.has(r) ? r : 'error') as NonNullable<AiCall['reason']>
}

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T | ApiFail> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    // A 404/405 means the function is not deployed here (e.g. a static preview).
    if (res.status === 404 || res.status === 405) return { ok: false, reason: 'offline' }
    const json = (await res.json().catch(() => null)) as T | ApiFail | null
    return json ?? { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'offline' }
  } finally {
    window.clearTimeout(timer)
  }
}

export interface ParseOutcome {
  fields: ParsedFields
  removed: Removed[]
  call: AiCall
}

interface ParseOk {
  ok: true
  model: string
  fields: {
    goal: ParsedFields['goal']
    barriers: ParsedFields['barriers']
    no_barriers: boolean
    education: ParsedFields['education']
    last_job: ParsedFields['lastJob']
    zip: string | null
    household: ParsedFields['household']
  }
  usage: { input_tokens: number; output_tokens: number }
}

/** Privacy scrub first, then the model, then the keyword rules if the model is unavailable. */
export async function parseFreeText(raw: string, lang: Lang, aiOff: boolean): Promise<ParseOutcome> {
  const { text, removed } = scrubPii(raw)
  const rules = (reason: NonNullable<AiCall['reason']>): ParseOutcome => ({
    fields: keywordParse(text),
    removed,
    call: { step: 'parse', path: 'rules', model: null, inputTokens: 0, outputTokens: 0, costUsd: 0, reason },
  })
  if (aiOff) return rules('no_key')

  const res = await post<ParseOk>('/api/navigator-parse', { text, lang }, 20_000)
  if (!res.ok) return rules(reasonOf(res.reason))
  const f = res.fields
  return {
    fields: {
      goal: f.goal,
      barriers: f.barriers,
      noBarriers: f.no_barriers && f.barriers.length === 0,
      education: f.education,
      lastJob: f.last_job,
      zip: f.zip,
      household: f.household,
    },
    removed,
    call: {
      step: 'parse',
      path: 'model',
      model: res.model,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      costUsd: costUsd('parse', res.usage.input_tokens, res.usage.output_tokens),
    },
  }
}

export interface ExplainRecord {
  id: string
  kind: 'support' | 'career' | 'training'
  name: string
  facts: string[]
}

/** Only the records the engine returned, with the facts the wording may use. */
export function explainRecords(plan: Plan, lang: Lang): ExplainRecord[] {
  const support = plan.support.map((s) => ({
    id: s.id,
    kind: 'support' as const,
    name: s.partner.name,
    facts: [
      `Helps with: ${BARRIER_NOUN[s.partner.service][lang]}`,
      `Phone: ${s.partner.phone}`,
      `Hours: ${s.partner.hours[lang]}`,
      `Who it serves: ${s.partner.eligibility[lang]}`,
      `Languages: ${s.partner.languages.map((l) => LANG_NAMES[l][lang]).join(', ')}`,
      s.partner.regions === 'county' ? 'Area: all of Mecklenburg County' : "Area: the person's part of the county",
    ],
  }))
  const career = plan.career.map((c) => ({
    id: c.id,
    kind: 'career' as const,
    name: c.occupation.title[lang],
    facts: [
      `Sample median pay: ${money(c.occupation.sampleMedianWage, 'en')}/hr`,
      `Sample living wage for this household: ${money(c.livingWage, 'en')}/hr`,
      c.wageGap >= 0 ? 'Meets the sample living wage' : `Below the sample living wage by ${money(-c.wageGap, 'en')}/hr`,
      `Skill overlap with the person's last job: ${c.overlapPct}%`,
      `Skills they bring: ${c.haveSkills.map((s) => SKILLS[s][lang]).join(', ') || 'none listed'}`,
      `Skills to build: ${c.missingSkills.map((s) => SKILLS[s][lang]).join(', ') || 'none'}`,
      c.needsCredential
        ? `Needs: ${EDUCATION_LABELS[c.occupation.educationMin][lang]} (a training program below provides it)`
        : 'Education requirement already met',
    ],
  }))
  const training = plan.training.map((t) => ({
    id: t.id,
    kind: 'training' as const,
    name: t.program.title[lang],
    facts: [
      `Provider type: ${t.program.provider[lang]}`,
      `Length: ${t.program.weeks} weeks`,
      `Cost: ${t.program.cost}`,
      `Schedule: ${t.program.schedule}`,
      `Taught in: ${t.program.languages.map((l) => LANG_NAMES[l][lang]).join(', ')}`,
      `Teaches skills the person is missing: ${t.closes.map((s) => SKILLS[s][lang]).join(', ') || 'gives the credential needed'}`,
      `For: ${t.forOccupations.map((id) => plan.career.find((c) => c.id === id)?.occupation.title[lang] ?? id).join(', ')}`,
      'Next step: a career coach can sign the person up',
    ],
  }))
  return [...support, ...career, ...training]
}

export interface ExplainOutcome {
  /** record_id -> wording. Records missing here keep their template wording. */
  items: Record<string, { why: string; next: string }>
  rejected: string[]
  call: AiCall
}

interface ExplainOk {
  ok: true
  model: string
  items: { record_id: string; why: string; next_step: string }[]
  rejected: string[]
  usage: { input_tokens: number; output_tokens: number }
}

const ID_PATTERN = /\b(?:SVC|OCC|PRG|CTR)-\d{3}\b/g

export async function explainPlan(plan: Plan, profile: Profile, lang: Lang, aiOff: boolean): Promise<ExplainOutcome> {
  const records = explainRecords(plan, lang)
  const rules = (reason: NonNullable<AiCall['reason']>): ExplainOutcome => ({
    items: {},
    rejected: [],
    call: { step: 'explain', path: 'rules', model: null, inputTokens: 0, outputTokens: 0, costUsd: 0, reason },
  })
  if (records.length === 0) return rules('empty')
  if (aiOff) return rules('no_key')

  const res = await post<ExplainOk>(
    '/api/navigator-explain',
    {
      lang,
      context: { goal: profile.goal ? GOAL_LABELS[profile.goal].en : null, barriers: profile.barriers },
      records,
    },
    40_000,
  )
  if (!res.ok) return rules(reasonOf(res.reason))

  // Verified again here: only IDs from this plan, no other record named.
  const allowed = new Set(records.map((r) => r.id))
  const items: ExplainOutcome['items'] = {}
  const rejected = [...res.rejected]
  for (const it of res.items) {
    const others = `${it.why} ${it.next_step}`.match(ID_PATTERN)?.filter((id) => id !== it.record_id) ?? []
    if (allowed.has(it.record_id) && others.length === 0 && !items[it.record_id]) {
      items[it.record_id] = { why: it.why, next: it.next_step }
    } else {
      rejected.push(it.record_id)
    }
  }
  return {
    items,
    rejected,
    call: {
      step: 'explain',
      path: 'model',
      model: res.model,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      costUsd: costUsd('explain', res.usage.input_tokens, res.usage.output_tokens),
    },
  }
}
