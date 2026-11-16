import { useState } from 'react'
import { LAST_JOBS } from './data'
import { isMecklenburgZip } from './engine'
import { BARRIER_LABELS, EDUCATION_LABELS, GOAL_LABELS, HOUSEHOLD_LABELS } from './i18n'
import { keywordParse } from './text'
import type { Barrier, Education, Goal, Household, Lang, Profile } from './types'
import { Choice, Icon, type S } from './ui'
import { useScreenHeading, type QuestionKey } from './view'

export function Welcome({ t, onStart }: { t: S; onStart: () => void }) {
  const h = useScreenHeading<HTMLHeadingElement>('welcome')
  return (
    <section aria-labelledby="nv-h1" className="space-y-5">
      <h1 id="nv-h1" ref={h} tabIndex={-1}>
        {t.welcomeH1}
      </h1>
      <p className="text-lg">{t.subtitle}</p>
      <p>{t.welcomeBody}</p>
      <p className="nv-muted">{t.welcomeAnon}</p>
      <button type="button" className="nv-btn nv-btn-primary nv-btn-block" onClick={onStart}>
        {t.start}
        <Icon name="arrow" />
      </button>
    </section>
  )
}

export function FreeText({
  t,
  busy,
  onSubmit,
  onSkip,
  onBack,
}: {
  t: S
  busy: boolean
  onSubmit: (text: string) => void
  onSkip: () => void
  onBack: () => void
}) {
  const h = useScreenHeading<HTMLHeadingElement>('freetext')
  const [text, setText] = useState('')
  return (
    <section aria-labelledby="nv-h1" className="space-y-5">
      <h1 id="nv-h1" ref={h} tabIndex={-1}>
        {t.freeTextQ}
      </h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) onSubmit(text)
          else onSkip()
        }}
      >
        <div>
          <label htmlFor="nv-free" className="nv-label">
            {t.freeTextLabel}
          </label>
          <p id="nv-free-hint" className="nv-muted nv-small mb-2">
            {t.freeTextHint}
          </p>
          <textarea
            id="nv-free"
            className="nv-textarea"
            value={text}
            maxLength={800}
            onChange={(e) => setText(e.target.value)}
            aria-describedby="nv-free-hint nv-free-privacy"
            disabled={busy}
          />
          <p id="nv-free-privacy" className="nv-muted nv-small mt-2">
            {t.freeTextPrivacy}
          </p>
        </div>
        {busy ? (
          <p className="flex items-center gap-3" role="status">
            <span className="nv-spinner" aria-hidden />
            {t.reading}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <button type="submit" className="nv-btn nv-btn-primary nv-btn-block" disabled={!text.trim()}>
              {t.continue}
              <Icon name="arrow" />
            </button>
            <button type="button" className="nv-btn nv-btn-secondary nv-btn-block" onClick={onSkip}>
              {t.answerByTapping}
            </button>
            <button type="button" className="nv-btn nv-btn-ghost self-start" onClick={onBack}>
              <Icon name="back" size={18} />
              {t.backToStart}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}

function Progress({ n, total, t }: { n: number; total: number; t: S }) {
  return (
    <div className="space-y-2">
      <p className="nv-muted nv-small">{t.step(n, total)}</p>
      <div className="nv-progress" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} data-on={i < n} />
        ))}
      </div>
    </div>
  )
}

