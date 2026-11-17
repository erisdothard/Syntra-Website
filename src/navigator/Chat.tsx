import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MODELS } from './config'
import { COPY } from './copy'
import { LAST_JOBS } from './data'
import { isMecklenburgZip } from './engine'
import { BARRIER_LABELS, EDUCATION_LABELS, GOAL_LABELS, HOUSEHOLD_LABELS } from './i18n'
import type { Removed } from './text'
import type { AiCall, Barrier, Education, Goal, Household, Lang, Profile } from './types'
import { Icon, type S } from './ui'
import { fieldLabel, profileValue, QUESTION_ORDER, useScreenHeading, type QuestionKey } from './view'

/**
 * Conversational intake. One thread: the navigator asks, the person types in their
 * own words or taps a quick reply. Typed text goes through the safety check and the
 * privacy scrub, then the small model maps it to profile fields; the navigator says
 * back what it understood and only asks for what is still missing.
 */

export type TextResult = { crisis: true } | { crisis: false; filled: QuestionKey[]; call: AiCall; removed: Removed[] }

type Msg =
  | { id: number; kind: 'hello' }
  | { id: number; kind: 'me'; text: string }
  | { id: number; kind: 'got'; filled: QuestionKey[]; call: AiCall; removed: Removed[] }
  | { id: number; kind: 'none' }
  | { id: number; kind: 'zipbad' }
  | { id: number; kind: 'ask'; q: QuestionKey }
  | { id: number; kind: 'done' }

type NoId = Msg extends infer M ? (M extends Msg ? Omit<M, 'id'> : never) : never

export function answered(q: QuestionKey, p: Profile): boolean {
  switch (q) {
    case 'goal':
      return p.goal !== null
    case 'barriers':
      return p.barriersAnswered
    case 'education':
      return p.education !== null
    case 'lastJob':
      return p.lastJob !== null
    case 'zip':
      return p.zip !== null || p.zipSkipped
    case 'household':
      return p.household !== null
  }
}

function askText(q: QuestionKey, t: S): string {
  return { goal: t.qGoal, barriers: t.qBarriers, education: t.qEducation, lastJob: t.qLastJob, zip: t.qZip, household: t.qHousehold }[q]
}

let nextId = 1

