import postgres from 'postgres'
import { Resend } from 'resend'
import { z } from 'zod'

/**
 * POST /api/demo-request — the site's one inbound form.
 *
 * Every "Request a demo", "Start a project" and "Start a launch" button posts
 * here. The request is emailed to the Syntra inbox with Reply-To set to the
 * sender, so answering a lead is just hitting reply.
 *
 * Self-contained on purpose: Vercel bundles each file in /api on its own, and a
 * relative import into src/ is one more thing that can resolve under `vite dev`
 * and not inside the function bundle.
 *
 * Env (Vercel project settings, or .env.local for `npm run dev`):
 *   RESEND_API_KEY     required
 *   EMAIL_FROM         required, on a Resend-verified domain, e.g.
 *                      "Syntra AI <requests@syntraai.tech>". There is no
 *                      sandbox fallback: onboarding@resend.dev only delivers to
 *                      the Resend account owner, which is how Hyper Racer lost
 *                      a real lead on 2026-08-26 without anyone noticing.
 *   DEMO_NOTIFY_EMAIL  optional, defaults to agent@syntraai.tech
 *   DATABASE_URL       optional Postgres connection string (Railway, Supabase or
 *                      any other host). When set every submission is
 *                      written to public.site_leads BEFORE any email is sent,
 *                      so a failed send or a bot flag still leaves a record.
 *                      The visitor confirmation is only sent when this is set,
 *                      because the table is what rate-limits it.
 *                      Schema: db/migrations/20261112000001_site_leads.sql
 *   VITE_BOOKING_URL   optional. Adds a "book a call" link to the confirmation
 *                      sent to the visitor (the client reads the same variable).
 */

const NOTIFY_EMAIL = process.env.DEMO_NOTIFY_EMAIL ?? 'agent@syntraai.tech'

/** Bot gates, mirroring the Hyper Racer contact route that has held up against real traffic. */
const HONEYPOT_FIELD = 'company_website'
const MIN_SUBMIT_MS = 2500
const MAX_SUBMIT_AGE_MS = 24 * 60 * 60 * 1000
const MAX_BODY_BYTES = 16 * 1024

/**
 * Per-instance burst cap. Under Fluid compute one instance serves many
 * requests, so this does catch a single client hammering the endpoint, but
 * concurrent instances each keep their own count. A backstop on volume, not
 * the defense; the honeypot and timing checks are.
 */
const BURST_WINDOW_MS = 10 * 60 * 1000
const BURST_MAX = 5
const MAX_TRACKED_IPS = 2000
const recentByIp = new Map<string, number[]>()

const requestSchema = z.object({
  name: z.string().trim().min(1, 'Add your name.').max(120, 'Keep the name under 120 characters.'),
  email: z.string().trim().max(254).pipe(z.email('Enter a valid email address.')),
  company: z.string().trim().max(160).default(''),
  topic: z.string().trim().max(120).default(''),
  message: z
    .string()
    .trim()
    .min(10, 'Add a sentence or two about what you need.')
    .max(4000, 'Keep it under 4,000 characters.'),
  renderedAt: z.number(),
  attribution: z
    .object({
      utm_source: z.string().trim().max(120).optional(),
      utm_medium: z.string().trim().max(120).optional(),
      utm_campaign: z.string().trim().max(120).optional(),
      utm_content: z.string().trim().max(120).optional(),
      utm_term: z.string().trim().max(120).optional(),
      referrer: z.string().trim().max(500).optional(),
      landing_path: z.string().trim().max(500).optional(),
    })
    // A malformed value must never cost the lead: fall back to no attribution.
    .catch({}),
  [HONEYPOT_FIELD]: z.string().max(500).default(''),
})

type DemoRequest = z.infer<typeof requestSchema>

/** `confirmed` is true only when the confirmation email to the visitor was accepted for sending. */
type ApiResult = { ok: true; confirmed?: boolean } | { ok: false; error: string; field?: string }

