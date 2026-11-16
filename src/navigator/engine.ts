import { EDUCATION_LABELS, LANG_NAMES, money } from './i18n'
import { EDUCATION_RANK, LAST_JOBS, LIVING_WAGE, OCCUPATIONS, PROGRAMS, SKILLS, ZIP_REGIONS } from './data'
import type {
  Barrier,
  CareerItem,
  Education,
  Household,
  Lang,
  LastJob,
  LivingWageRow,
  Occupation,
  Partner,
  Plan,
  Profile,
  Program,
  Region,
  SkillId,
  SupportItem,
  TrainingItem,
} from './types'

/**
 * The deterministic engine. No AI is involved anywhere in this file: the same
 * answers always produce the same plan, and it costs zero tokens.
 *
 * Every function is written the way the SQL reads. Each one takes its tables as
 * arguments, filters (WHERE), joins, scores and orders (ORDER BY ... LIMIT).
 * In production these run inside PostgreSQL as SQL functions
 * (navigator_support, navigator_career_steps, navigator_training, and
 * navigator_plan, which calls the three), called with one rpc() from the API.
 * The SQL equivalent is written above each function.
 */

export const SUPPORT_PER_BARRIER = 2
export const CAREER_LIMIT = 3
export const TRAINING_LIMIT = 3

export function emptyProfile(): Profile {
  return {
    goal: null,
    barriers: [],
    barriersAnswered: false,
    education: null,
    lastJob: null,
    lastJobText: null,
    zip: null,
    zipSkipped: false,
    household: null,
  }
}

/** SELECT region FROM zip_regions WHERE zip = $1 */
export function regionForZip(zip: string | null): Region | null {
  if (!zip) return null
  return ZIP_REGIONS[zip] ?? null
}

export function isMecklenburgZip(zip: string): boolean {
  return /^\d{5}$/.test(zip) && zip in ZIP_REGIONS
}

/** SELECT sample_hourly FROM living_wage WHERE household = $1 */
export function livingWageFor(household: Household | null, table: LivingWageRow[] = LIVING_WAGE): number {
  const row = table.find((r) => r.household === (household ?? 'just_me'))
  return row?.sampleHourly ?? table[0].sampleHourly
}

/**
 * Stabilize first: partners for each need, in the order the person chose them.
 *
 *   SELECT p.* FROM service_matrix p
 *   WHERE p.service = ANY($barriers)
 *     AND (p.regions = 'county' OR $region = ANY(p.regions))
 *     AND $lang = ANY(p.languages)
 *   ORDER BY array_position($barriers, p.service),
 *            (p.regions <> 'county') DESC,      -- a local partner before a county-wide one
 *            p.last_verified DESC
 *   -- then at most SUPPORT_PER_BARRIER rows per service (row_number() OVER (PARTITION BY service))
 */
export function supportFor(
  barriers: Barrier[],
  region: Region | null,
  lang: Lang,
  partners: Partner[],
): { rows: Partner[]; gaps: Barrier[] } {
  const rows: Partner[] = []
  const gaps: Barrier[] = []
  for (const barrier of barriers) {
    const matches = partners
      .filter((p) => p.service === barrier)
      .filter((p) => p.regions === 'county' || (region !== null && p.regions.includes(region)))
      .filter((p) => p.languages.includes(lang))
      .sort((a, b) => {
        const localA = a.regions === 'county' ? 0 : 1
        const localB = b.regions === 'county' ? 0 : 1
        if (localA !== localB) return localB - localA
        return b.lastVerified.localeCompare(a.lastVerified)
      })
      .slice(0, SUPPORT_PER_BARRIER)
    if (matches.length === 0) gaps.push(barrier)
    rows.push(...matches)
  }
  return { rows, gaps }
}

/** The skills a person brings: SELECT skill, level FROM last_job_skills WHERE job = $1 */
export function skillsFromLastJob(lastJob: LastJob | null): Partial<Record<SkillId, number>> {
  const row = LAST_JOBS.find((j) => j.id === (lastJob ?? 'none'))
  return row?.skills ?? {}
}

