import { useState } from 'react'
import { CAREER_CENTER } from './data'
import type { Lang, Plan, Profile, Referral } from './types'
import { Icon, type S } from './ui'
import { useScreenHeading, sharedRows, type Destination } from './view'

export function Consent({
  t,
  lang,
  profile,
  plan,
  dest,
  onConsent,
  onBack,
}: {
  t: S
  lang: Lang
  profile: Profile
  plan: Plan | null
  dest: Destination
  onConsent: (rows: { label: string; value: string }[], contact: string | null) => void
  onBack: () => void
}) {
  const h = useScreenHeading<HTMLHeadingElement>('consent')
  const [contact, setContact] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState(false)
  const rows = sharedRows(profile, plan, lang, t, contact)

  return (
    <section aria-labelledby="nv-h1" className="space-y-5">
      <h1 id="nv-h1" ref={h} tabIndex={-1}>
        {t.consentH1}
      </h1>
      <p>{t.consentBody(dest.partnerName)}</p>

      <div className="nv-card space-y-3">
        <h2 className="text-lg">{t.consentShared}</h2>
        <p className="nv-small nv-muted">
          {t.staffSendTo}: <strong className="text-[#1b2430]">{dest.partnerName}</strong> ({dest.partnerId})
        </p>
        <dl className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="border-b border-[#d3d9d1] pb-2 last:border-none">
              <dt className="nv-small nv-muted">{r.label}</dt>
              <dd className="m-0 font-semibold break-words">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="nv-small">{t.consentNotShared}</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!agreed) {
            setError(true)
            return
          }
          onConsent(rows, contact.trim() || null)
        }}
      >
        <div>
          <label htmlFor="nv-contact" className="nv-label">
            {t.consentContactLabel}
          </label>
          <p id="nv-contact-hint" className="nv-small nv-muted mb-2">
            {t.consentContactHint}
          </p>
          <input
            id="nv-contact"
            className="nv-input"
            value={contact}
            maxLength={120}
            onChange={(e) => setContact(e.target.value)}
            aria-describedby="nv-contact-hint"
            autoComplete="tel"
          />
        </div>

        <label className="nv-choice cursor-pointer" htmlFor="nv-agree">
          <input
            id="nv-agree"
            type="checkbox"
            className="h-6 w-6 flex-none accent-[#0d5957]"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked)
              setError(false)
            }}
            aria-describedby={error ? 'nv-agree-err' : undefined}
          />
          <span>{t.consentCheck}</span>
        </label>
        {error && (
          <p id="nv-agree-err" className="nv-error" role="alert">
            {t.consentNeedCheck}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button type="submit" className="nv-btn nv-btn-primary nv-btn-block">
            {t.consentYes}
          </button>
          <button type="button" className="nv-btn nv-btn-secondary nv-btn-block" onClick={onBack}>
            {t.consentNo}
          </button>
        </div>
      </form>
      <p className="nv-small">{t.orCall(dest.partnerName, dest.phone, dest.hours)}</p>
    </section>
  )
}

export function Sent({ t, referral, onBack, hasPlan }: { t: S; referral: Referral; onBack: () => void; hasPlan: boolean }) {
  const h = useScreenHeading<HTMLHeadingElement>('sent')
  return (
    <section aria-labelledby="nv-h1" className="space-y-5">
      <h1 id="nv-h1" ref={h} tabIndex={-1}>
        {t.sentH1}
      </h1>
      <p>{t.sentBody(referral.partnerName)}</p>
      <div className="nv-card space-y-2">
        <p className="nv-muted">{t.sentCode}</p>
        <p className="font-mono text-3xl font-bold tracking-wider">{referral.code}</p>
        <p className="nv-small">{t.sentCodeHint}</p>
      </div>
      <button type="button" className="nv-btn nv-btn-primary nv-btn-block" onClick={onBack}>
        <Icon name="back" />
        {hasPlan ? t.backToPlan : t.backToStart}
      </button>
    </section>
  )
}

