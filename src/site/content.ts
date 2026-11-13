import type { Offer } from '../data/portfolio'
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

export const founder = {
  title: 'Who builds it',
  lead: 'Syntra is Eris Dothard, in Nashville. He scopes the work, builds it and hands it over, so the person you write to is the person writing the code.',
  points: [
    { title: 'Regulated banking', text: 'Production integrations for 50+ bank clients at CPI Card Group, shipped under formal change control.' },
    { title: 'Enterprise AI', text: 'AI agents and data pipelines inside enterprise finance workflows at Caterpillar Financial.' },
    { title: 'Trained on the tools', text: 'Anthropic courses completed in the Claude API, Claude Code and the Model Context Protocol.' },
    { title: 'Reach him by email', text: 'erisdothard@syntraai.tech. Every request is read and answered by Eris.' },
  ] satisfies Point[],
}

export const government = {
  eyebrow: 'For public agencies',
  headline: 'Websites, applications and internal systems for public offices. Fixed price, in writing, and owned by the agency.',
  lead: 'Syntra AI is a Nashville software consultancy. One senior developer scopes the work, builds it and hands it over, with the code, the database and the accounts in the agency\'s name.',
  buildTitle: 'What we build for an office',
  build: [
    { title: 'Public websites', text: 'Department and program sites that staff update themselves, checked against WCAG 2.1 A and AA rules before handover.' },
    { title: 'Portals and online services', text: 'Forms, applications, logins and status tracking for residents, vendors or staff.' },
    { title: 'Internal tools and case tracking', text: 'Admin panels and CRMs that replace spreadsheets and shared inboxes, with a log of every change.' },
    { title: 'AI assistance with a person in charge', text: 'Agents that research, sort and draft. Every action is logged with its cost, and a staff member approves what matters.' },
    { title: 'Integrations', text: 'Connections to the systems already in place: payments, email, calendars and data exchange standards.' },
    { title: 'Mobile apps', text: 'Phone apps for iOS and Android from one codebase, with a web version.' },
  ] satisfies Point[],
  buyTitle: 'How an office buys',
  buy: [
    { title: 'A written, fixed-price quote', text: 'Send the need. You get a written scope and one fixed price for it, ready for the file.' },
    { title: 'Published prices', text: 'A scoping Blueprint is $1,500 and is credited to the build. Builds start at $10,000. The figures are on this page.' },
    { title: 'Everything in writing', text: 'Scope, changes, handover and support are documented, so there is a record of every decision.' },
    { title: 'The agency owns it', text: 'Source code, database and accounts are the agency\'s from the start. Any developer can take it over.' },
  ] satisfies Point[],
  experienceTitle: 'Experience behind the work',
  experience: [
    { title: 'Regulated banking', text: 'Production integrations for 50+ bank clients at CPI Card Group, shipped under formal change control.' },
    { title: 'Ten systems in production', text: 'Sites, platforms, CRMs and apps for private clients. Each one is listed below with its write-up.' },
  ] satisfies Point[],
  workTitle: 'Past work, live and linked',
  enterpriseTitle: 'Enterprise finance systems',
  enterprise: [
    { title: 'Inventory application', text: 'A web application that captures equipment inventory and exchanges data with Salesforce and a Snowflake data warehouse.' },
    { title: 'AI agents for finance operations', text: 'Agents that take over processes staff ran by hand, lien processing among them.' },
    { title: 'Collateral and residual calculators', text: 'Web applications that run the calculations behind collateral and residual factors.' },
    { title: 'Predictive valuations', text: 'Valuation models with Power BI charts, so the numbers behind a decision are in front of the person making it.' },
    { title: 'Risk management', text: 'Applications that find inventory the business has lost track of.' },
    { title: 'Applications on enterprise data', text: 'Enterprise data turned into web applications that show a business unit its own numbers in detail.' },
  ] satisfies Point[],
  enterpriseNote: 'Eris Dothard built these as an AI engineer on staff at Caterpillar Financial. They are internal systems and cannot be shown, linked or demonstrated. Caterpillar is not a Syntra client. They are listed to show the kind of system an office can ask for.',
  offers: [
    {
      name: 'Scoping Blueprint',
      price: '$1,500',
      note: 'Credited to the build',
      desc: 'We document how the office works today, what the system has to do, who uses it and what it connects to. The office receives a written scope and a fixed price. The $1,500 comes off that price if the build goes ahead.',
    },
    {
      name: 'The build',
      price: 'From $10,000',
      note: 'Full system $20,000 to $30,000',
      desc: 'A website, a portal, an internal tool, or all of them as one system. Fixed price, set in the written scope. The code, the database and the accounts belong to the agency.',
    },
    {
      name: 'Care plan',
      price: 'From $500/mo',
      note: 'Optional, after handover',
      desc: 'Changes, new features and monitoring from the developer who built it. With or without it, the system stays the agency\'s.',
    },
  ] satisfies Offer[],
  safeguardsTitle: 'Accessibility, access and records',
  safeguards: [
    { title: 'Accessibility checks', text: 'Pages are tested with axe-core against WCAG 2.1 A and AA rules. Automated checks cover part of the standard; a manual review is scoped where a project requires it.' },
    { title: 'Access enforced in the database', text: 'Each user sees only their own records, enforced at the database and covered by an isolation test suite. Built this way for a client portal already in production.' },
    { title: 'A record of every change', text: 'Activity logs on admin actions, so an office can answer who changed what.' },
    { title: 'AI under supervision', text: 'Agents run in observation before they act, are graded against a fixed set of cases, and can be halted at once.' },
  ] satisfies Point[],
  classificationTitle: 'For the file',
  classification: [
    { title: 'Business', text: 'Syntra AI, Nashville, Tennessee. Sole proprietor: Eris Dothard.' },
    { title: 'Metro Nashville supplier', text: 'Registered in Metro iSupplier. Supplier number 900002717.' },
    { title: 'NAICS', text: '541511 Custom Computer Programming Services · 541512 Computer Systems Design Services.' },
    { title: 'UNSPSC', text: '81112103 Website design · 81111504 Application programming · 81111500 Software engineering · 80101507 IT consultation.' },
    { title: 'Contact', text: 'Eris Dothard · (615) 450-0233 · erisdothard@syntraai.tech' },
  ] satisfies Point[],
  phone: { display: '(615) 450-0233', href: 'tel:+16154500233' },
  closing: 'Send the need in a few lines. You get a written scope and a fixed price.',
}

