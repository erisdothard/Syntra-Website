import { ZIP_REGIONS } from './data'
import type { Barrier, Education, Goal, Household, LastJob } from './types'

/**
 * Deterministic text handling that runs in the browser before anything leaves it:
 * the crisis check, the privacy scrub, and the keyword parser that stands in for
 * the AI when it is off or fails. No model is involved in any of it.
 */

/** Lower-case, accents removed, single spaces: "Matarme" and "matarme" match alike. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Crisis phrases, English and Spanish (normalized: no accents). A match never
 * reaches the model: the person sees 988, 211 and 911 at once. In production the
 * list is a staff-maintained table with its own eval cases.
 */
const CRISIS_PATTERNS: RegExp[] = [
  // self-harm
  /\b(kill|hurt|harm|cut) (myself|my self)\b/,
  /\bsuicid/,
  /\bend (my|it all|my own) life\b/,
  /\bend it all\b/,
  /\b(want|wanna|going) to die\b/,
  /\bdon'?t want to (live|be alive|be here)\b/,
  /\bno reason to live\b/,
  /\bself[- ]?harm/,
  /\bmatarme\b/,
  /\bquitarme la vida\b/,
  /\bno quiero (vivir|seguir viviendo)\b/,
  /\bquiero morir(me)?\b/,
  /\bhacerme dano\b/,
  /\bterminar con mi vida\b/,
  // violence and abuse
  /\b(he|she|they|my (husband|wife|partner|boyfriend|girlfriend)) (hits|beats|hurts|threatens) me\b/,
  /\bdomestic (violence|abuse)\b/,
  /\b(being|been|i am|i'm) (abused|beaten)\b/,
  /\bnot safe at home\b/,
  /\b(going|want) to (kill|hurt) (him|her|them|someone)\b/,
  /\bme (pega|golpea|amenaza)\b/,
  /\bviolencia (domestica|familiar)\b/,
  /\bno estoy segur[oa] en (mi )?casa\b/,
  /\bme (maltrata|abusa)\b/,
  // no shelter or food today
  /\b(evicted|kicked out|locked out) (today|tonight)\b/,
  /\b(homeless|on the street|sleeping in my car|nowhere to sleep) (today|tonight|now)\b/,
  /\bnowhere to (sleep|stay|go) tonight\b/,
  /\bnothing to eat\b/,
  /\bno food (today|tonight|at home|in the house|for (me|my kids|my children|my family))\b/,
  /\b(don'?t|do not) have (any )?food\b/,
  /\bhaven'?t eaten\b/,
  /\bme (desalojan|echan) hoy\b/,
  /\bno tengo (donde dormir|comida|que comer)\b/,
  /\bno (he|hemos) comido\b/,
  /\bdormir en (mi|el) (carro|coche|auto) (hoy|esta noche)\b/,
  /\ben la calle (hoy|esta noche)\b/,
]

export function isCrisis(text: string): boolean {
  const t = normalize(text)
  if (!t) return false
  return CRISIS_PATTERNS.some((re) => re.test(t))
}

export type Removed = 'name' | 'phone' | 'email' | 'id'

/**
 * Removes names typed after "my name is" / "me llamo", phone numbers, emails and
 * SSN-shaped numbers before any text goes to the model. A 5-digit ZIP is kept.
 * The API runs the same scrub again on the server.
 */
export function scrubPii(text: string): { text: string; removed: Removed[] } {
  const removed = new Set<Removed>()
  let out = text
  out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, () => {
    removed.add('email')
    return '[email removed]'
  })
  out = out.replace(/\b\d{3}[- ]\d{2}[- ]\d{4}\b/g, () => {
    removed.add('id')
    return '[number removed]'
  })
  out = out.replace(/(\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, () => {
    removed.add('phone')
    return '[phone removed]'
  })
  out = out.replace(
    /\b([Mm]y name is|[Mm]y name's|I am called|[Cc]all me|[Mm]e llamo|[Mm]i nombre es|[Ss]oy)\s+((?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ'-]+\s?){1,3})/g,
    (_m, lead: string, name: string) => {
      // "soy" is common in Spanish ("soy madre"); only treat it as a name when a capitalized word follows.
      if (lead.toLowerCase() === 'soy' && !/^[A-ZÁÉÍÓÚÑ]/.test(name)) return _m
      removed.add('name')
      return `${lead} [name removed]${/\s$/.test(_m) ? ' ' : ''}`
    },
  )
  return { text: out.replace(/\s+/g, ' ').trim(), removed: [...removed] }
}

export interface ParsedFields {
  goal: Goal | null
  barriers: Barrier[]
  /** true when the text said nothing is in the way. */
  noBarriers: boolean
  education: Education | null
  lastJob: LastJob | null
  zip: string | null
  household: Household | null
}

const has = (t: string, re: RegExp) => re.test(t)

