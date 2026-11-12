/**
 * Copy for the addressed pages. Prices and service descriptions are NOT here:
 * they come from src/data/portfolio.ts so a number is never typed twice.
 * Every factual line about a build is taken from that build; nothing is estimated.
 */

export interface Point {
  title: string
  text: string
}

export const start = {
  eyebrow: 'Syntra AI · Nashville, TN',
  headline: 'Your site, your CRM and the agents inside it. One system, built around how you sell.',
  lead: 'Every inquiry lands in the CRM as a lead. Quotes come from your real prices and stock. An agent researches and scores each lead and drafts the reply for your team to send. Built for you, handed over, and yours outright.',
  problemsTitle: 'What usually breaks first',
  problems: [
    {
      title: 'Inquiries live in an inbox.',
      text: 'A form sends an email. Nobody can see which leads were answered, which went quiet, or what each one is worth.',
    },
    {
      title: 'Quotes live in a spreadsheet.',
      text: 'Prices, options and availability sit in a file the site cannot read, so the site cannot quote and the team retypes everything.',
    },
    {
      title: 'Nobody on staff can change the site.',
      text: 'Inventory, prices and news go stale because every edit waits on whoever built it.',
    },
  ] satisfies Point[],
  proofTitle: 'Built and running',
  closing: 'Tell us how you sell today. You get a written scope and a fixed price before you commit to anything larger.',
}

export const blueprint = {
  eyebrow: 'The first step',
  headline: 'The Build Blueprint.',
  looksAtTitle: 'What we look at',
  looksAt: [
    { title: 'How inquiries arrive', text: 'Forms, phone, email, trade shows, dealers. Where each one goes and who picks it up.' },
    { title: 'How a quote gets made', text: 'Where prices, options and stock live, and who can change them.' },
    { title: 'What the team runs on', text: 'The site platform, the spreadsheets, and the accounting, payment and email tools already in place.' },
    { title: 'What staff need to edit', text: 'The pages, listings and prices your own people should be able to change without a developer.' },
    { title: 'Where an agent can take work', text: 'Lead research and scoring, reply drafts, document reading, routine customer questions.' },
  ] satisfies Point[],
  receiveTitle: 'What you receive',
  receive: [
    { title: 'A written scope', text: 'The pages, the CRM sections, the agents and the integrations, described so anyone can check them off.' },
    { title: 'A fixed price for the build', text: 'One number for the scope as written. The $1,500 comes off it if you go ahead.' },
    { title: 'The list of accounts you will hold', text: 'Domain, hosting, database and AI provider, all in your name from the start.' },
    { title: 'The scope to keep', text: 'It is yours whether or not Syntra builds it.' },
  ] satisfies Point[],
  closing: 'Send a few lines about your business and how you sell. Eris replies with next steps.',
}

export const servicesPage = {
  eyebrow: 'What we build',
  headline: 'The site, the CRM behind it and the agents inside it.',
  lead: 'Three parts of one system. Take one, or take all three built to work together.',
  ownershipTitle: 'You own all of it',
  ownership: [
    { title: 'The code', text: 'In a repository you hold, readable by any developer you hire after us.' },
    { title: 'The database', text: 'Your customers, leads and orders, in your own account.' },
    { title: 'The accounts', text: 'Domain, hosting and AI provider are in your name. The system keeps running if we never speak again.' },
  ] satisfies Point[],
  howTitle: 'How a build runs',
  how: [
    { title: 'Blueprint', text: 'A written scope and a fixed price.' },
    { title: 'Build', text: 'Built against the scope, with a working version you can click through as it grows.' },
    { title: 'Handover', text: 'Live on your domain, in your accounts, with your team shown how to run it.' },
    { title: 'Care plan', text: 'Optional. Changes, new features and agent tuning from the people who built it.' },
  ] satisfies Point[],
}

export const workPage = {
  eyebrow: 'Shipped work',
  headline: 'Systems in production, with the link to prove it.',
  lead: 'Each of these is live. Open the site, then read how it was built.',
}

export interface CaseStudy {
  slug: string
  /** Must equal the `title` of the matching entry in data/portfolio.ts. */
  project: string
  kind: string
  headline: string
  job: string
  built: Point[]
  mechanismTitle?: string
  mechanism?: string[]
  ownedBy: string
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'hyper-racer',
    project: 'Hyper Racer USA',
    kind: 'Distributor · site, CRM and lead agents',
    headline: 'From a Wix site to a system the distributor runs the business from.',
    job: 'Hyper Racer USA is the US distributor of the X1 ground-effects race car. The site ran on Wix. Syntra rebuilt the whole thing on Next.js 16, and it is live in production.',
    built: [
      {
        title: 'The public site',
        text: 'A pricing configurator, live inventory, a Mapbox map of the dealer network, gallery, news and events.',
      },
      {
        title: 'The CRM behind it',
        text: 'A 19-section admin panel. The client edits their own live site content there, works a leads, customers and deals pipeline, and every change is written to an activity log.',
      },
      {
        title: 'Agents on every lead',
        text: 'Each inbound lead runs through an agent pipeline built on the Anthropic SDK that enriches it and scores it, so the team sees who to call first.',
      },
      {
        title: 'Trade-show capture',
        text: 'A kiosk mode that takes leads with no connection and syncs them when it is back online.',
      },
    ],
    mechanismTitle: 'How the agents are kept honest',
    mechanism: [
      'They run dry by default: a new behaviour is observed before it is allowed to act.',
      'An eval harness grades them against a fixed set of cases, on the same code path production runs.',
      'Tokens, cost and latency are itemised for every call, so the client can read what the agents did and what it cost.',
    ],
    ownedBy: 'Hyper Racer USA holds the code, the database and the accounts.',
  },
  {
    slug: '3-aces-trucking',
    project: '3 Aces Trucking Inc.',
    kind: 'Commercial carrier · site, portal and automation',
    headline: 'A carrier site with a customer portal, voice AI and automated paperwork.',
    job: '3 Aces Trucking Inc. is a commercial trucking carrier. Syntra did the full application and web development, end to end.',
    built: [
      { title: 'The client-facing site', text: 'The public face of the carrier, with a customer portal behind a login.' },
      { title: 'Voice AI', text: 'A voice agent integrated into the carrier\'s operation.' },
      { title: 'Load and document automation', text: 'Loads and the documents that travel with them are handled by the system.' },
    ],
    ownedBy: '3 Aces Trucking holds the system.',
  },
  {
    slug: 'dispatchrelay',
    project: 'DispatchRelay',
    kind: 'Our own product · freight dispatch platform',
    headline: 'A freight dispatch platform for carriers, brokers, shippers and drivers.',
    job: 'DispatchRelay is Syntra\'s own product, built the way we build for clients: across 20+ development phases, and live at dispatchrelay.co.',
    built: [
      { title: 'Four roles, one platform', text: 'Carriers, brokers, shippers and drivers each get their own workspace on the same data.' },
      { title: 'Load management', text: 'Autonomous load management with real-time bidding and carrier verification.' },
      { title: 'On the road', text: 'Live GPS fleet tracking and in-platform messaging.' },
      { title: 'Getting paid', text: 'Billing automation built in.' },
      { title: 'A public demo of every role', text: 'A prospect can work a load end to end before signing anything.' },
    ],
    ownedBy: 'Built, owned and operated by Syntra AI.',
  },
]

export function findCaseStudy(slug: string | undefined): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug)
}
