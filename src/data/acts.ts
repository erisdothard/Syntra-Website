export interface Act {
  n: 1 | 2 | 3
  label: string
  title: string
  /**
   * Keep to ~3 rendered lines in the panel, and no word longer than ~9
   * characters — at clamp(2.2rem, 5.6vw, 5rem) a longer one overruns the
   * container and clips off the edge.
   */
  headline: string
  /** Constrained to max-w-md so the prose column clears the rocket. */
  body: string
  /** Drives --tone-color for the eyebrow label. */
  tone: 'ember' | 'data' | 'hot'
  align: 'left' | 'right' | 'center'
}

/*
  The business is the payload; Syntra is the vehicle. Each act reports the
  state the render and the telemetry HUD are in at that scroll position
  (stacked on the pad → full stage firing → nominal on orbit), in launch
  grammar: short, factual, one named build per act.
*/
export const acts: Act[] = [
  {
    n: 1,
    label: 'Stage one · Off the ground',
    title: 'Stacked on the pad',
    headline: 'Stacked on the pad.',
    body:
      'The site your customers see and the CRM behind it, built as one stack. Hyper Racer USA: configurator, dealer map, 19-section CRM, from a blank page.',
    tone: 'ember',
    align: 'left',
  },
  {
    n: 2,
    label: 'Stage two · Full power',
    title: 'All engines, one burn',
    headline: 'All engines. One burn.',
    body:
      'Orders, customers, payments and records move between the parts on their own. Your live site, edited from the screen your team works leads in.',
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Stage three · It flies itself',
    title: 'Nominal, it flies itself',
    headline: 'Nominal. It flies itself.',
    body:
      'Agents inside the CRM research each lead, score it and draft the reply. Every action logged with its cost: telemetry you can read, in a system you own.',
    tone: 'hot',
    align: 'left',
  },
]
