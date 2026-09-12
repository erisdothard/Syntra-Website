export interface Act {
  n: 1 | 2 | 3
  label: string
  title: string
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
    title: 'People doing software’s job',
    headline: 'Somebody on your team is the API.',
    body:
      'Orders come in by email and get re-typed into three systems. One person answers the same five questions on the phone forty times a day. The status everyone needs lives in their head. It works — until they take a week off.',
    chips: ['Re-typed into 3 systems', 'Status in someone’s head', 'PDFs chased by email', 'Phone tag for updates', 'No system of record'],
    tone: 'ember',
    align: 'left',
  },
  {
    n: 2,
    label: 'T-zero · Core ignition & shockwaves',
    title: 'One build, not five vendors',
    headline: 'Site, app, backend, database.',
    body:
      'Hyper Racer USA runs on one of ours end to end \u2014 public site, pricing configurator, Mapbox dealer network, and a 19-section CRM they edit their own live pages from. Next.js 16, React 19, Supabase, Vercel. FreightX before it: four roles, live GPS, Stripe billing. One codebase each, no vendor relay race.',
    chips: ['Next.js 16 \u00b7 React 19', 'Supabase \u00b7 Postgres', 'Client-editable CMS', 'Stripe billing', 'Live in production'],
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Liftoff · Final thrust',
    title: 'Agents that work the records',
    headline: 'Not a chatbot in the corner.',
    body:
      'Every lead that hits Hyper Racer runs a junk filter, an enrichment pass, then scoring before anyone looks at it \u2014 dry-run by default, graded by an eval harness against the code path production actually runs. DispatchRelay answers the phone. It runs whether anyone is logged in or not.',
    chips: ['Anthropic SDK', 'Junk \u2192 enrich \u2192 score', 'Eval-harness graded', 'Per-run cost tracking', 'Voice agents \u00b7 ElevenLabs'],
    tone: 'hot',
    align: 'left',
  },
]
