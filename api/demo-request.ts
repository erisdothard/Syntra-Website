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
  [HONEYPOT_FIELD]: z.string().max(500).default(''),
})

type DemoRequest = z.infer<typeof requestSchema>

type ApiResult = { ok: true } | { ok: false; error: string; field?: string }

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
  ]

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
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

    // Dropped bots get the same success a person does: an error teaches a
    // prober the endpoint is defended and worth probing differently. No PII in
    // these logs, only the reason.
    const reason = spamReason(data, now)
    if (reason) {
      console.warn(`demo-request dropped: ${reason}`)
      return reply({ ok: true })
    }
    if (isBurst(clientIp(request), now)) {
      console.warn('demo-request dropped: burst from one address')
      return reply({ ok: true })
    }

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM
    if (!apiKey || !from) {
      console.error('demo-request: RESEND_API_KEY and EMAIL_FROM must both be set')
      return reply({ ok: false, error: 'not_configured' }, 503)
    }

    const { subject, text, html } = renderEmail(data, new Date(now).toISOString())

    // send() RESOLVES with { data, error }: a bad key or an unverified domain
    // never throws, so the error has to be read or the lead vanishes silently.
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: NOTIFY_EMAIL,
      replyTo: data.email,
      subject,
      text,
      html,
    })
    if (error) {
      console.error(`demo-request: Resend rejected the send (${error.name}): ${error.message}`)
      return reply({ ok: false, error: 'send_failed' }, 502)
    }

    return reply({ ok: true })
  } catch (err) {
    console.error('demo-request: unexpected failure', err instanceof Error ? err.message : err)
    return reply({ ok: false, error: 'send_failed' }, 500)
  }
}
