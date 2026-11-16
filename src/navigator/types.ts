/**
 * Shared shapes for the Workforce Navigator demo. The tables in data.ts mirror
 * the PostgreSQL schema proposed for production (occupations, skills,
 * occupation_skills, living_wage, programs, providers / service_matrix).
 */

export type Lang = 'en' | 'es'

export type Goal = 'find_job' | 'better_job' | 'training' | 'not_sure'
export type Barrier = 'childcare' | 'transportation' | 'housing' | 'utilities'
export type Education = 'none' | 'hs' | 'some_college' | 'associate' | 'bachelor'
export type Household = 'just_me' | 'me_kids' | 'two_adults' | 'two_adults_kids'
export type LastJob =
  | 'retail'
  | 'warehouse'
  | 'food_service'
  | 'caregiver'
  | 'office'
  | 'driver'
  | 'construction'
  | 'call_center'
  | 'none'

export type Region = 'central' | 'north' | 'south' | 'east' | 'west'

export type SkillId =
  | 'customer_service'
  | 'cash_handling'
  | 'inventory'
  | 'forklift'
  | 'equipment'
  | 'safety'
  | 'scheduling'
  | 'data_entry'
  | 'computer_basics'
  | 'troubleshooting'
  | 'patient_care'
  | 'communication'
  | 'teamwork'
  | 'reliability'
  | 'physical'
  | 'math'
  | 'record_keeping'
  | 'food_safety'
  | 'driving'
  | 'problem_solving'
  | 'leadership'

/** What the person told us. `null` = not answered yet. */
export interface Profile {
  goal: Goal | null
  /** Empty array + barriersAnswered = "none of these". */
  barriers: Barrier[]
  barriersAnswered: boolean
  education: Education | null
  lastJob: LastJob | null
  /** Free text the person typed for the last job, shown back on the card. Never sent to partners. */
  lastJobText: string | null
  zip: string | null
  /** true when the person chose not to give a ZIP. */
  zipSkipped: boolean
  household: Household | null
}

export interface Occupation {
  id: string
  title: Record<Lang, string>
  cluster: Record<Lang, string>
  /** Sample hourly median wage, USD. Not a published figure. */
  sampleMedianWage: number
  educationMin: Education
  /** 1 (low) to 3 (high), sample. */
  demand: 1 | 2 | 3
  /** occupation_skills: skill -> weight 1..5 */
  skills: Partial<Record<SkillId, number>>
}

export interface LivingWageRow {
  household: Household
  /** Sample hourly living wage per working adult, Mecklenburg County. Not the published figure. */
  sampleHourly: number
}

export interface Program {
  id: string
  title: Record<Lang, string>
  provider: Record<Lang, string>
  teaches: SkillId[]
  /** Credential that satisfies an occupation's education minimum, if any. */
  grants: Education | null
  leadsTo: string[]
  weeks: number
  cost: 'free' | 'low' | 'moderate'
  schedule: 'day' | 'evening' | 'weekend' | 'online'
  languages: Lang[]
}

export interface Partner {
  id: string
  name: string
  service: Barrier
  /** 'county' = serves every Mecklenburg ZIP. */
  regions: Region[] | 'county'
  languages: Lang[]
  hours: Record<Lang, string>
  phone: string
  eligibility: Record<Lang, string>
  lastVerified: string
  steward: string
}

export interface LastJobRow {
  id: LastJob
  label: Record<Lang, string>
  /** The skills a person usually brings from this job, with level 1..5. */
  skills: Partial<Record<SkillId, number>>
}

// ─── Plan output ───

export interface SupportItem {
  kind: 'support'
  id: string
  partner: Partner
  why: string
  next: string
}

export interface CareerItem {
  kind: 'career'
  id: string
  occupation: Occupation
  livingWage: number
  wageGap: number
  overlapPct: number
  haveSkills: SkillId[]
  missingSkills: SkillId[]
  needsCredential: boolean
  why: string
  next: string
}

export interface TrainingItem {
  kind: 'training'
  id: string
  program: Program
  closes: SkillId[]
  forOccupations: string[]
  why: string
  next: string
}

export type PlanItem = SupportItem | CareerItem | TrainingItem

export interface Plan {
  support: SupportItem[]
  /** Barriers with no partner in this ZIP and language. */
  supportGaps: Barrier[]
  career: CareerItem[]
  training: TrainingItem[]
  livingWage: number
  household: Household
}

// ─── Cost log ───

export interface AiCall {
  step: 'parse' | 'explain'
  /** 'model' = Claude answered; 'rules' = deterministic fallback. */
  path: 'model' | 'rules'
  model: string | null
  inputTokens: number
  outputTokens: number
  costUsd: number
  /** Why the rules were used, when they were. */
  reason?: 'no_key' | 'error' | 'crisis' | 'invalid' | 'refusal' | 'offline' | 'empty'
}

export interface Referral {
  code: string
  createdAt: string
  lang: Lang
  partnerId: string
  partnerName: string
  shared: { label: string; value: string }[]
  contact: string | null
  status: 'new' | 'contacted'
}
