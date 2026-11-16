/**
 * The two models and their list prices, in one place so they can be swapped.
 * api/navigator-parse.ts and api/navigator-explain.ts carry the same IDs (each
 * Vercel function is bundled on its own and does not import from src/).
 */
export const MODELS = {
  parse: { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', inPerMTok: 0.1, outPerMTok: 0.5 },
  explain: { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', inPerMTok: 2, outPerMTok: 10 },
} as const

export type Step = keyof typeof MODELS

export function costUsd(step: Step, inputTokens: number, outputTokens: number): number {
  const m = MODELS[step]
  return (inputTokens * m.inPerMTok + outputTokens * m.outPerMTok) / 1_000_000
}

/** A typical session with the AI on, for the cost panel: one parse and one explanation call. */
export const TYPICAL = {
  parse: { inputTokens: 900, outputTokens: 350 },
  explain: { inputTokens: 2600, outputTokens: 1100 },
}

export function typicalSessionUsd(): number {
  return (
    costUsd('parse', TYPICAL.parse.inputTokens, TYPICAL.parse.outputTokens) +
    costUsd('explain', TYPICAL.explain.inputTokens, TYPICAL.explain.outputTokens)
  )
}
