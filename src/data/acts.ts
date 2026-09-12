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
    title: 'The software isn’t there',
    headline: 'Your business is ahead of your systems.',
    body:
      'A site that doesn’t sell what you actually do. Tools that don’t talk to each other. Work your team does by hand because nothing was ever built to do it for them. Pressure builds in the chamber and nothing moves.',
    chips: ['Aging websites', 'Disconnected tools', 'No internal platform', 'Work done by hand', 'Nothing that scales'],
    tone: 'ember',
    align: 'left',
  },
  {
    n: 2,
    label: 'T-zero · Core ignition & shockwaves',
    title: 'Built end to end',
    headline: 'We design it, build it, and ship it.',
    body:
      'Syntra builds the site, the application, the backend, and the database as one system — React and TypeScript front ends, Python and Node services, Postgres underneath. Scoped, built, and deployed by the same people.',
    chips: ['Web development', 'Application development', 'Frontend & backend', 'APIs & databases', 'Design to deploy'],
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Liftoff · Final thrust',
    title: 'AI that runs it',
    headline: 'Then we make it run without you.',
    body:
      'AI agents wired into the systems your team already uses. CRMs that act on their own records, voice agents that answer the phone, workflows that run overnight and hand you the result. Full thrust, no friction.',
    chips: ['AI agents', 'Agentic CRMs', 'Workflow automation', 'Voice AI', 'Claude API & MCP'],
    tone: 'hot',
    align: 'left',
  },
]
