export interface Spec {
  /**
   * Declares what kind of thing `values` are. Every value in a row must be
   * that same kind — a stack row holds only tools, a status row only status.
   * Mixing a claim, a tool and a feature in one row is what made the old chip
   * strip meaningless.
   */
  label: string
  values: string[]
}

export interface Act {
  n: 1 | 2 | 3
  label: string
  title: string
  /**
   * Keep to ~4 rendered lines in the max-w-xl panel, and no word longer than
   * ~9 characters — at clamp(2.2rem, 5.6vw, 5rem) a longer one overruns the
   * container and clips off the edge. Long panels also collide with the HUD.
   */
  headline: string
  body: string
  /**
   * Instrumentation. Omitted on Act 1 on purpose: a problem has no spec sheet,
   * and the readout appearing at ignition is the point.
   */
  specs?: Spec[]
  /** Drives --tone-color for the spec readout. */
  tone: 'ember' | 'data' | 'hot'
  align: 'left' | 'right' | 'center'
}

export const acts: Act[] = [
  {
    n: 1,
    label: 'T-minus · Venting & pressure build-up',
    title: 'Pressure with nowhere to go',
    headline: 'Human speed is your ceiling.',
    body:
      'Every quote, every lead, every order waits for someone to get to it. Growth means hiring more people to move the same information around. Leads go cold in the gap. The limit was never your ambition — it is the software nobody ever built you.',
    tone: 'ember',
    align: 'left',
  },
  {
    n: 2,
    label: 'T-zero · Core ignition & shockwaves',
    title: 'One team, one machine',
    headline: 'You own what we build.',
    body:
      'Hyper Racer USA got a public site, a pricing configurator, a dealer map, and the 19-section CRM their team now runs the company from. One codebase, one team. No seat licences, no roadmap to wait on — it is yours, not rented.',
    specs: [
      { label: 'Stack', values: ['Next.js 16', 'React 19', 'Supabase', 'Vercel'] },
      { label: 'Surfaces', values: ['Public site', 'Configurator', 'Dealer map', 'CRM'] },
      { label: 'Status', values: ['Live in production'] },
    ],
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Liftoff · Final thrust',
    title: 'Judgment at machine speed',
    headline: 'It runs itself. And proves it.',
    body:
      'Inbound leads are enriched, scored, and prioritised by a model before anyone opens them. It runs dry first so you see the calls before they land, it is graded against a fixed eval set on the same code path production runs, and every request reports what it cost. Automation you cannot measure is a liability.',
    specs: [
      { label: 'Pipeline', values: ['Enrich', 'Score', 'Prioritise'] },
      { label: 'Guards', values: ['Dry-run default', 'Fixed eval set', 'Audit trail'] },
      { label: 'Logged', values: ['Tokens', 'Cost', 'Latency'] },
    ],
    tone: 'hot',
    align: 'left',
  },
]