function reply(body: ApiResult, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** A subject is a header: a CR or LF would end it, so newlines collapse to spaces. */
function headerSafe(str: string, max: number): string {
  return str.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

/**
 * Only the site itself may post here. Browsers always send Origin on a POST
 * fetch and a page cannot forge it, so this stops other sites driving
 * visitors' browsers at the endpoint. It is NOT a boundary against a script:
 * curl can set matching Origin and Host. The honeypot and timing checks carry
 * that load; add Turnstile if scripted abuse ever shows up. Comparing against
 * the request's own host keeps preview deploys and localhost working without
 * a hardcoded allowlist.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function isBurst(ip: string, now: number): boolean {
  // 'unknown' would lump every header-less request into one bucket.
  if (ip === 'unknown') return false
  if (recentByIp.size > MAX_TRACKED_IPS) recentByIp.clear()
  const recent = (recentByIp.get(ip) ?? []).filter((t) => now - t < BURST_WINDOW_MS)
  // Past the cap the list stops growing, so a flood cannot inflate one entry.
  if (recent.length > BURST_MAX) {
    recentByIp.set(ip, recent)
    return true
  }
  const next = [...recent, now]
  recentByIp.set(ip, next)
  return next.length > BURST_MAX
}

/** Returns why a submission looks automated, or null when it passes. */
function spamReason(data: DemoRequest, now: number): string | null {
  if (data[HONEYPOT_FIELD].trim() !== '') return 'honeypot filled'
  const elapsed = now - data.renderedAt
  if (elapsed < MIN_SUBMIT_MS) return `submitted in ${elapsed}ms`
  if (elapsed > MAX_SUBMIT_AGE_MS) return 'stale render timestamp'
  return null
}

type LeadStatus = 'new' | 'flagged'

/** A flagged row keeps enough to recognise a real person caught by a gate, and no more. */
const FLAGGED_MESSAGE_CHARS = 200
/** One confirmation per address per day, and a ceiling on confirmations per hour across the site. */
const CONFIRM_PER_ADDRESS_WINDOW_MS = 24 * 60 * 60 * 1000
const CONFIRM_GLOBAL_WINDOW_MS = 60 * 60 * 1000
const CONFIRM_GLOBAL_MAX = 20
const STORE_TIMEOUT_MS = 5000

/**
 * Lead storage is plain Postgres over DATABASE_URL (Railway, Supabase or any other
 * host). One short-lived connection per function instance. Null when not configured.
 */
let sqlClient: ReturnType<typeof postgres> | null = null
function leadDb(): ReturnType<typeof postgres> | null {
  const url = process.env.DATABASE_URL
  if (!url) return null
  if (!sqlClient) {
    sqlClient = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: STORE_TIMEOUT_MS / 1000,
      ssl: 'prefer',
      onnotice: () => {},
    })
  }
  return sqlClient
}

/**
 * Writes the submission and returns the new row id, or null when storage is not
 * configured or the write fails. The caller still sends the email, so a database
 * outage never costs a lead. Every value is a bound parameter.
 */
async function storeLead(data: DemoRequest, status: LeadStatus, flagReason: string | null): Promise<string | null> {
  const sql = leadDb()
  if (!sql) return null
  const flagged = status === 'flagged'
  try {
    const rows = await sql<{ id: string }[]>`
      insert into site_leads (name, email, email_norm, company, topic, message, status, flag_reason, attribution)
      values (
        ${data.name}, ${data.email}, ${data.email.toLowerCase()}, ${data.company || null}, ${data.topic || null},
        ${flagged ? data.message.slice(0, FLAGGED_MESSAGE_CHARS) : data.message},
        ${status}, ${flagReason}, ${sql.json(flagged ? {} : data.attribution)}
      )
      returning id
    `
    return rows[0]?.id ?? null
  } catch (err) {
    console.error('demo-request: lead store failed', err instanceof Error ? err.name : 'unknown error')
    return null
  }
}

/**
 * The confirmation goes to an address a stranger typed, from our own domain, so it
 * is limited by the lead table itself: one per address per day, and a ceiling per
 * hour overall. With no table to count against, or a count that cannot be read,
 * the answer is no: an unbounded sender is worse than a missing courtesy note.
 */
