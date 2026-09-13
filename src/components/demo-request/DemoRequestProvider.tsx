import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { DemoRequestContext } from './context'
import type { DemoRequestTopic } from './context'
import { DemoRequestDialog } from './DemoRequestDialog'

/** Owns the one request dialog; mounted fresh on each open so no half-filled state leaks between topics. */
export function DemoRequestProvider({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState<DemoRequestTopic | null>(null)
  const open = useCallback((next: DemoRequestTopic) => setTopic(next), [])
  const close = useCallback(() => setTopic(null), [])

  return (
    <DemoRequestContext.Provider value={open}>
      {children}
      {topic && <DemoRequestDialog topic={topic} onClose={close} />}
    </DemoRequestContext.Provider>
  )
}
