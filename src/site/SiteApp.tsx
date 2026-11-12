import { DemoRequestProvider } from '../components/demo-request/DemoRequestProvider'
import { findCaseStudy } from './content'
import type { PageMeta } from './pages'
import { SiteLayout } from './SiteLayout'
import { Blueprint } from './pages/Blueprint'
import { Services } from './pages/Services'
import { Start } from './pages/Start'
import { CaseStudy, Work } from './pages/Work'

function PageBody({ page }: { page: PageMeta }) {
  switch (page.key) {
    case 'start':
      return <Start />
    case 'blueprint':
      return <Blueprint />
    case 'services':
      return <Services />
    case 'work':
      return <Work />
    case 'case': {
      const study = findCaseStudy(page.slug)
      if (!study) throw new Error(`No case study for slug "${page.slug}"`)
      return <CaseStudy study={study} />
    }
  }
}

/** Root of every addressed page. Rendered to HTML at build and hydrated in the browser. */
export function SiteApp({ page }: { page: PageMeta }) {
  return (
    <DemoRequestProvider>
      <SiteLayout path={page.path}>
        <PageBody page={page} />
      </SiteLayout>
    </DemoRequestProvider>
  )
}
