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
      'FreightX: four user roles, 20+ build phases, live GPS on the map, Stripe billing, carrier verification, real-time bidding. React 19, TypeScript, Supabase, Postgres. One codebase, in production \u2014 not five vendors stitched together.',
    chips: ['React 19 · TypeScript', 'Supabase · Postgres', 'Stripe billing', 'Live GPS fleet tracking', 'FastAPI · Node'],
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Liftoff · Final thrust',
    title: 'Agents that work the records',
    headline: 'Not a chatbot in the corner.',
    body:
      'Our extraction pipeline drives county sites with Playwright and pulls every field through Claude tool use, each with a confidence score \u2014 then routes it to auto-approve, human review, or reject. DispatchRelay answers the phone. It runs whether anyone is logged in or not.',
    chips: ['Claude tool use', 'Per-field confidence scoring', 'Voice agents · ElevenLabs', 'MCP servers', 'Human-review lanes'],
    tone: 'hot',
    align: 'left',
  },
]
