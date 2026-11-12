import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { initAnalytics } from './lib/analytics'
import { captureAttribution } from './lib/attribution'
import { findPage } from './site/pages'

captureAttribution()
initAnalytics()

const root = document.getElementById('root')!
const page = findPage(window.location.pathname)

if (page) {
  // An addressed page: plain HTML written at build, with none of the launch code.
  const { SiteApp } = await import('./site/SiteApp')
  // Built pages arrive with their markup in place; under `vite dev` the root is empty.
  if (root.hasChildNodes()) hydrateRoot(root, <SiteApp page={page} />)
  else createRoot(root).render(<SiteApp page={page} />)
} else {
  const { default: App } = await import('./App')
  createRoot(root).render(<App />)
}
