import { createContext, useContext } from 'react'

/** What the dialog says, and what the inbox subject line carries, for each entry point. */
export interface DemoRequestTopic {
  eyebrow: string
  title: string
  /** Becomes the email subject prefix, so it should read well in an inbox list. */
  topic: string
  lead: string
  placeholder: string
}

const REPLY_LINE = 'Eris reads every request and replies from agent@syntraai.tech.'

export const DEMO_TOPICS = {
  launch: {
    eyebrow: 'Mission control',
    title: 'Start a launch',
    topic: 'Launch request',
    lead: `Tell us what you need built and what it has to connect to. ${REPLY_LINE}`,
    placeholder: 'What the team runs on today, where the hours go, and what the new system has to do.',
  },
  project: {
    eyebrow: 'Services',
    title: 'Start a project',
    topic: 'Project request',
    lead: `Web, application or automation, describe the job and the systems it touches. ${REPLY_LINE}`,
    placeholder: 'What you want built, who uses it, and what it has to talk to.',
  },
} satisfies Record<string, DemoRequestTopic>

export function projectDemoTopic(projectTitle: string): DemoRequestTopic {
  return {
    eyebrow: `Demo · ${projectTitle}`,
    title: 'Request a demo',
    topic: `${projectTitle} demo request`,
    lead: `Say what you want to see in ${projectTitle} and we will set up a live walkthrough. ${REPLY_LINE}`,
    placeholder: 'Your business, and which part of the build you want to see working.',
  }
}

export const DemoRequestContext = createContext<((topic: DemoRequestTopic) => void) | null>(null)

/** Opens the request dialog. Every "request a demo / start a project" button goes through this. */
export function useDemoRequest(): (topic: DemoRequestTopic) => void {
  const open = useContext(DemoRequestContext)
  if (!open) throw new Error('useDemoRequest must be used inside <DemoRequestProvider>')
  return open
}