async function mayConfirm(email: string, now: number): Promise<boolean> {
  const sql = leadDb()
  if (!sql) return false
  try {
    const addressSince = new Date(now - CONFIRM_PER_ADDRESS_WINDOW_MS)
    const globalSince = new Date(now - CONFIRM_GLOBAL_WINDOW_MS)
    const [counts] = await sql<{ same_address: number; recent_confirmations: number }[]>`
      select
        (select count(*)::int from site_leads
          where email_norm = ${email.toLowerCase()} and status = 'new' and created_at >= ${addressSince}) as same_address,
        (select count(*)::int from site_leads where confirmation_sent_at >= ${globalSince}) as recent_confirmations
    `
    if (!counts) return false
    // The row for this very request is already stored, so one match is this request.
    return counts.same_address <= 1 && counts.recent_confirmations < CONFIRM_GLOBAL_MAX
  } catch (err) {
    console.error('demo-request: confirmation check failed', err instanceof Error ? err.name : 'unknown error')
    return false
  }
}

async function markConfirmed(id: string, now: number): Promise<void> {
  const sql = leadDb()
  if (!sql) return
  try {
    await sql`update site_leads set confirmation_sent_at = ${new Date(now)} where id = ${id}`
  } catch (err) {
    console.error('demo-request: could not mark confirmation', err instanceof Error ? err.name : 'unknown error')
  }
}

