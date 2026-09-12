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
  chips: string[]
  /** Tailwind color class for the chip accent. */
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
      'Every quote, every lead, every order waits for someone to get to it. Growth means hiring more people to move the same information around. The limit was never your ambition — it is the software nobody ever built you.',
    chips: ['Growth means headcount', 'Leads go cold waiting', 'One person, one bottleneck', 'No system of record'],
    tone: 'ember',
    align: 'left',
  },
  {
    n: 2,
    label: 'T-zero · Core ignition & shockwaves',
    title: 'One team, one machine',
    headline: 'You own what we build.',
    body:
      'Hyper Racer USA got a public site, a pricing configurator, a dealer map, and the 19-section CRM their team now runs the company from. One codebase, one team, live in production. No seat licences, no roadmap to wait on.',
    chips: ['Yours, not rented', 'Next.js 16 · React 19', 'Client-editable CMS', 'Live in production'],
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Liftoff · Final thrust',
    title: 'Judgment at machine speed',
    headline: 'It runs itself. And proves it.',
    body:
      'Inbound leads are enriched, scored, and prioritised by a model before anyone opens them, every decision written to an audit trail. It runs dry first so you see the calls before they land, graded against a fixed eval set, with tokens, cost, and latency logged per request. Automation you cannot measure is a liability.',
    chips: ['Scored before you see it', 'Graded against evals', 'Full audit trail', 'Voice agents · ElevenLabs'],
    tone: 'hot',
    align: 'left',
  },
]
