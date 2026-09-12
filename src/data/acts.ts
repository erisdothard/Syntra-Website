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

export const acts: Act[] = [
  {
    n: 1,
    label: 'Stage one · Off the ground',
    title: 'First, we build it',
    headline: 'First, we build it.',
    body:
      'Websites, customer portals, booking and ordering systems, marketplaces, internal tools. If your business needs it and nothing off the shelf does the job, we build it from scratch.',
    tone: 'ember',
    align: 'left',
  },
  {
    n: 2,
    label: 'Stage two · Full power',
    title: 'Then we connect it',
    headline: 'Then we connect it.',
    body:
      'Your tools start talking to each other. Orders, customers, payments, records. Information moves where it needs to go the moment it arrives, without anyone copying it over by hand.',
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Stage three · It flies itself',
    title: 'Then it runs without you',
    headline: 'Then it runs without you.',
    body:
      'AI works inside your systems and handles the real tasks. Sorting requests, answering customers, moving work forward. Every step gets logged, so you can see exactly what it did.',
    tone: 'hot',
    align: 'left',
  },
]
