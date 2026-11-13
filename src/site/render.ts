import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { offers } from '../data/portfolio'
import { SITE_ORIGIN, pages } from './pages'
import type { PageMeta } from './pages'
import { SiteApp } from './SiteApp'

/** Build-time only: loaded by scripts/prerender.mjs through Vite, never by the browser. */

export interface RenderedPage {
  path: string
  title: string
  description: string
  url: string
  html: string
  jsonLd: object[]
}

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE_ORIGIN}/#organization`,
  name: 'Syntra AI',
  url: `${SITE_ORIGIN}/`,
  email: 'erisdothard@syntraai.tech',
  description:
    'Syntra AI builds the site customers see, the CRM the team works in and the AI agents inside it, as one system the client owns.',
  address: { '@type': 'PostalAddress', addressLocality: 'Nashville', addressRegion: 'TN', addressCountry: 'US' },
  areaServed: 'US',
}

/** "$1,500" -> "1500". Only used for offers whose price is a single figure. */
function plainAmount(price: string): string | null {
  const match = /^\$([\d,]+)$/.exec(price.trim())
  return match ? match[1].replace(/,/g, '') : null
}

function jsonLdFor(page: PageMeta): object[] {
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: `${SITE_ORIGIN}${page.path}`,
    isPartOf: { '@id': `${SITE_ORIGIN}/#organization` },
  }
  if (page.key !== 'blueprint') return [ORGANIZATION, webPage]
  const amount = plainAmount(offers[0].price)
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: offers[0].name,
    description: offers[0].desc,
    provider: { '@id': `${SITE_ORIGIN}/#organization` },
    ...(amount ? { offers: { '@type': 'Offer', price: amount, priceCurrency: 'USD' } } : {}),
  }
  return [ORGANIZATION, webPage, service]
}

export function renderAll(): RenderedPage[] {
  return pages.map((page) => ({
    path: page.path,
    title: page.title,
    description: page.description,
    url: `${SITE_ORIGIN}${page.path}`,
    html: renderToString(createElement(SiteApp, { page })),
    jsonLd: jsonLdFor(page),
  }))
}

export { SITE_ORIGIN }