/**
 * Weighted skill overlap: how much of what the job asks for the person already has.
 *
 *   SELECT sum(least(coalesce(ps.level, 0), os.weight))::numeric / sum(os.weight)
 *   FROM occupation_skills os
 *   LEFT JOIN person_skills ps USING (skill)
 *   WHERE os.occupation_id = $1
 */
export function skillOverlap(
  person: Partial<Record<SkillId, number>>,
  occupation: Occupation,
): { pct: number; have: SkillId[]; missing: SkillId[] } {
  let asked = 0
  let met = 0
  const have: SkillId[] = []
  const missing: { skill: SkillId; weight: number }[] = []
  for (const [skill, weight] of Object.entries(occupation.skills) as [SkillId, number][]) {
    const level = person[skill] ?? 0
    asked += weight
    met += Math.min(level, weight)
    if (level > 0 && level >= weight - 1) have.push(skill)
    else missing.push({ skill, weight })
  }
  missing.sort((a, b) => b.weight - a.weight)
  return { pct: asked === 0 ? 0 : Math.round((met / asked) * 100), have, missing: missing.map((m) => m.skill) }
}

/** Does any program grant the credential this occupation asks for? */
function credentialRoute(occupation: Occupation, programs: Program[]): Program | undefined {
  return programs.find(
    (p) =>
      p.leadsTo.includes(occupation.id) &&
      p.grants !== null &&
      EDUCATION_RANK[p.grants] >= EDUCATION_RANK[occupation.educationMin],
  )
}

/**
 * Career steps: the jobs that use what the person already knows.
 *
 *   SELECT o.*, overlap, o.sample_median_wage - $living_wage AS wage_gap
 *   FROM occupations o
 *   CROSS JOIN LATERAL navigator_overlap($person_skills, o.id) AS overlap
 *   WHERE education_rank($education) >= education_rank(o.education_min)
 *      OR EXISTS (SELECT 1 FROM programs p WHERE o.id = ANY(p.leads_to)
 *                 AND education_rank(p.grants) >= education_rank(o.education_min))
 *   ORDER BY overlap * (0.7 + 0.1 * o.demand) + (o.sample_median_wage >= $living_wage)::int * 0.1
 *            + (CASE WHEN $goal = 'better_job' THEN o.sample_median_wage / 100 ELSE 0 END) DESC
 *   LIMIT CAREER_LIMIT
 */