export function Chat({
  t,
  lang,
  profile,
  busy,
  onText,
  onAnswer,
  onFinish,
}: {
  t: S
  lang: Lang
  profile: Profile
  busy: boolean
  onText: (text: string) => Promise<TextResult>
  onAnswer: (patch: Partial<Profile>) => void
  onFinish: () => void
}) {
  const c = COPY[lang]
  const h = useScreenHeading<HTMLHeadingElement>('chat')
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ id: nextId++, kind: 'hello' }])
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<Barrier[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const push = (m: NoId) => setMsgs((cur) => [...cur, { ...m, id: nextId++ } as Msg])

  const pending = QUESTION_ORDER.find((q) => !answered(q, profile)) ?? null

  // After every answer, ask the next missing question once, or close the intake.
  useEffect(() => {
    if (busy) return
    setMsgs((cur) => {
      const lastAsk = [...cur].reverse().find((m) => m.kind === 'ask' || m.kind === 'hello' || m.kind === 'done')
      if (pending === null) return lastAsk?.kind === 'done' ? cur : [...cur, { id: nextId++, kind: 'done' }]
      if (lastAsk?.kind === 'hello' && pending === 'goal') return cur
      if (lastAsk?.kind === 'ask' && lastAsk.q === pending) return cur
      return [...cur, { id: nextId++, kind: 'ask', q: pending }]
    })
  }, [pending, busy])

  // Keyboard and screen-reader users land in the message box, ready to answer.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [msgs, busy])

  const tap = (label: string, patch: Partial<Profile>) => {
    push({ kind: 'me', text: label })
    onAnswer(patch)
  }

  const send = async () => {
    const said = text.trim()
    if (!said || busy) return
    setText('')
    push({ kind: 'me', text: said })
    // A bare 5-digit ZIP is read by rules, never sent to the model.
    if (/^\d{5}$/.test(said)) {
      if (isMecklenburgZip(said)) onAnswer({ zip: said, zipSkipped: false })
      else push({ kind: 'zipbad' })
      return
    }
    const r = await onText(said)
    if (r.crisis) return
    push(r.filled.length ? { kind: 'got', filled: r.filled, call: r.call, removed: r.removed } : { kind: 'none' })
  }

  const removedLabel: Record<Removed, string> = { name: t.removedName, phone: t.removedPhone, email: t.removedEmail, id: t.removedId }
  const lastId = msgs[msgs.length - 1]?.id

  const quickReplies = (q: QuestionKey) => {
    const chip = (key: string, label: string, onClick: () => void, on = false) => (
      <button key={key} type="button" className="nv-qr" aria-pressed={on} onClick={onClick}>
        {on && <Icon name="check" size={14} />}
        {label}
      </button>
    )
    switch (q) {
      case 'goal':
        return (Object.keys(GOAL_LABELS) as Goal[]).map((g) => chip(g, GOAL_LABELS[g][lang], () => tap(GOAL_LABELS[g][lang], { goal: g })))
      case 'barriers':
        return [
          ...(Object.keys(BARRIER_LABELS) as Barrier[]).map((b) =>
            chip(b, BARRIER_LABELS[b][lang], () => setPicked((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b])), picked.includes(b)),
          ),
          chip('none', t.noneOfThese, () => tap(t.noneOfThese, { barriers: [], barriersAnswered: true })),
          <button
            key="done"
            type="button"
            className="nv-btn nv-btn-primary nv-btn-xs"
            disabled={picked.length === 0}
            onClick={() => tap(picked.map((b) => BARRIER_LABELS[b][lang]).join(', '), { barriers: picked, barriersAnswered: true })}
          >
            {t.done}
          </button>,
        ]
      case 'education':
        return (Object.keys(EDUCATION_LABELS) as Education[]).map((e) =>
          chip(e, EDUCATION_LABELS[e][lang], () => tap(EDUCATION_LABELS[e][lang], { education: e })),
        )
      case 'lastJob':
        return LAST_JOBS.map((j) => chip(j.id, j.label[lang], () => tap(j.label[lang], { lastJob: j.id, lastJobText: null })))
      case 'zip':
        return [chip('skip', t.zipSkip, () => tap(t.zipSkip, { zip: null, zipSkipped: true }))]
      case 'household':
        return (Object.keys(HOUSEHOLD_LABELS) as Household[]).map((x) =>
          chip(x, HOUSEHOLD_LABELS[x][lang], () => tap(HOUSEHOLD_LABELS[x][lang], { household: x })),
        )
    }
  }

  const bot = (id: number, children: ReactNode, q: QuestionKey | null) => (
    <li key={id} className="nv-msg is-bot">
      <span className="nv-msg-who">{c.chatBot}</span>
      <div className="nv-bubble">{children}</div>
      {q && id === lastId && !busy && <div className="nv-qrs">{quickReplies(q)}</div>}
    </li>
  )

  return (
    <section aria-labelledby="nv-h1" className="nv-chat">
      <h1 id="nv-h1" ref={h} tabIndex={-1} className="sr-only">
        {t.title}
      </h1>
      <div role="log" aria-live="polite" aria-relevant="additions" aria-label={c.chatBot}>
      <ol className="nv-thread">
        {msgs.map((m) => {
          switch (m.kind) {
            case 'hello':
              return bot(m.id, <p>{c.chatHello}</p>, pending === 'goal' ? 'goal' : null)
            case 'me':
              return (
                <li key={m.id} className="nv-msg is-me">
                  <span className="nv-msg-who">{c.chatYou}</span>
                  <div className="nv-bubble">
                    <p>{m.text}</p>
                  </div>
                </li>
              )
            case 'got':
              return bot(
                m.id,
                <>
                  <p>{c.chatGot}</p>
                  <dl className="nv-got">
                    {m.filled.map((q) => (
                      <div key={q}>
                        <dt>{fieldLabel(q, t)}</dt>
                        <dd>{profileValue(q, profile, lang, t)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="nv-got-meta">
                    <span className={`nv-src ${m.call.path === 'model' ? 'nv-src-ai' : 'nv-src-rules'}`}>
                      {m.call.path === 'model' ? c.readBy(MODELS.parse.label) : c.readByRulesShort}
                    </span>
                    {m.removed.length > 0 && <span>{c.removedNote(m.removed.map((r) => removedLabel[r]).join(', '))}</span>}
                  </p>
                </>,
                pending,
              )
            case 'none':
              return bot(m.id, <p>{c.chatGotNone}</p>, pending)
            case 'zipbad':
              return bot(m.id, <p>{t.zipError}</p>, 'zip')
            case 'ask':
              return bot(m.id, <p>{askText(m.q, t)}</p>, m.q)
            case 'done':
              return bot(
                m.id,
                <>
                  <p>{c.chatAllSet}</p>
                  <button type="button" className="nv-btn nv-btn-primary nv-btn-small mt-3" onClick={onFinish}>
                    {c.chatReview}
                    <Icon name="arrow" size={18} />
                  </button>
                </>,
                null,
              )
          }
        })}
        {busy && (
          <li className="nv-msg is-bot">
            <span className="nv-msg-who">{c.chatBot}</span>
            <div className="nv-bubble nv-typing">
              <span aria-hidden className="nv-typing-dots">
                <i />
                <i />
                <i />
              </span>
              <span>{c.chatTyping}</span>
            </div>
          </li>
        )}
      </ol>
      </div>
      <div ref={endRef} className="nv-thread-end" />

      {pending !== null && (
        <form
          className="nv-composer"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <label htmlFor="nv-say" className="sr-only">
            {c.chatInputLabel}
          </label>
          <textarea
            id="nv-say"
            ref={inputRef}
            rows={1}
            className="nv-composer-input"
            placeholder={pending === 'zip' ? t.zipLabel : c.chatPlaceholder}
            inputMode={pending === 'zip' ? 'numeric' : 'text'}
            value={text}
            maxLength={800}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            aria-describedby="nv-say-privacy"
          />
          <button type="submit" className="nv-btn nv-btn-primary nv-composer-send" disabled={busy || !text.trim()} aria-label={c.chatSend}>
            <Icon name="arrow" size={20} />
          </button>
          <p id="nv-say-privacy" className="nv-composer-note">
            {c.chatPrivacy}
          </p>
        </form>
      )}
    </section>
  )
}