function bookingUrl(): string | null {
  const raw = process.env.VITE_BOOKING_URL
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

/**
 * The note the visitor gets. Fixed wording only: nothing they typed is echoed
 * back, so the form cannot be used to mail someone else arbitrary text.
 */
function renderConfirmation(): { subject: string; text: string; html: string } {
  const booking = bookingUrl()
  const lines = [
    'Your request reached Syntra AI.',
    `Eris reads every request and replies from ${NOTIFY_EMAIL}.`,
    booking ? `If you would rather talk it through, book a call: ${booking}` : '',
    'If you did not send a request from syntraai.tech, ignore this message.',
  ].filter(Boolean)
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; color: #111; line-height: 1.6;">
      <p style="margin: 0 0 4px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #FF6A1A; font-weight: 600;">Syntra AI</p>
      <h2 style="margin: 0 0 16px; font-size: 22px;">Your request is in.</h2>
      <p style="margin: 0 0 12px;">Eris reads every request and replies from ${escapeHtml(NOTIFY_EMAIL)}.</p>
      ${booking ? `<p style="margin: 0 0 12px;">If you would rather talk it through, <a href="${escapeHtml(booking)}" style="color: #111; font-weight: 600;">book a call</a>.</p>` : ''}
      <p style="margin: 24px 0 0; color: #999; font-size: 12px;">If you did not send a request from syntraai.tech, ignore this message.</p>
    </div>
  `
  return { subject: 'Your request reached Syntra AI', text: lines.join('\n\n'), html }
}

function renderEmail(data: DemoRequest, receivedAt: string): { subject: string; text: string; html: string } {
  const subject = [
    data.topic ? headerSafe(data.topic, 60) : 'New request',
    '—',
    headerSafe(data.name, 60),
    data.company ? `(${headerSafe(data.company, 60)})` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const rows: [string, string][] = [
    ['Name', data.name],
    ['Email', data.email],
    ...(data.company ? ([['Company', data.company]] as [string, string][]) : []),
    ['Request', data.topic || 'General'],
    ...(data.attribution.utm_source ? ([['Source', [data.attribution.utm_source, data.attribution.utm_medium, data.attribution.utm_campaign].filter(Boolean).join(' / ')]] as [string, string][]) : []),
    ...(data.attribution.referrer ? ([['Referrer', data.attribution.referrer]] as [string, string][]) : []),
  ]

  const text = [
    // One line per row: a value carrying a newline could otherwise forge a row.
    ...rows.map(([label, value]) => `${label}: ${headerSafe(value, 600)}`),
    '',
    data.message,
    '',
    `Sent from syntraai.tech at ${receivedAt}. Reply to this email to answer ${data.name}.`,
  ].join('\n')

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; color: #111;">
      <p style="margin: 0 0 4px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #FF6A1A; font-weight: 600;">
        syntraai.tech · ${escapeHtml(data.topic || 'New request')}
      </p>
      <h2 style="margin: 0 0 20px; font-size: 22px;">${escapeHtml(data.name)}${data.company ? ` · ${escapeHtml(data.company)}` : ''}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        ${rows
          .map(
            ([label, value]) => `
        <tr>
          <td style="padding: 6px 0; color: #666; width: 110px; vertical-align: top;">${label}</td>
          <td style="padding: 6px 0; font-weight: 600;">${
            label === 'Email'
              ? `<a href="mailto:${escapeHtml(value)}" style="color: #111;">${escapeHtml(value)}</a>`
              : escapeHtml(value)
          }</td>
        </tr>`,
          )
          .join('')}
      </table>
      <div style="padding: 16px 18px; background: #f6f6f7; border-left: 3px solid #FF6A1A; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(data.message)}</div>
      <p style="margin: 24px 0 0; color: #999; font-size: 12px;">
        Sent from syntraai.tech at ${receivedAt}. Reply to this email to answer ${escapeHtml(data.name)} directly.
      </p>
    </div>
  `

  return { subject, text, html }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isSameOrigin(request)) {
      return reply({ ok: false, error: 'Cross-origin requests are not accepted.' }, 403)
    }

    // Reject on the declared size before buffering anything, then re-check the
    // real size, since Content-Length can be absent or wrong.
    const declared = Number(request.headers.get('content-length') ?? 0)
    if (declared > MAX_BODY_BYTES) {
      return reply({ ok: false, error: 'That message is too long to send.' }, 413)
    }
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return reply({ ok: false, error: 'That message is too long to send.' }, 413)
    }

    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return reply({ ok: false, error: 'Invalid request body.' }, 400)
    }

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return reply(
        { ok: false, error: issue?.message ?? 'Check the form and try again.', field: issue?.path.join('.') },
        400,
      )
    }
    const data = parsed.data
    const now = Date.now()

    // Flagged submissions get the same success a person does: an error teaches a
    // prober the endpoint is defended and worth probing differently. They are not
    // emailed, but they are stored as 'flagged' so a real person caught by a gate
    // can still be found. No PII in these logs, only the reason.
    // The burst check runs on every request, flagged or not, and anything over
    // the cap is dropped without a write, so a flood cannot fill the table.
    if (isBurst(clientIp(request), now)) {
      console.warn('demo-request dropped: burst from one address')
      return reply({ ok: true })
    }
    const reason = spamReason(data, now)
    if (reason) {
      console.warn(`demo-request flagged: ${reason}`)
      await storeLead(data, 'flagged', reason)
      return reply({ ok: true })
    }

    const leadId = await storeLead(data, 'new', null)
    const stored = leadId !== null

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM
    if (!apiKey || !from) {
      console.error('demo-request: RESEND_API_KEY and EMAIL_FROM must both be set')
      // The lead is on record even though nobody was notified.
      return stored ? reply({ ok: true }) : reply({ ok: false, error: 'not_configured' }, 503)
    }

    const { subject, text, html } = renderEmail(data, new Date(now).toISOString())

    // send() RESOLVES with { data, error }: a bad key or an unverified domain
    // never throws, so the error has to be read or the lead vanishes silently.
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: NOTIFY_EMAIL,
      replyTo: data.email,
      subject,
      text,
      html,
    })
    if (error) {
      console.error(`demo-request: Resend rejected the send (${error.name}): ${error.message}`)
      return stored ? reply({ ok: true }) : reply({ ok: false, error: 'send_failed' }, 502)
    }

    // Best effort: the request is already delivered, so a failure here is logged, not surfaced.
    if (!leadId || !(await mayConfirm(data.email, now))) return reply({ ok: true, confirmed: false })
    const { error: confirmError } = await resend.emails.send({
      from,
      to: data.email,
      replyTo: NOTIFY_EMAIL,
      ...renderConfirmation(),
    })
    if (confirmError) {
      // The provider's message can quote the recipient address; log the error name only.
      console.error(`demo-request: confirmation not sent (${confirmError.name})`)
      return reply({ ok: true, confirmed: false })
    }
    await markConfirmed(leadId, now)
    return reply({ ok: true, confirmed: true })
  } catch (err) {
    console.error('demo-request: unexpected failure', err instanceof Error ? err.message : err)
    return reply({ ok: false, error: 'send_failed' }, 500)
  }
}
