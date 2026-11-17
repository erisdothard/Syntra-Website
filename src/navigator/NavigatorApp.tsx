import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './navigator.css'
import { explainPlan, parseFreeText } from './api'
import { buildPlan, emptyProfile, isMecklenburgZip } from './engine'
import { Heard } from './Heard'
import { STRINGS } from './i18n'
import { Chat, type TextResult } from './Chat'
import { Question, Welcome } from './Intake'
import { PlanView } from './PlanView'
import { Rail } from './Rail'
import { Consent, Crisis, Sent, Talk } from './Screens'
import { careerCenterDestination, QUESTION_ORDER, type Destination, type ExplainState, type ParseInfo, type QuestionKey } from './view'
import { Staff } from './Staff'
import { addReferral, loadLang, loadPartners, logCall, newReferralCode, newSessionId, saveLang } from './store'
import { isCrisis } from './text'
import type { AiCall, Lang, Profile, Referral } from './types'
import { Shell } from './ui'

type Screen = 'welcome' | 'chat' | 'question' | 'heard' | 'plan' | 'consent' | 'sent' | 'crisis' | 'talk'

function initialLang(): Lang {
  const param = new URLSearchParams(window.location.search).get('lang')
  if (param === 'es' || param === 'en') return param
  const saved = loadLang()
  if (saved) return saved
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

/** Keeps the service matrix in step with staff edits made in this or another tab. */
function usePartners() {
  const [partners, setPartners] = useState(loadPartners)
  useEffect(() => {
    const refresh = () => setPartners(loadPartners())
    window.addEventListener('navigator-store', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('navigator-store', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return partners
}

export default function NavigatorApp() {
  const isStaff = useMemo(() => new URLSearchParams(window.location.search).get('view') === 'staff', [])
  const [lang, setLang] = useState<Lang>(initialLang)
  const t = STRINGS[lang]

  useEffect(() => {
    document.body.classList.add('nv-body')
    document.documentElement.style.background = '#f5f6f2'
    return () => document.body.classList.remove('nv-body')
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = `${isStaff ? `${t.staffH1} · ` : ''}${t.title} (demo) · Syntra AI`
  }, [lang, t, isStaff])

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'es' : 'en'
    setLang(next)
    saveLang(next)
  }

  if (isStaff) {
    return (
      <Shell t={t} lang={lang} onLang={toggleLang} onTalk={() => (window.location.href = '/demo/navigator#talk')} staff>
        <Staff t={t} lang={lang} />
      </Shell>
    )
  }
  return <Navigator t={t} lang={lang} onLang={toggleLang} />
}

function Navigator({ t, lang, onLang }: { t: (typeof STRINGS)[Lang]; lang: Lang; onLang: () => void }) {
  const partners = usePartners()
  const [sessionId, setSessionId] = useState(newSessionId)
  const [screen, setScreen] = useState<Screen>(() => (window.location.hash === '#talk' ? 'talk' : 'welcome'))
  const [returnTo, setReturnTo] = useState<Screen>('welcome')
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [queue, setQueue] = useState<QuestionKey[]>(QUESTION_ORDER)
  const [qIndex, setQIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [parse, setParse] = useState<ParseInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [calls, setCalls] = useState<AiCall[]>([])
  const [crisisChecks, setCrisisChecks] = useState(0)
  const [planReady, setPlanReady] = useState(false)
  const [explain, setExplain] = useState<Partial<Record<Lang, ExplainState>>>({})
  const [dest, setDest] = useState<Destination>(() => careerCenterDestination(lang))
  const [referral, setReferral] = useState<Referral | null>(null)
  /** Set once the AI is known to be off here, so later steps skip the round trip. */
  const [aiOff, setAiOff] = useState(false)
  const inFlight = useRef<Set<string>>(new Set())

  const plan = useMemo(() => (planReady ? buildPlan(profile, lang, { partners }) : null), [planReady, profile, lang, partners])

  const record = useCallback(
    (call: AiCall) => {
      setCalls((c) => [...c, call])
      logCall(sessionId, call)
      if (call.path === 'rules' && (call.reason === 'no_key' || call.reason === 'offline')) setAiOff(true)
    },
    [sessionId],
  )

  // Plain-language explanations: one call per plan per language, after the plan is on screen.
  useEffect(() => {
    if (!plan || explain[lang]) return
    const key = `${sessionId}:${lang}`
    if (inFlight.current.has(key)) return
    inFlight.current.add(key)
    setExplain((e) => ({ ...e, [lang]: { status: 'loading' } }))
    explainPlan(plan, profile, lang, aiOff).then((outcome) => {
      inFlight.current.delete(key)
      record(outcome.call)
      setExplain((e) => ({ ...e, [lang]: { status: 'done', outcome } }))
    })
  }, [plan, explain, lang, profile, aiOff, record, sessionId])

  /** Crisis check on any typed text. Returns false when the crisis screen took over. */
  const checkText = (text: string): boolean => {
    setCrisisChecks((n) => n + 1)
    if (isCrisis(text)) {
      setReturnTo(screen === 'crisis' ? returnTo : screen)
      setScreen('crisis')
      return false
    }
    return true
  }

  /** Typed text in the chat: safety check, privacy scrub, then the parser. Fills fields; never navigates. */
  const chatText = async (text: string): Promise<TextResult> => {
    if (!checkText(text)) return { crisis: true }
    setBusy(true)
    const outcome = await parseFreeText(text, lang, aiOff)
    setBusy(false)
    record(outcome.call)
    const f = outcome.fields
    const next: Profile = { ...profile }
    const filled: QuestionKey[] = []
    const fill = (q: QuestionKey, patch: Partial<Profile>) => {
      Object.assign(next, patch)
      filled.push(q)
    }
    if (f.goal) fill('goal', { goal: f.goal })
    if (f.barriers.length) fill('barriers', { barriers: f.barriers, barriersAnswered: true })
    else if (f.noBarriers) fill('barriers', { barriers: [], barriersAnswered: true })
    if (f.education) fill('education', { education: f.education })
    if (f.lastJob) fill('lastJob', { lastJob: f.lastJob, lastJobText: null })
    if (f.zip && isMecklenburgZip(f.zip)) fill('zip', { zip: f.zip, zipSkipped: false })
    if (f.household) fill('household', { household: f.household })
    setProfile(next)
    setParse((prev) => ({
      call: outcome.call,
      removed: [...new Set([...(prev?.removed ?? []), ...outcome.removed])],
      fromText: [...new Set([...(prev?.fromText ?? []).filter((q) => !filled.includes(q)), ...filled])],
    }))
    return { crisis: false, filled, call: outcome.call, removed: outcome.removed }
  }

  /** A tapped quick reply in the chat. */
  const chatAnswer = (patch: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...patch }))
    const keys = Object.keys(patch)
    setParse((prev) =>
      prev ? { ...prev, fromText: prev.fromText.filter((q) => !keys.some((k) => k.startsWith(q))) } : prev,
    )
  }

  const answer = (patch: Partial<Profile>) => {
    const next = { ...profile, ...patch }
    setProfile(next)
    const q = queue[qIndex]
    if (parse) setParse({ ...parse, fromText: parse.fromText.filter((x) => x !== q) })
    if (editing) {
      setEditing(false)
      setScreen('heard')
      return
    }
    if (qIndex + 1 < queue.length) setQIndex(qIndex + 1)
    else setScreen('heard')
  }

  const back = () => {
    if (editing) {
      setEditing(false)
      setScreen('heard')
    } else if (qIndex > 0) setQIndex(qIndex - 1)
    else setScreen('chat')
  }

  const startOver = () => {
    setProfile(emptyProfile())
    setParse(null)
    setPlanReady(false)
    setExplain({})
    setCalls([])
    setCrisisChecks(0)
    setReferral(null)
    setEditing(false)
    setQueue(QUESTION_ORDER)
    setQIndex(0)
    setSessionId(newSessionId())
    setScreen('welcome')
  }

  const openTalk = () => {
    if (screen !== 'talk') setReturnTo(screen === 'crisis' || screen === 'consent' ? returnTo : screen)
    setScreen('talk')
  }

  const openConsent = (d: Destination, from: Screen) => {
    setDest(d)
    setReturnTo(from)
    setScreen('consent')
  }

  let body
  switch (screen) {
    case 'welcome':
      body = <Welcome t={t} lang={lang} onStart={() => setScreen('chat')} />
      break
    case 'chat':
      body = (
        <Chat
          t={t}
          lang={lang}
          profile={profile}
          busy={busy}
          onText={chatText}
          onAnswer={chatAnswer}
          onFinish={() => setScreen('heard')}
        />
      )
      break
    case 'question': {
      const q = queue[qIndex]
      const total = editing ? 1 : queue.length
      body = (
        <Question
          key={`${q}-${editing}`}
          t={t}
          lang={lang}
          q={q}
          n={editing ? 1 : qIndex + 1}
          total={total}
          profile={profile}
          onAnswer={answer}
          onBack={back}
          onCheckText={checkText}
        />
      )
      break
    }
    case 'heard':
      body = (
        <Heard
          t={t}
          lang={lang}
          profile={profile}
          order={QUESTION_ORDER}
          parse={parse}
          onChange={(q) => {
            setEditing(true)
            setQueue([q])
            setQIndex(0)
            setScreen('question')
          }}
          onConfirm={() => {
            setExplain({})
            inFlight.current.clear()
            setPlanReady(true)
            setScreen('plan')
          }}
        />
      )
      break
    case 'plan':
      body = plan && (
        <PlanView
          t={t}
          lang={lang}
          plan={plan}
          explain={explain[lang]}
          onSend={(partnerId) => {
            const p = partnerId ? partners.find((x) => x.id === partnerId) : undefined
            openConsent(
              p ? { partnerId: p.id, partnerName: p.name, phone: p.phone, hours: p.hours[lang] } : careerCenterDestination(lang),
              'plan',
            )
          }}
          onEdit={() => {
            setPlanReady(false)
            setScreen('heard')
          }}
          onStartOver={startOver}
        />
      )
      break
    case 'consent':
      body = (
        <Consent
          t={t}
          lang={lang}
          profile={profile}
          plan={plan}
          dest={dest}
          onBack={() => setScreen(returnTo)}
          onConsent={(rows, contact) => {
            const r: Referral = {
              code: newReferralCode(),
              createdAt: new Date().toISOString(),
              lang,
              partnerId: dest.partnerId,
              partnerName: dest.partnerName,
              shared: rows,
              contact,
              status: 'new',
            }
            addReferral(r)
            setReferral(r)
            setScreen('sent')
          }}
        />
      )
      break
    case 'sent':
      body = referral && (
        <Sent t={t} referral={referral} hasPlan={!!plan} onBack={() => setScreen(plan ? 'plan' : 'welcome')} />
      )
      break
    case 'crisis':
      body = <Crisis t={t} lang={lang} onContinue={() => setScreen(returnTo === 'crisis' ? 'welcome' : returnTo)} />
      break
    case 'talk':
      body = (
        <Talk
          t={t}
          lang={lang}
          onRequest={() => openConsent(careerCenterDestination(lang), returnTo === 'talk' ? 'welcome' : returnTo)}
          onBack={() => setScreen(returnTo === 'talk' ? 'welcome' : returnTo)}
        />
      )
      break
  }

  return (
    <Shell t={t} lang={lang} onLang={onLang} onTalk={openTalk}>
      <div className="nv-work" data-screen={screen}>
        <div className="nv-flow">{body}</div>
        <Rail
          t={t}
          lang={lang}
          profile={profile}
          parse={parse}
          calls={calls}
          crisisChecks={crisisChecks}
          showHow={screen === 'welcome' || screen === 'talk' || screen === 'crisis'}
        />
      </div>
    </Shell>
  )
}
