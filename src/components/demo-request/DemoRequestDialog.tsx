import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { DemoRequestTopic } from './context'

const INBOX = 'agent@syntraai.tech'
/** Must match api/demo-request.ts. Named to look like a real field so form-filling bots take it. */
const HONEYPOT_FIELD = 'company_website'

type Field = 'name' | 'email' | 'company' | 'message'
type Values = Record<Field, string>
type Errors = Partial<Record<Field, string>>
type Status = 'idle' | 'sending' | 'sent' | 'failed'
type ApiResult = { ok: true } | { ok: false; error: string; field?: string }

/** Mirrors the server schema so most mistakes are caught before a round trip. */
const MAX_LENGTH: Record<Field, number> = { name: 120, email: 254, company: 160, message: 4000 }
const FIELDS: readonly Field[] = ['name', 'email', 'company', 'message']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values: Values): Errors {
  const errors: Errors = {}
  if (!values.name.trim()) errors.name = 'Add your name.'
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (values.message.trim().length < 10) errors.message = 'Add a sentence or two about what you need.'
  return errors
}

function isField(value: unknown): value is Field {
  return typeof value === 'string' && (FIELDS as readonly string[]).includes(value)
}

/** The escape hatch when the endpoint fails: same words, opened in their own mail app. */
function mailtoFallback(topic: DemoRequestTopic, values: Values): string {
  const signature = [values.name.trim(), values.company.trim()].filter(Boolean).join(', ')
  const body = [values.message.trim(), '', signature ? `— ${signature}` : ''].join('\n').trim()
  return `mailto:${INBOX}?subject=${encodeURIComponent(topic.topic)}&body=${encodeURIComponent(body)}`
}

interface Props {
  topic: DemoRequestTopic
  onClose: () => void
}

export function DemoRequestDialog({ topic, onClose }: Props) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const renderedAt = useRef(0)
  const [values, setValues] = useState<Values>({ name: '', email: '', company: '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    renderedAt.current = Date.now()
    dialog.showModal()
    // showModal() moves focus to the first focusable element, the close button,
    // overriding React's autoFocus. Put the cursor where the typing starts.
    dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus()
    // Restores whatever was there, so closing over an open tab overlay keeps it locked.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
    }
  }, [])

  const close = () => dialogRef.current?.close()
  const fieldId = (field: Field) => `${id}-${field}`

  const bind = (field: Field) => ({
    id: fieldId(field),
    name: field,
    value: values[field],
    maxLength: MAX_LENGTH[field],
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${fieldId(field)}-error` : undefined,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = e.target
      setValues((prev) => ({ ...prev, [field]: value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
      if (status === 'failed') setStatus('idle')
    },
  })

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`${fieldId(field)}-error`} className="demo-error">
        {errors[field]}
      </p>
    ) : null

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'sending') return

    const found = validate(values)
    setErrors(found)
    const firstInvalid = FIELDS.find((field) => found[field])
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus()
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          company: values.company.trim(),
          message: values.message.trim(),
          topic: topic.topic,
          renderedAt: renderedAt.current,
          [HONEYPOT_FIELD]: honeypotRef.current?.value ?? '',
        }),
      })
      const result = (await res.json().catch(() => null)) as ApiResult | null

      if (res.ok && result?.ok) {
        setStatus('sent')
        return
      }
      if (res.status === 400 && result && !result.ok && isField(result.field)) {
        setErrors({ [result.field]: result.error })
        setStatus('idle')
        document.getElementById(fieldId(result.field))?.focus()
        return
      }
      setStatus('failed')
    } catch {
      setStatus('failed')
    }
  }

  const firstName = values.name.trim().split(/\s+/)[0]

  return (
    <dialog
      ref={dialogRef}
      className="demo-dialog"
      aria-labelledby={`${id}-title`}
      data-lenis-prevent
      onClose={onClose}
      onClick={(e) => {
        // The panel fills the dialog box, so a click that lands on the dialog itself is the backdrop.
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="demo-panel">
        <span aria-hidden className="demo-corner demo-corner--tl" />
        <span aria-hidden className="demo-corner demo-corner--tr" />
        <span aria-hidden className="demo-corner demo-corner--bl" />
        <span aria-hidden className="demo-corner demo-corner--br" />

        <button type="button" className="demo-close" aria-label="Close" onClick={close}>
          &times;
        </button>

        {status === 'sent' ? (
          <div className="demo-sent" role="status">
            <p className="mono-label text-accent mb-5">Signal received</p>
            <h2 id={`${id}-title`} className="display text-text" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
              {firstName ? `Got it, ${firstName}` : 'Got it'}
              <span className="text-accent">.</span>
            </h2>
            <p className="mt-6 text-text-secondary leading-relaxed">
              Your request is in the Syntra inbox. The reply comes from {INBOX} to{' '}
              <span className="text-text">{values.email.trim()}</span>.
            </p>
            <button type="button" className="btn-ghost mt-10" onClick={close}>
              Back to the site <span aria-hidden>→</span>
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="mono-label text-accent mb-5 pr-10">{topic.eyebrow}</p>
            <h2 id={`${id}-title`} className="display text-text" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
              {topic.title}
              <span className="text-accent">.</span>
            </h2>
            <p className="mt-5 text-text-secondary text-[15px] leading-relaxed max-w-[46ch]">{topic.lead}</p>

            <div className="demo-grid mt-9">
              <div className="demo-field">
                <label htmlFor={fieldId('name')}>Name</label>
                <input {...bind('name')} className="demo-input" autoComplete="name" required />
                {fieldError('name')}
              </div>
              <div className="demo-field">
                <label htmlFor={fieldId('email')}>Work email</label>
                <input {...bind('email')} className="demo-input" type="email" autoComplete="email" inputMode="email" required />
                {fieldError('email')}
              </div>
              <div className="demo-field demo-field--wide">
                <label htmlFor={fieldId('company')}>
                  Company <span className="demo-optional">optional</span>
                </label>
                <input {...bind('company')} className="demo-input" autoComplete="organization" />
              </div>
              <div className="demo-field demo-field--wide">
                <label htmlFor={fieldId('message')}>What do you need?</label>
                <textarea {...bind('message')} className="demo-input" rows={5} placeholder={topic.placeholder} required />
                {fieldError('message')}
              </div>
            </div>

            {/* Off-screen, not display:none, which some bots detect. Humans never reach it. */}
            <div className="demo-honeypot" aria-hidden>
              <label htmlFor={`${id}-hp`}>Company website</label>
              <input ref={honeypotRef} id={`${id}-hp`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {status === 'failed' && (
              <div className="demo-alert mt-7" role="alert">
                <p>That didn&rsquo;t go through. Your message is still here, so send it by email and nothing is lost.</p>
                <a className="btn-ghost mt-3" href={mailtoFallback(topic, values)}>
                  Email it to {INBOX} <span aria-hidden>→</span>
                </a>
              </div>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
              <button type="submit" className="btn-primary" disabled={status === 'sending'} aria-busy={status === 'sending'}>
                <span>{status === 'sending' ? 'Sending…' : 'Send request'}</span>
                <span aria-hidden>→</span>
              </button>
              <a className="hud hover:text-text transition-colors" href={`mailto:${INBOX}`}>
                or email {INBOX}
              </a>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
