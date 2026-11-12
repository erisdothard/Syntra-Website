import { DEMO_TOPICS, useDemoRequest } from '../components/demo-request/context'
import { track } from '../lib/analytics'

/** Opens the Blueprint request and records where on the page it was asked for. */
export function useBlueprint(): (place: string) => void {
  const requestDemo = useDemoRequest()
  return (place: string) => {
    track('blueprint_cta_clicked', { place })
    requestDemo(DEMO_TOPICS.blueprint)
  }
}
