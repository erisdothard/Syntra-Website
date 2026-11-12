/**
 * Every page that has its own address, apart from the home page. This file is
 * metadata only, so the home page can consult it without loading a page component,
 * and scripts/prerender.mjs can write one HTML file per entry at build.
 */

export const SITE_ORIGIN = 'https://www.syntraai.tech'

export type PageKey = 'start' | 'blueprint' | 'services' | 'work' | 'case'

export interface PageMeta {
  path: string
  key: PageKey
  /** Case-study slug, for key === 'case'. */
  slug?: string
  title: string
  description: string
}

export const pages: PageMeta[] = [
  {
    path: '/start',
    key: 'start',
    title: 'Site, CRM and AI agents built as one system | Syntra AI',
    description:
      'For businesses that have outgrown off-the-shelf tools. Syntra AI builds the site, the CRM behind it and the agents inside it. Builds from $10,000, starting with a $1,500 Blueprint.',
  },
  {
    path: '/blueprint',
    key: 'blueprint',
    title: 'Build Blueprint: a written scope and a fixed price, $1,500 | Syntra AI',
    description:
      'The Build Blueprint maps how you sell today and what the site, the CRM and the agents have to do. You get a written scope and a fixed price for the build. $1,500, credited to the build.',
  },
  {
    path: '/services',
    key: 'services',
    title: 'Sites and portals, CRMs and admin panels, AI agents | Syntra AI',
    description:
      'What Syntra AI builds: the public site and customer portals, the CRM and admin panel behind them, and AI agents that work inside the CRM. Fixed price, fully owned by you.',
  },
  {
    path: '/work',
    key: 'work',
    title: 'Shipped work: ten systems, apps and sites | Syntra AI',
    description:
      'Systems Syntra AI has built and put into production: a distributor site with configurator, CRM and lead agents; a carrier site with a customer portal; a multi-role freight dispatch platform.',
  },
  {
    path: '/work/hyper-racer',
    key: 'case',
    slug: 'hyper-racer',
    title: 'Hyper Racer USA: Wix to a site, a 19-section CRM and lead agents | Syntra AI',
    description:
      'How Syntra AI rebuilt Hyper Racer USA from Wix to Next.js: pricing configurator, inventory, dealer map, a CRM the client edits the live site from, and an agent pipeline that researches and scores every lead.',
  },
  {
    path: '/work/3-aces-trucking',
    key: 'case',
    slug: '3-aces-trucking',
    title: '3 Aces Trucking: carrier site with office, driver and broker web apps | Syntra AI',
    description:
      'Application and web development for a commercial trucking carrier: the public site plus office, driver and broker web apps, with load tracking and document uploads.',
  },
  {
    path: '/work/dispatchrelay',
    key: 'case',
    slug: 'dispatchrelay',
    title: 'DispatchRelay: a freight dispatch platform for four roles | Syntra AI',
    description:
      'DispatchRelay is Syntra AI\'s own freight dispatch platform for carriers, brokers, shippers and drivers, with load management, live GPS tracking, billing and a public demo of every role.',
  },
  {
    path: '/work/launch-control',
    key: 'case',
    slug: 'launch-control',
    title: 'Launch Control: a site, a CRM and an agent crew | Syntra AI',
    description:
      'How Syntra AI built the site, the CRM with a synced inbox, the lead finder and the supervised outreach agents for Launch Control, a business development firm.',
  },
  {
    path: '/work/safety-net',
    key: 'case',
    slug: 'safety-net',
    title: 'Safety Net Career Consulting: site, booking and client portal | Syntra AI',
    description:
      'The public site and client portal Syntra AI built for a career consulting practice: online booking, video session rooms, a career profile and a consultant view of every client.',
  },
  {
    path: '/work/cvz-tv',
    key: 'case',
    slug: 'cvz-tv',
    title: 'CVZ-TV: a portfolio you operate like a 1990s TV and VCR | Syntra AI',
    description:
      'The interactive portfolio Syntra AI built for Nashville visual designer Cole Anderson: a television set you switch on, with VHS tapes as the navigation.',
  },
  {
    path: '/work/tony-skate-club',
    key: 'case',
    slug: 'tony-skate-club',
    title: 'Tony Skate Club: a site for a Nashville skater and his club | Syntra AI',
    description:
      'The personal site Syntra AI built for Nashville skater and model Tony Woodland: his story, his skate club, a video reel and his brand work.',
  },
  {
    path: '/work/ubm-group',
    key: 'case',
    slug: 'ubm-group',
    title: 'UBM Group: marketing site for a healthcare integration consultancy | Syntra AI',
    description:
      'The marketing site and identity work Syntra AI built for UBM Group, a healthcare integration consultancy.',
  },
  {
    path: '/work/eazl',
    key: 'case',
    slug: 'eazl',
    title: 'Eazl: a juried local-art marketplace app | Syntra AI',
    description:
      'The mobile app and web version Syntra AI built for Eazl, a juried marketplace for local art that buyers swipe through city by city.',
  },
  {
    path: '/work/ken-sable',
    key: 'case',
    slug: 'ken-sable',
    title: 'Ken Sable: an artist site built as a home-video disc menu | Syntra AI',
    description:
      'The site Syntra AI built for Nashville producer and DJ Ken Sable: a disc menu for navigation, a radio player and a press kit.',
  },
]

/** Matches with or without a trailing slash. Returns undefined for the home page and unknown paths. */
export function findPage(pathname: string): PageMeta | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return pages.find((p) => p.path === clean)
}