/** The keyword parser: the fallback when the AI is off or fails. Deterministic. */
export function keywordParse(raw: string): ParsedFields {
  const t = normalize(raw)

  let goal: Goal | null = null
  if (has(t, /\b(better|higher|more) (job|pay|paying|money|wage)|\bpromot|\bmejor (trabajo|empleo|sueldo|pago)|\bganar mas\b/)) goal = 'better_job'
  else if (has(t, /\btrain|\bclass(es)?\b|\bcertif|\bcourse|\blearn|\bcapacit|\bcurso|\bestudiar|\baprender/)) goal = 'training'
  else if (has(t, /\b(need|find|get|looking for|want) (a )?(job|work)\b|\blaid off\b|\bunemployed\b|\bbusco (trabajo|empleo)|\bnecesito (trabajo|empleo)|\bme despidieron|\bsin (trabajo|empleo)/)) goal = 'find_job'
  else if (has(t, /\bnot sure\b|\bno se\b/)) goal = 'not_sure'

  const barriers: Barrier[] = []
  if (has(t, /\bchild ?care|\bdaycare|\bday care|\bbabysit|\b(someone|nobody|no one) to (watch|care for|look after)|\bwatch my (kids|children|son|daughter|baby)|\bguarderia|\bcuidado de (los )?ninos|\bquien (me )?cuide|\bnadie que cuide/)) barriers.push('childcare')
  if (has(t, /\bride\b|\brides\b|\bbus\b|\btransport|\btransit|\bno car\b|\bcar (broke|is broken|repair)|\bget to work\b|\bcarro\b|\bcoche\b|\btransporte|\bautobus|\braite\b/)) barriers.push('transportation')
  if (has(t, /\brent\b|\bevict|\bhousing|\bapartment|\blandlord|\bhomeless|\brenta\b|\balquiler|\bvivienda|\bdesalojo|\bcasero\b|\bdueno\b/)) barriers.push('housing')
  if (has(t, /\butilit|\b(power|light|electric|water|gas) bill|\belectricity|\bshut ?off|\bfactura|\bluz\b|\bagua\b|\bcorte de/)) barriers.push('utilities')
  const noBarriers = barriers.length === 0 && has(t, /\bnothing (is )?in (the|my) way\b|\bno (barriers|problems)\b|\bnada me lo impide\b/)

  let education: Education | null = null
  if (has(t, /\bbachelor|\bcollege degree\b|\buniversity degree\b|\blicenciatura|\btitulo universitario/)) education = 'bachelor'
  else if (has(t, /\bassociate/)) education = 'associate'
  else if (has(t, /\bsome college\b|\bcertificate\b|\balgo de universidad|\bcertificado\b/)) education = 'some_college'
  else if (has(t, /\b(didn'?t|did not|never) (finish|graduate)|\bdropped out\b|\bno termine\b/)) education = 'none'
  else if (has(t, /\bged\b|\bhigh school\b|\bdiploma\b|\bpreparatoria\b|\bsecundaria\b|\bprepa\b/)) education = 'hs'

  let lastJob: LastJob | null = null
  if (has(t, /\bwarehouse|\bforklift|\bpicker|\bpacker|\bfulfil|\balmacen|\bbodega|\bmontacargas/)) lastJob = 'warehouse'
  else if (has(t, /\bcall center|\bcall centre|\bcentro de llamadas/)) lastJob = 'call_center'
  else if (has(t, /\bcashier|\bretail|\bstore\b|\bstock(ing)? shelves|\bsales associate|\btienda|\bcajer[oa]/)) lastJob = 'retail'
  else if (has(t, /\brestaurant|\bcook\b|\bkitchen|\bserver\b|\bwaiter|\bwaitress|\bdishwash|\bfast food|\brestaurante|\bcocin|\bmeser[oa]/)) lastJob = 'food_service'
  else if (has(t, /\bcaregiv|\bhome health|\bcna\b|\bnursing home|\belder care|\bcuidador|\bcuidado de (personas|ancianos)/)) lastJob = 'caregiver'
  else if (has(t, /\boffice|\bfront desk|\breception|\badmin|\bsecretar|\boficina|\brecepcion/)) lastJob = 'office'
  else if (has(t, /\bdriver|\bdelivery|\bdeliver|\buber\b|\blyft\b|\bdoordash|\bchofer|\breparto|\bconductor|\brepartidor/)) lastJob = 'driver'
  else if (has(t, /\bconstruction|\blabor(er)?\b|\broofing|\bdrywall|\bconstruccion|\bobra\b/)) lastJob = 'construction'
  else if (has(t, /\bfirst job\b|\bnever (had a job|worked)\b|\bprimer (trabajo|empleo)\b|\bnunca he trabajado/)) lastJob = 'none'

  let zip: string | null = null
  for (const m of raw.matchAll(/\b(\d{5})\b/g)) {
    if (m[1] in ZIP_REGIONS) {
      zip = m[1]
      break
    }
  }

  let household: Household | null = null
  const kids = has(t, /\bmy (kids|children|son|daughter|baby)\b|\b(\d|one|two|three|four) (kids|children)\b|\b(\d|dos|tres|cuatro) (hij[oa]s|ninos)\b|\bsingle (mom|mother|dad|father|parent)\b|\bmis hij[oa]s\b|\bmi hij[oa]\b|\bmadre soltera\b|\bpadre soltero\b/)
  const partner = has(t, /\bmy (husband|wife|partner)\b( works| also works)?|\bmi (esposo|esposa|pareja)\b/)
  if (kids && partner) household = 'two_adults_kids'
  else if (kids) household = 'me_kids'
  else if (partner) household = 'two_adults'
  else if (has(t, /\bjust me\b|\bonly me\b|\blive alone\b|\bsolo yo\b|\bvivo sol[oa]\b/)) household = 'just_me'

  return { goal, barriers, noBarriers, education, lastJob, zip, household }
}