export function Question({
  t,
  lang,
  q,
  n,
  total,
  profile,
  onAnswer,
  onBack,
  onCheckText,
}: {
  t: S
  lang: Lang
  q: QuestionKey
  n: number
  total: number
  profile: Profile
  onAnswer: (patch: Partial<Profile>) => void
  onBack: () => void
  /** Runs the crisis check on typed text. Returns false when the crisis screen took over. */
  onCheckText: (text: string) => boolean
}) {
  const h = useScreenHeading<HTMLHeadingElement>(`q-${q}`)
  const [barriers, setBarriers] = useState<Barrier[]>(profile.barriers)
  const [zip, setZip] = useState(profile.zip ?? '')
  const [zipError, setZipError] = useState(false)
  const [jobText, setJobText] = useState(profile.lastJobText ?? '')
  const [jobError, setJobError] = useState(false)

  const heading = {
    goal: t.qGoal,
    barriers: t.qBarriers,
    education: t.qEducation,
    lastJob: t.qLastJob,
    zip: t.qZip,
    household: t.qHousehold,
  }[q]

  let body
  if (q === 'goal') {
    body = (
      <div role="group" aria-labelledby="nv-h1" className="grid gap-3">
        {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
          <Choice key={g} selected={profile.goal === g} onClick={() => onAnswer({ goal: g })}>
            {GOAL_LABELS[g][lang]}
          </Choice>
        ))}
      </div>
    )
  } else if (q === 'barriers') {
    const toggle = (b: Barrier) =>
      setBarriers((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]))
    body = (
      <div className="space-y-4">
        <div role="group" aria-labelledby="nv-h1" className="grid gap-3">
          {(Object.keys(BARRIER_LABELS) as Barrier[]).map((b) => (
            <Choice key={b} multi selected={barriers.includes(b)} onClick={() => toggle(b)}>
              {BARRIER_LABELS[b][lang]}
            </Choice>
          ))}
          <Choice
            multi
            selected={profile.barriersAnswered && barriers.length === 0}
            onClick={() => {
              setBarriers([])
              onAnswer({ barriers: [], barriersAnswered: true })
            }}
          >
            {t.noneOfThese}
          </Choice>
        </div>
        <button
          type="button"
          className="nv-btn nv-btn-primary nv-btn-block"
          disabled={barriers.length === 0}
          onClick={() => onAnswer({ barriers, barriersAnswered: true })}
        >
          {t.done}
          <Icon name="arrow" />
        </button>
      </div>
    )
  } else if (q === 'education') {
    body = (
      <div role="group" aria-labelledby="nv-h1" className="grid gap-3">
        {(Object.keys(EDUCATION_LABELS) as Education[]).map((e) => (
          <Choice key={e} selected={profile.education === e} onClick={() => onAnswer({ education: e })}>
            {EDUCATION_LABELS[e][lang]}
          </Choice>
        ))}
      </div>
    )
  } else if (q === 'lastJob') {
    body = (
      <div className="space-y-5">
        <div role="group" aria-labelledby="nv-h1" className="grid gap-3">
          {LAST_JOBS.map((j) => (
            <Choice key={j.id} selected={profile.lastJob === j.id} onClick={() => onAnswer({ lastJob: j.id, lastJobText: null })}>
              {j.label[lang]}
            </Choice>
          ))}
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!jobText.trim()) return
            if (!onCheckText(jobText)) return
            const match = keywordParse(jobText).lastJob
            if (!match) {
              setJobError(true)
              return
            }
            onAnswer({ lastJob: match, lastJobText: jobText.trim().slice(0, 80) })
          }}
        >
          <label htmlFor="nv-job" className="nv-label">
            {t.lastJobOther}
            <span className="sr-only">: {t.lastJobOtherLabel}</span>
          </label>
          <input
            id="nv-job"
            className="nv-input"
            value={jobText}
            maxLength={80}
            onChange={(e) => {
              setJobText(e.target.value)
              setJobError(false)
            }}
            aria-invalid={jobError}
            aria-describedby={jobError ? 'nv-job-err' : undefined}
            autoComplete="organization-title"
          />
          {jobError && (
            <p id="nv-job-err" className="nv-error" role="alert">
              {lang === 'es'
                ? 'No encontramos ese trabajo en esta muestra. Elija el más parecido de la lista.'
                : 'We could not match that job in this sample. Pick the closest one from the list.'}
            </p>
          )}
          <button type="submit" className="nv-btn nv-btn-secondary nv-btn-block" disabled={!jobText.trim()}>
            {t.continue}
          </button>
        </form>
      </div>
    )
  } else if (q === 'zip') {
    body = (
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const clean = zip.trim()
          if (!isMecklenburgZip(clean)) {
            setZipError(true)
            return
          }
          onAnswer({ zip: clean, zipSkipped: false })
        }}
      >
        <div>
          <label htmlFor="nv-zip" className="nv-label">
            {t.zipLabel}
          </label>
          <input
            id="nv-zip"
            className="nv-input max-w-[12rem] text-xl tracking-widest"
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[0-9]{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => {
              setZip(e.target.value.replace(/\D/g, ''))
              setZipError(false)
            }}
            aria-invalid={zipError}
            aria-describedby={zipError ? 'nv-zip-err' : undefined}
          />
          {zipError && (
            <p id="nv-zip-err" className="nv-error mt-2" role="alert">
              {t.zipError}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button type="submit" className="nv-btn nv-btn-primary nv-btn-block">
            {t.continue}
            <Icon name="arrow" />
          </button>
          <button type="button" className="nv-btn nv-btn-secondary nv-btn-block" onClick={() => onAnswer({ zip: null, zipSkipped: true })}>
            {t.zipSkip}
          </button>
        </div>
      </form>
    )
  } else {
    body = (
      <div role="group" aria-labelledby="nv-h1" className="grid gap-3">
        {(Object.keys(HOUSEHOLD_LABELS) as Household[]).map((hh) => (
          <Choice key={hh} selected={profile.household === hh} onClick={() => onAnswer({ household: hh })}>
            {HOUSEHOLD_LABELS[hh][lang]}
          </Choice>
        ))}
      </div>
    )
  }

  return (
    <section aria-labelledby="nv-h1" className="space-y-5">
      <div className="space-y-3">
        <h1 id="nv-h1" ref={h} tabIndex={-1}>
          {heading}
        </h1>
        <Progress n={n} total={total} t={t} />
      </div>
      {body}
      <button type="button" className="nv-btn nv-btn-ghost" onClick={onBack}>
        <Icon name="back" size={18} />
        {lang === 'es' ? 'Atrás' : 'Back'}
      </button>
    </section>
  )
}