export function Crisis({ t, lang, onContinue }: { t: S; lang: Lang; onContinue: () => void }) {
  const h = useScreenHeading<HTMLHeadingElement>('crisis')
  return (
    <section aria-labelledby="nv-h1" className="space-y-5" role="alert" aria-live="assertive">
      <h1 id="nv-h1" ref={h} tabIndex={-1}>
        {t.crisisH1}
      </h1>
      <p>{t.crisisBody}</p>

      <div className="nv-card nv-crisis-card space-y-3">
        <p className="font-semibold">{t.crisis988}</p>
        <div className="grid grid-cols-2 gap-3">
          <a className="nv-btn nv-btn-danger" href="tel:988">
            <Icon name="phone" size={18} />
            {t.crisisCall988}
          </a>
          <a className="nv-btn nv-btn-secondary" href="sms:988">
            {t.crisisText988}
          </a>
        </div>
      </div>
      <div className="nv-card space-y-3">
        <p className="font-semibold">{t.crisis211}</p>
        <a className="nv-btn nv-btn-primary nv-btn-block" href="tel:211">
          <Icon name="phone" size={18} />
          {t.crisisCall211}
        </a>
      </div>
      <div className="nv-card space-y-3">
        <p>{t.crisis911}</p>
        <a className="nv-btn nv-btn-secondary nv-btn-block" href="tel:911">
          {t.crisisCall911}
        </a>
      </div>
      <p className="nv-small">{t.orCall(CAREER_CENTER.name, CAREER_CENTER.phone, CAREER_CENTER.hours[lang])}</p>
      <button type="button" className="nv-btn nv-btn-ghost" onClick={onContinue}>
        {t.crisisContinue}
      </button>
    </section>
  )
}

export function Talk({
  t,
  lang,
  onRequest,
  onBack,
}: {
  t: S
  lang: Lang
  onRequest: () => void
  onBack: () => void
}) {
  const h = useScreenHeading<HTMLHeadingElement>('talk')
  return (
    <section aria-labelledby="nv-h1" className="space-y-5">
      <h1 id="nv-h1" ref={h} tabIndex={-1}>
        {t.talkToPerson}
      </h1>
      <div className="nv-card space-y-3">
        <h2 className="text-lg">{CAREER_CENTER.name}</h2>
        <dl className="nv-dl">
          <dt>{t.phone}</dt>
          <dd>{CAREER_CENTER.phone}</dd>
          <dt>{t.hours}</dt>
          <dd>{CAREER_CENTER.hours[lang]}</dd>
        </dl>
        <a className="nv-btn nv-btn-primary nv-btn-block" href={`tel:${CAREER_CENTER.phone.replace(/\D/g, '')}`}>
          <Icon name="phone" size={18} />
          {lang === 'es' ? 'Llamar ahora' : 'Call now'}
        </a>
        <button type="button" className="nv-btn nv-btn-secondary nv-btn-block" onClick={onRequest}>
          <Icon name="person" size={18} />
          {lang === 'es' ? 'Que una persona se comunique conmigo' : 'Have a person contact me'}
        </button>
      </div>
      <div className="nv-card nv-crisis-card space-y-2">
        <p className="font-semibold">{lang === 'es' ? '¿Es una emergencia?' : 'Is it an emergency?'}</p>
        <p className="nv-small">{t.crisis988}</p>
        <p className="nv-small">{t.crisis211}</p>
        <div className="grid grid-cols-2 gap-3">
          <a className="nv-btn nv-btn-danger nv-btn-small" href="tel:988">
            {t.crisisCall988}
          </a>
          <a className="nv-btn nv-btn-secondary nv-btn-small" href="tel:211">
            {t.crisisCall211}
          </a>
        </div>
      </div>
      <button type="button" className="nv-btn nv-btn-ghost" onClick={onBack}>
        <Icon name="back" size={18} />
        {lang === 'es' ? 'Atrás' : 'Back'}
      </button>
    </section>
  )
}
