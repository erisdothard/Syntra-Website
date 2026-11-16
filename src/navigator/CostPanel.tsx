import { MODELS, typicalSessionUsd } from './config'
import { usd } from './i18n'
import type { AiCall, Lang } from './types'
import type { S } from './ui'

/**
 * "How this works": which steps used AI and what each cost. The deterministic
 * steps are listed with 0 tokens because they are database rules, not model calls.
 */
export function CostPanel({ t, lang, calls, crisisChecks }: { t: S; lang: Lang; calls: AiCall[]; crisisChecks: number }) {
  const last = (step: AiCall['step']) => [...calls].reverse().find((c) => c.step === step)
  const parseCalls = calls.filter((c) => c.step === 'parse')
  const explainCalls = calls.filter((c) => c.step === 'explain')
  const total = calls.reduce((s, c) => s + c.costUsd, 0)
  const totalIn = calls.reduce((s, c) => s + c.inputTokens, 0)
  const totalOut = calls.reduce((s, c) => s + c.outputTokens, 0)

  const how = (c: AiCall | undefined, step: 'parse' | 'explain') => {
    if (!c) return t.costNotRun
    if (c.path === 'model') return MODELS[step].label
    return c.reason === 'no_key' || c.reason === 'offline' ? t.costModelOff : t.costRules
  }
  const sum = (cs: AiCall[]) => ({
    in: cs.reduce((s, c) => s + c.inputTokens, 0),
    out: cs.reduce((s, c) => s + c.outputTokens, 0),
    usd: cs.reduce((s, c) => s + c.costUsd, 0),
    n: cs.filter((c) => c.path === 'model').length,
  })
  const p = sum(parseCalls)
  const e = sum(explainCalls)

  const rows: { step: string; how: string; tokens: string; cost: string; perCall?: string }[] = [
    { step: t.costRows.crisis, how: `${t.costRules}${crisisChecks ? ` ×${crisisChecks}` : ''}`, tokens: '0 / 0', cost: '$0' },
    { step: t.costRows.privacy, how: t.costRules, tokens: '0 / 0', cost: '$0' },
    {
      step: t.costRows.parse,
      how: how(last('parse'), 'parse'),
      tokens: `${p.in.toLocaleString()} / ${p.out.toLocaleString()}`,
      cost: usd(p.usd),
      perCall: p.n > 1 ? `${p.n} × ~${usd(p.usd / p.n)}` : undefined,
    },
    { step: t.costRows.match, how: t.costRules, tokens: '0 / 0', cost: '$0' },
    {
      step: t.costRows.explain,
      how: how(last('explain'), 'explain'),
      tokens: `${e.in.toLocaleString()} / ${e.out.toLocaleString()}`,
      cost: usd(e.usd),
      perCall: e.n > 1 ? `${e.n} × ~${usd(e.usd / e.n)}` : undefined,
    },
  ]

  return (
    <section aria-labelledby="nv-cost-h" className="nv-card space-y-3">
      <h2 id="nv-cost-h">{t.costH2}</h2>
      <p className="nv-small">{t.costIntro}</p>
      <div className="-mx-2 overflow-x-auto" tabIndex={0} role="region" aria-label={t.costH2}>
        <table className="nv-table">
          <caption className="sr-only">{t.costH2}</caption>
          <thead>
            <tr>
              <th scope="col">{t.costStep}</th>
              <th scope="col">{t.costHow}</th>
              <th scope="col" className="num">
                {t.costTokens}
              </th>
              <th scope="col" className="num">
                {t.costUsd}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.step}>
                <th scope="row" className="font-normal text-[#1b2430]">
                  {r.step}
                </th>
                <td>{r.how}</td>
                <td className="num">{r.tokens}</td>
                <td className="num">
                  {r.cost}
                  {r.perCall && <div className="nv-small nv-muted">{r.perCall}</div>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>{t.costTotal}</td>
              <td className="num">
                {totalIn.toLocaleString()} / {totalOut.toLocaleString()}
              </td>
              <td className="num">{usd(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="nv-small">{t.costTypical(usd(typicalSessionUsd()))}</p>
      <p className="nv-small nv-muted">
        {MODELS.parse.label}: ${MODELS.parse.inPerMTok} / ${MODELS.parse.outPerMTok} · {MODELS.explain.label}: $
        {MODELS.explain.inPerMTok} / ${MODELS.explain.outPerMTok} {lang === 'es' ? '(USD por millón de tokens, entrada / salida).' : '(USD per million tokens, in / out).'} {t.costRates}
      </p>
    </section>
  )
}
