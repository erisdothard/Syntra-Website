import type { ReactNode } from 'react'
import type { S } from './view'
import type { Lang } from './types'

export type { S }

export function Icon({ name, size = 20 }: { name: 'chat' | 'phone' | 'check' | 'globe' | 'info' | 'arrow' | 'back' | 'alert' | 'person' | 'text'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'phone':
      return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
    case 'check':
      return <svg {...common} strokeWidth={3}><path d="M20 6 9 17l-5-5" /></svg>
    case 'globe':
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
    case 'info':
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
    case 'arrow':
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    case 'back':
      return <svg {...common}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
    case 'alert':
      return <svg {...common}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" /></svg>
    case 'person':
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
    case 'text':
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
    case 'chat':
    default:
      return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  }
}

export function Shell({
  t,
  lang,
  onLang,
  onTalk,
  staff = false,
  children,
}: {
  t: S
  lang: Lang
  onLang: () => void
  onTalk: () => void
  staff?: boolean
  children: ReactNode
}) {
  return (
    <div className="nv" lang={lang}>
      <a href="#nv-main" className="nv-skip">
        {t.skipToContent}
      </a>
      <p className="nv-banner" role="note">
        {t.sampleBanner}
      </p>
      {staff && (
        <p className="nv-banner nv-banner-staff" role="note">
          {t.staffBanner}
        </p>
      )}
      <header className="nv-header">
        <div className="nv-wrap nv-header-row">
          <a href={staff ? '/demo/navigator?view=staff' : '/demo/navigator'} className="nv-brand">
            <span className="nv-brand-mark">
              <Icon name="arrow" size={16} />
            </span>
            <span>{t.title}</span>
          </a>
          <p className="nv-ai-notice">
            <span className="flex-none">
              <Icon name="info" size={16} />
            </span>
            <span>{t.aiNotice}</span>
          </p>
          <div className="nv-header-actions">
            <button
              type="button"
              className="nv-btn nv-btn-onbrand nv-btn-small"
              onClick={onLang}
              aria-label={t.langToggleLabel}
              lang={lang === 'en' ? 'es' : 'en'}
            >
              <Icon name="globe" size={18} />
              {t.langToggle}
            </button>
            <button type="button" className="nv-btn nv-talk nv-btn-small" onClick={onTalk}>
              <Icon name="person" size={18} />
              {t.talkToPerson}
            </button>
          </div>
        </div>
      </header>
      <main id="nv-main" className="nv-wrap flex-1 pb-16 pt-6 lg:pt-10" tabIndex={-1}>
        {children}
      </main>
      <footer className="nv-footer">
        <div className="nv-wrap py-5">
          <a href="https://www.syntraai.tech" className="nv-footer-link">
            {t.footer}
          </a>
        </div>
      </footer>
    </div>
  )
}

export function SampleTag({ t }: { t: S }) {
  return <span className="nv-tag">{t.sampleLabel}</span>
}

export function IdTag({ id, t }: { id: string; t: S }) {
  return (
    <span className="nv-tag nv-tag-id">
      <span className="sr-only">{t.record} </span>
      {id}
    </span>
  )
}

export function Choice({
  selected,
  onClick,
  children,
  multi = false,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  multi?: boolean
}) {
  return (
    <button type="button" className="nv-choice" aria-pressed={selected} onClick={onClick}>
      <span className={`nv-choice-box ${multi ? '' : 'nv-choice-radio'}`}>{selected && <Icon name="check" size={14} />}</span>
      <span>{children}</span>
    </button>
  )
}
