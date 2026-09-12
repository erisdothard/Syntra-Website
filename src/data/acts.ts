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
  /**
   * Two lines, ~25 words. The rocket is the hero; a panel tall enough to need
   * a third line starts burying it. Detail belongs in Services and Portfolio,
   * not stacked on top of the render.
   */
  body: string
  /** Drives --tone-color for the eyebrow label. */
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
      'Every quote, every lead, every order waits for someone to get to it. Growth means more headcount, never more capacity.',
    tone: 'ember',
    align: 'left',
  },
  {
    n: 2,
    label: 'T-zero · Core ignition & shockwaves',
    title: 'One team, one machine',
    headline: 'You own what we build.',
    body:
      'Hyper Racer USA runs their company on one of ours — site, configurator, dealer map, CRM. No seat licences, no roadmap to wait on.',
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Liftoff · Final thrust',
    title: 'Judgment at machine speed',
    headline: 'It runs itself. And proves it.',
    body:
      'Leads arrive scored and prioritised before anyone opens them — graded against a fixed eval set, every request reporting what it cost.',
    tone: 'hot',
    align: 'left',
  },
]
