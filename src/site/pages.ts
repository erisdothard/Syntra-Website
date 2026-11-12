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
      'For dealers, distributors and any business that sells through inquiries and quotes. Syntra AI builds the site, the CRM behind it and the agents inside it. Builds from $10,000, starting with a $1,500 Blueprint.',
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
    title: 'Shipped work: Hyper Racer USA, 3 Aces Trucking, DispatchRelay | Syntra AI',
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
    title: '3 Aces Trucking: carrier site, customer portal and voice AI | Syntra AI',
    description:
      'Application and web development for a commercial trucking carrier: client-facing site with a customer portal, voice AI, and automated load and document handling.',
  },
  {
    path: '/work/dispatchrelay',
    key: 'case',
    slug: 'dispatchrelay',
    title: 'DispatchRelay: a freight dispatch platform for four roles | Syntra AI',
    description:
      'DispatchRelay is Syntra AI\'s own freight dispatch platform for carriers, brokers, shippers and drivers, with load management, live GPS tracking, billing and a public demo of every role.',
  },
]

/** Matches with or without a trailing slash. Returns undefined for the home page and unknown paths. */
export function findPage(pathname: string): PageMeta | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return pages.find((p) => p.path === clean)
}