export const blueprint = {
  eyebrow: 'The first step',
  headline: 'The Build Blueprint.',
  looksAtTitle: 'What we look at',
  looksAt: [
    { title: 'How inquiries arrive', text: 'Forms, phone, email, referrals, events. Where each one goes and who picks it up.' },
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
    kind: 'Commercial carrier · site and web apps',
    headline: 'A carrier site, and the web apps the office, the drivers and the brokers work in.',
    job: '3 Aces Trucking Inc. is a commercial trucking carrier. Syntra built the public site and the web apps behind it.',
    built: [
      { title: 'The public site', text: 'The carrier\'s front door, with a way for customers to get in touch.' },
      { title: 'Office web app', text: 'Where the office creates and manages loads.' },
      { title: 'Driver web app', text: 'Each driver sees their own loads and uploads paperwork from the road.' },
      { title: 'Broker portal', text: 'Brokers follow the loads they have with the carrier.' },
      { title: 'Documents on every load', text: 'Bill of lading, rate confirmation and proof of delivery are uploaded against the load they belong to.' },
      { title: 'Analytics and calendar', text: 'An analytics view of the operation, and loads synced to Google Calendar.' },
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
  {
    slug: 'launch-control',
    project: 'Launch Control',
    kind: 'Business development firm · site, CRM and agents',
    headline: 'A site, a CRM and an agent crew for a business development firm.',
    job: 'Launch Control builds and operates business development systems for other businesses. Syntra built its site, its CRM and the agents that work its pipeline.',
    built: [
      { title: 'The site', text: 'A marketing site with a 3D scroll-through and a booking form.' },
      { title: 'The CRM', text: 'Leads, deals, customers, drafts, campaigns, calendar and tasks in one place, with a guided demo version for prospects.' },
      { title: 'A synced inbox', text: 'Outlook and Gmail mailboxes synced into the CRM, so every conversation sits beside its lead.' },
      { title: 'A lead finder', text: 'Finds prospects, reads their sites and scores each one with Claude against a fixed set of factors.' },
      { title: 'Agents with an ops board', text: 'Agents research prospects and draft outreach, and an operations board shows what each one did.' },
    ],
    mechanismTitle: 'How the agents are kept in check',
    mechanism: [
      'Every campaign an agent writes is a draft. A person schedules it or it does not go.',
      'Each email has to open on one fact observed on the prospect\'s own site; a draft that cannot is rewritten once, then dropped.',
      'Sends are capped per campaign and per mailbox, and a halt switch stops everything and fails closed.',
    ],
    ownedBy: 'Launch Control runs it on its own accounts.',
  },
  {
    slug: 'safety-net',
    project: 'Safety Net Career Consulting',
    kind: 'Career consulting practice · site, booking and client portal',
    headline: 'A consulting practice with online booking, video sessions and a portal for every client.',
    job: 'Safety Net Career Consulting is a career consulting practice. Syntra built its public site and the portal its consultants and clients work in.',
    built: [
      { title: 'Booking', text: 'A client picks a session from the public site.' },
      { title: 'Video session rooms', text: 'Consultant and client meet inside the portal, with no outside meeting link.' },
      { title: 'A career profile', text: 'Each client has a profile in their portal that carries from one session to the next.' },
      { title: 'The consultant view', text: 'Consultants see each of their clients, their sessions and the messages sent through the site.' },
      { title: 'Client isolation', text: 'Each client sees only their own records. The rule is enforced in the database and covered by a test suite.' },
    ],
    ownedBy: 'Safety Net holds the system.',
  },
  {
    slug: 'cvz-tv',
    project: 'CVZ-TV',
    kind: 'Visual designer · interactive portfolio',
    headline: 'A portfolio you operate like a 1990s TV and VCR.',
    job: 'Cole Anderson is a Nashville visual designer, screen printer and DJ. His portfolio moved off Wix and into a television set you switch on.',
    built: [
      { title: 'Power on', text: 'Press the power button and the set warms up before the picture arrives.' },
      { title: 'Four tapes', text: 'VHS tapes on the shelf are the navigation. Load one and it plays that body of work.' },
      { title: 'An index', text: 'A drop-down index of every tape for visitors who want the direct route.' },
      { title: 'Sound', text: 'A volume control and static, tied to what the set is doing.' },
      { title: 'The archive', text: '47 pieces moved over from the Wix site.' },
    ],
    ownedBy: 'Cole Anderson holds the site.',
  },
  {
    slug: 'tony-skate-club',
    project: 'Tony Skate Club',
    kind: 'Skater and model · personal site',
    headline: 'A site for a Nashville skater, his reel and his skate club.',
    job: 'Tony Woodland is a Nashville skater and model who runs group skates. Syntra built the site that holds his story, his club and his work.',
    built: [
      { title: 'Tony', text: 'Who he is and how he skates.' },
      { title: 'The club', text: 'The group skates and how to join one.' },
      { title: 'Edits', text: 'A video reel of his skating.' },
      { title: 'Brand work', text: 'The modelling and brand work, with a way to book him.' },
    ],
    ownedBy: 'Tony Woodland holds the site.',
  },
  {
    slug: 'ubm-group',
    project: 'UBM Group',
    kind: 'Healthcare integration consultancy · marketing site',
    headline: 'A marketing site for a healthcare integration consultancy.',
    job: 'UBM Group is a consultancy that connects healthcare systems. Syntra built its marketing site and the identity work behind it.',
    built: [
      { title: 'The site', text: 'Services, process, about and case-study sections, ending in a consultation request.' },
      { title: 'Navigation', text: 'A header that steps out of the way as the visitor reads and returns when they scroll back.' },
      { title: 'Identity', text: 'Logo concepts developed alongside the site.' },
    ],
    ownedBy: 'UBM Group holds the site.',
  },
  {
    slug: 'eazl',
    project: 'Eazl',
    kind: 'Partner product · art marketplace app',
    headline: 'A juried marketplace for local art, built as an app you swipe through.',
    job: 'Eazl is a marketplace for local art, built with a partner. Syntra built the app and its web version.',
    built: [
      { title: 'City by city', text: 'A buyer picks a city and sees the work being made there.' },
      { title: 'A feed you swipe', text: 'Artwork arrives one piece at a time, ranked for the buyer.' },
      { title: 'Artwork and artist pages', text: 'Every piece opens to its details and to the artist behind it.' },
      { title: 'One codebase, phone and web', text: 'A mobile app in React Native, with the same app running in the browser.' },
    ],
    ownedBy: 'Eazl is a partner product.',
  },
  {
    slug: 'ken-sable',
    project: 'Ken Sable',
    kind: 'Producer and DJ · artist site',
    headline: 'An artist site you navigate like a home-video disc menu.',
    job: 'Ken Sable is a Nashville producer and DJ. Syntra built his site as the menu of a disc you would put in a player.',
    built: [
      { title: 'The disc menu', text: 'Play, Scene Selection, Special Features and Credits are the navigation.' },
      { title: 'A radio player', text: 'His music plays from the site.' },
      { title: 'A press kit', text: 'What a booker or a writer needs, in one place.' },
    ],
    ownedBy: 'Ken Sable holds the site.',
  },
]

export function findCaseStudy(slug: string | undefined): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug)
}
