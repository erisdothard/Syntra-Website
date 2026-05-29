/* ── Centralized content data ── */

export interface Project {
  title: string
  tag: string
  stack: string
  featured: boolean
  description: string
  github?: string
}

export interface Experience {
  role: string
  org: string
  date: string
  bullets?: string[]
}

export interface Service {
  title: string
  desc: string
}

export interface SkillGroup {
  category: string
  items: string[]
}

/* ── Projects ── */

export const projects: Project[] = [
  {
    title: 'FreightX',
    tag: 'AI Freight Marketplace',
    stack: 'React · Python · Supabase',
    featured: true,
    description:
      'Multi-role SaaS freight platform with AI-powered carrier matching, automated document processing, and real-time shipment tracking. Built for a logistics client to modernize their dispatch and operations workflow.',
  },
  {
    title: 'BridgeLink',
    tag: 'HL7/FHIR Interop',
    stack: 'Mirth Connect · PostgreSQL · JavaScript',
    featured: true,
    description:
      'End-to-end healthcare integration system processing HL7 v2.5 messages (ORU, ADT) with FHIR R4 API exposure. Multi-channel routing, mid-flight data enrichment, cross-channel lookups, and LOINC-coded observations.',
    github: 'https://github.com/erisdothard/healthcare-integration-portfolio',
  },
  {
    title: 'PropLogix Pipeline',
    tag: 'AI Data Extraction',
    stack: 'Python · FastAPI · Claude API · Playwright',
    featured: false,
    description:
      'Agentic property data extraction pipeline — Playwright scrapes county sites, Claude extracts structured data with per-field confidence scoring, Pydantic validates, and a router sends uncertain results to human review. Three entry points: FastAPI, MCP server, Streamlit dashboard.',
    github: 'https://github.com/erisdothard/property-data-extraction-pipeline',
  },
]

/* ── Experience ── */

export const experience: Experience[] = [
  {
    role: 'Founder',
    org: 'Syntra AI',
    date: '2025 –',
    bullets: [
      'AI consulting — workflow automation, agent systems, and custom software for SMB clients',
      'Voice AI outreach tooling and lead generation pipelines',
      'Full-stack delivery: React, FastAPI, Claude API, LangGraph, Supabase',
    ],
  },
  {
    role: 'Integration Engineer',
    org: 'CPI Card Group',
    date: '2021 – 26',
    bullets: [
      'CJIS-certified environment — government-level security clearance for financial systems',
      'OAuth 2.0 implementation for enterprise banking authentication flows',
      'Data mapping pipelines across XML, CSV, and JSON formats for card issuance systems',
      'ETL and SFTP integrations connecting banking partners to internal processing',
      'Client onboarding implementations translating business requirements into technical specs',
    ],
  },
  {
    role: 'Technical Support',
    org: 'Google Fiber',
    date: '2019 – 21',
  },
]

/* ── Services ── */

export const services: Service[] = [
  { title: 'AI Workflow Automation', desc: 'Agents and pipelines that replace manual ops end-to-end.' },
  { title: 'Custom Software', desc: 'AI-embedded apps and tools built to your exact workflow.' },
  { title: 'Ongoing Retainer', desc: 'Maintenance, monitoring, and iteration on shipped systems.' },
]

/* ── Skills (for resume view) ── */

export const skills: SkillGroup[] = [
  { category: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Three.js', 'GSAP'] },
  { category: 'Backend', items: ['Python', 'FastAPI', 'Node.js', 'Express', 'PostgreSQL'] },
  { category: 'AI / ML', items: ['Claude API', 'LangChain', 'LangGraph', 'Anthropic SDK', 'MCP'] },
  { category: 'Infrastructure', items: ['Docker', 'Supabase', 'GitHub Actions', 'SFTP', 'OAuth 2.0'] },
  { category: 'Data', items: ['HL7 / FHIR', 'XML', 'CSV', 'JSON', 'ETL Pipelines'] },
]