export function careerStepsFor(
  profile: Profile,
  livingWage: number,
  occupations: Occupation[],
  programs: Program[],
): Omit<CareerItem, 'why' | 'next'>[] {
  const person = skillsFromLastJob(profile.lastJob)
  const edu: Education = profile.education ?? 'none'
  return occupations
    .map((o) => {
      const meetsEducation = EDUCATION_RANK[edu] >= EDUCATION_RANK[o.educationMin]
      const route = meetsEducation ? undefined : credentialRoute(o, programs)
      if (!meetsEducation && !route) return null
      const overlap = skillOverlap(person, o)
      const score =
        (overlap.pct / 100) * (0.7 + 0.1 * o.demand) +
        (o.sampleMedianWage >= livingWage ? 0.1 : 0) +
        (profile.goal === 'better_job' ? o.sampleMedianWage / 100 : 0)
      return {
        kind: 'career' as const,
        id: o.id,
        occupation: o,
        livingWage,
        wageGap: Math.round((o.sampleMedianWage - livingWage) * 100) / 100,
        overlapPct: overlap.pct,
        haveSkills: overlap.have,
        missingSkills: overlap.missing,
        needsCredential: !meetsEducation,
        score,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, CAREER_LIMIT)
    .map(({ score: _score, ...rest }) => rest)
}

/**
 * Training: programs that close the biggest gaps for the chosen career steps.
 *
 *   SELECT p.*, array_agg(DISTINCT s) AS closes, array_agg(DISTINCT c.id) AS for_occupations
 *   FROM programs p
 *   JOIN career_steps c ON c.id = ANY(p.leads_to)
 *   LEFT JOIN unnest(c.missing_skills) s ON s = ANY(p.teaches)
 *   GROUP BY p.id
 *   HAVING count(s) > 0 OR bool_or(c.needs_credential AND p.grants IS NOT NULL)
 *   ORDER BY ($lang = ANY(p.languages)) DESC, bool_or(c.needs_credential) DESC, count(s) DESC, p.weeks
 *   LIMIT TRAINING_LIMIT
 */
export function trainingFor(
  careers: Omit<CareerItem, 'why' | 'next'>[],
  lang: Lang,
  programs: Program[],
): Omit<TrainingItem, 'why' | 'next'>[] {
  const rows = programs
    .map((p) => {
      const closes = new Set<SkillId>()
      const forOccupations: string[] = []
      let grantsNeeded = false
      for (const c of careers) {
        if (!p.leadsTo.includes(c.id)) continue
        const closing = c.missingSkills.filter((s) => p.teaches.includes(s))
        const credential =
          c.needsCredential && p.grants !== null && EDUCATION_RANK[p.grants] >= EDUCATION_RANK[c.occupation.educationMin]
        if (closing.length === 0 && !credential) continue
        closing.forEach((s) => closes.add(s))
        forOccupations.push(c.id)
        grantsNeeded ||= credential
      }
      if (forOccupations.length === 0) return null
      return { program: p, closes: [...closes], forOccupations, grantsNeeded, langMatch: p.languages.includes(lang) }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort(
      (a, b) =>
        Number(b.langMatch) - Number(a.langMatch) ||
        Number(b.grantsNeeded) - Number(a.grantsNeeded) ||
        b.closes.length - a.closes.length ||
        a.program.weeks - b.program.weeks,
    )
    .slice(0, TRAINING_LIMIT)
  return rows.map((r) => ({
    kind: 'training' as const,
    id: r.program.id,
    program: r.program,
    closes: r.closes,
    forOccupations: r.forOccupations,
  }))
}

// ─── Template wording (used when the AI is off, and as the fallback for any record it gets wrong) ───

function list(items: string[], lang: Lang): string {
  if (items.length <= 1) return items.join('')
  const and = lang === 'es' ? ' y ' : ' and '
  return `${items.slice(0, -1).join(', ')}${and}${items[items.length - 1]}`
}

const NEED_PHRASE: Record<Barrier, Record<Lang, string>> = {
  childcare: { en: 'childcare', es: 'el cuidado de niños' },
  transportation: { en: 'transportation', es: 'el transporte' },
  housing: { en: 'rent or housing', es: 'la renta o la vivienda' },
  utilities: { en: 'utility bills', es: 'las facturas de luz, agua o gas' },
}

export function supportWhy(p: Partner, region: Region | null, lang: Lang): string {
  const need = NEED_PHRASE[p.service][lang]
  const where =
    p.regions === 'county'
      ? lang === 'es' ? 'atiende a todo el condado' : 'serves all of Mecklenburg County'
      : region
        ? lang === 'es' ? 'atiende su zona' : 'serves your part of the county'
        : lang === 'es' ? 'atiende parte del condado' : 'serves part of the county'
  const langs = list(p.languages.map((l) => LANG_NAMES[l][lang]), lang)
  return lang === 'es'
    ? `Pidió ayuda con ${need}. Esta organización ${where} y ofrece servicio en ${langs.toLowerCase()}.`
    : `You asked for help with ${need}. This partner ${where} and helps people in ${langs}.`
}

export function supportNext(p: Partner, lang: Lang): string {
  return lang === 'es'
    ? `Llame al ${p.phone} (${p.hours.es}). Diga que viene del Navegador de Empleo.`
    : `Call ${p.phone} (${p.hours.en}). Say the Workforce Navigator sent you.`
}

export function careerWhy(c: Omit<CareerItem, 'why' | 'next'>, lang: Lang): string {
  const have = c.haveSkills.slice(0, 3).map((s) => SKILLS[s][lang].toLowerCase())
  const wage = money(c.occupation.sampleMedianWage, lang)
  if (lang === 'es') {
    const uses = have.length ? `Usa lo que ya sabe: ${list(have, lang)}.` : 'Es un buen punto de partida.'
    const pay = c.wageGap >= 0 ? `Paga ${wage}/hora, por encima del salario digno de muestra.` : `Paga ${wage}/hora.`
    return `${uses} ${pay}`
  }
  const uses = have.length ? `It uses what you already know: ${list(have, lang)}.` : 'It is a good place to start.'
  const pay = c.wageGap >= 0 ? `It pays ${wage}/hr, above the sample living wage.` : `It pays ${wage}/hr.`
  return `${uses} ${pay}`
}

export function careerNext(c: Omit<CareerItem, 'why' | 'next'>, lang: Lang): string {
  if (c.needsCredential) {
    const edu = EDUCATION_LABELS[c.occupation.educationMin][lang].toLowerCase()
    return lang === 'es'
      ? `Este empleo pide ${edu}. Vea el programa de capacitación de abajo que lo otorga.`
      : `This job asks for ${edu}. See the training below that gets you there.`
  }
  const build = c.missingSkills.slice(0, 2).map((s) => SKILLS[s][lang].toLowerCase())
  if (build.length === 0) {
    return lang === 'es'
      ? 'Ya tiene lo que pide. Un asesor de empleo puede ayudarle con su currículum y a postularse.'
      : 'You already have what it asks for. A career coach can help with your resume and applications.'
  }
  return lang === 'es'
    ? `Desarrolle estas habilidades: ${list(build, lang)}. La capacitación de abajo le ayuda.`
    : `Build these skills: ${list(build, lang)}. The training below helps.`
}

export function trainingWhy(t: Omit<TrainingItem, 'why' | 'next'>, careers: Omit<CareerItem, 'why' | 'next'>[], lang: Lang): string {
  const jobs = t.forOccupations
    .map((id) => careers.find((c) => c.id === id)?.occupation.title[lang])
    .filter((x): x is string => !!x)
  const closes = t.closes.slice(0, 3).map((s) => SKILLS[s][lang].toLowerCase())
  if (lang === 'es') {
    const teaches = closes.length ? `Enseña ${list(closes, lang)}` : 'Otorga el certificado que se pide'
    return `${teaches}, lo que pide ${list(jobs, lang)}.`
  }
  const teaches = closes.length ? `It teaches ${list(closes, lang)}` : 'It gives the certificate employers ask for'
  return `${teaches}, which ${list(jobs, lang)} ${jobs.length > 1 ? 'ask' : 'asks'} for.`
}

export function trainingNext(t: Omit<TrainingItem, 'why' | 'next'>, lang: Lang): string {
  const langOk = t.program.languages.includes(lang)
  if (lang === 'es') {
    const note = langOk ? '' : ' Se imparte en inglés.'
    return `Pida a un asesor que le inscriba en la próxima sesión y pregunte por ayuda con el costo.${note}`
  }
  return 'Ask a career coach to sign you up for the next session, and ask about help with the cost.'
}

/**
 * navigator_plan(profile, lang): the whole plan in one call.
 * Tables are passed in so the staff view's edits (partners) apply at once.
 */
export function buildPlan(
  profile: Profile,
  lang: Lang,
  tables: { partners: Partner[]; occupations?: Occupation[]; programs?: Program[]; livingWage?: LivingWageRow[] },
): Plan {
  const occupations = tables.occupations ?? OCCUPATIONS
  const programs = tables.programs ?? PROGRAMS
  const region = regionForZip(profile.zip)
  const household = profile.household ?? 'just_me'
  const livingWage = livingWageFor(household, tables.livingWage)

  const { rows, gaps } = supportFor(profile.barriers, region, lang, tables.partners)
  const support: SupportItem[] = rows.map((p) => ({
    kind: 'support',
    id: p.id,
    partner: p,
    why: supportWhy(p, region, lang),
    next: supportNext(p, lang),
  }))

  const careerRows = careerStepsFor(profile, livingWage, occupations, programs)
  const career: CareerItem[] = careerRows.map((c) => ({ ...c, why: careerWhy(c, lang), next: careerNext(c, lang) }))

  const training: TrainingItem[] = trainingFor(careerRows, lang, programs).map((t) => ({
    ...t,
    why: trainingWhy(t, careerRows, lang),
    next: trainingNext(t, lang),
  }))

  return { support, supportGaps: gaps, career, training, livingWage, household }
}

/** Every record ID in a plan: the only IDs an AI explanation may cite. */
export function planRecordIds(plan: Plan): string[] {
  return [...plan.support, ...plan.career, ...plan.training].map((i) => i.id)
}
