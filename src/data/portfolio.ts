/* ── Centralized content data ── */

export interface Project {
  title: string
  tag: string
  stack: string
  featured: boolean
  description: string
  github?: string
}

export interface ExperienceSection {
  label: string
  bullets: string[]
}

export interface Experience {
  role: string
  org: string
  date: string
  bullets?: string[]
  sections?: ExperienceSection[]
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
    tag: 'Full-Stack Freight Marketplace',
    stack: 'React 19 · TypeScript · Vite · Supabase · Stripe · Anthropic Claude · Upstash Redis',
    featured: true,
    description:
      'Multi-role logistics marketplace connecting carriers, brokers, shippers, and drivers — built across 20+ development phases. Features autonomous load management, live GPS fleet tracking, billing automation, carrier verification, real-time bidding, and in-platform messaging.',
  },
  {
    title: '3 Aces Trucking Inc.',
    tag: 'Commercial Carrier Platform',
    stack: 'React · TypeScript · Supabase · ElevenLabs · Python',
    featured: true,
    description:
      'Full application and web development for a commercial trucking carrier. Voice AI integration, autonomous load and document automation, and client-facing site built end-to-end.',
  },
  {
    title: 'BridgeLink Core',
    tag: 'Healthcare Data Interoperability',
    stack: 'Mirth Connect · PostgreSQL · HL7 v2.5 · FHIR R4',
    featured: true,
    description:
      'Production-style HL7 and FHIR R4 data integration engine. Orchestrates four automated pipeline channels covering high-volume ORU lab routing, clinical ADT transaction processing, and secure healthcare API infrastructure.',
    github: 'https://github.com/erisdothard/healthcare-integration-portfolio',
  },
  {
    title: 'DispatchRelay',
    tag: 'Autonomous Voice Infrastructure',
    stack: 'ElevenLabs · Python · TypeScript',
    featured: true,
    description:
      'Voice-AI engine for small-tier trucking fleets. Automated dispatch handling with background workflow automation and natural-language voice agents.',
  },
]

/* ── Experience ── */

export const experience: Experience[] = [
  {
    role: 'Founder',
    org: 'Syntra AI',
    date: '2025 –',
    sections: [
      {
        label: 'Capabilities & Execution',
        bullets: [
          'Autonomous infrastructure company — engineering custom integration logic and agentic workflows that replace manual enterprise overhead entirely',
          'Cross-stack interoperability specialist — resilient data pipelines connecting legacy backbones to autonomous AI engines',
          'Full-lifecycle API and MCP orchestration with third-party pipeline implementation from scoping through production handoff',
          'Production-grade integration logic engineered for resilience, scale, and zero-downtime deployment',
          'Custom Agentic OS pipelines, deep-tier data syncing, and automated workflow scripting',
        ],
      },
      {
        label: 'Shipped Infrastructure',
        bullets: [
          'FreightX — multi-role logistics marketplace built across 20+ phases with autonomous load management, live GPS tracking, billing automation, and carrier verification',
          'BridgeLink Core — HL7/FHIR R4 data integration engine orchestrating four automated channels: ORU lab routing, ADT processing, secure healthcare API infrastructure',
          'DispatchRelay — voice-AI engine for small-tier trucking fleets with automated dispatch handling and background workflow automation',
          '3 Aces Trucking Inc. — full application and web development for a commercial trucking carrier; voice AI integration, autonomous load and document automation, and client-facing site',
        ],
      },
    ],
  },
  {
    role: 'Integration and Production Support Engineer',
    org: 'CPI Card Group',
    date: '2021 – 2026',
    sections: [
      {
        label: 'Core Development: SQL, XML & Python',
        bullets: [
          'CJIS-certified — government security clearance for financial systems',
          'Wrote and maintained SQL, XML, HTML, and Python in a regulated production environment with formal change control',
          'Ran SQL across 50+ bank client databases — investigation, validation, profiling, and large-volume data extracts with QA gates before every push',
          'Built reusable Python and SQL automation adopted into CPI\'s central library and used across the integration team',
          'Managed 30+ concurrent bank implementation tickets; presented changes in dev review meetings and coordinated production pushes with DevOps',
        ],
      },
      {
        label: 'File Format Design & Source-to-Target Mapping',
        bullets: [
          'Designed XML and flat-file formats for 50+ bank clients — field-level gap analysis, custom mapping logic, and source-to-target mapping from requirements through production deployment',
          'Built parse-and-transform pipelines and configured SFTP integrations per client, working directly with client IT to resolve technical decisions',
        ],
      },
      {
        label: 'Client Onboarding & Production Recovery',
        bullets: [
          'Onboarded enterprise financial institution clients end-to-end across 50+ bank implementations — from programming-implementation setup through live production',
          'Owned SLA-driven production recovery — diagnostic SQL to isolate failures, grouped by error type, reprocessed up to 10,000+ files per incident',
          'Provided product-tech support across the full card-issuance pipeline including remote troubleshooting at application, OS, and network layers',
        ],
      },
    ],
  },
  {
    role: 'Technical Support',
    org: 'Google Fiber',
    date: '2019 – 2021',
  },
]

/* ── Services ── */

export const services: Service[] = [
  {
    title: 'Integration',
    desc: 'Cross-stack API orchestration and robust data pipelines built for zero operational friction. We lead complex integration projects from initial data discovery straight through production go-live, ensuring flawless interoperability between your core databases and third-party networks.',
  },
  {
    title: 'Automation',
    desc: 'Custom, resilient business logic engineered for your stack. We eliminate structural overhead by constructing secure background automation, multi-point workflows, intelligent AI routing, and specialized voice-AI communication agents.',
  },
  {
    title: 'Applications',
    desc: 'High-performance web and mobile applications built to serve as the interface for your automation suite. Backed by proven experience building commercial-grade platforms like FreightX — integrating live telemetry, automated billing, and compliance verification layers.',
  },
]

/* ── Certifications ── */

export interface Certification {
  name: string
  issuer: string
  date: string
}

export const certifications: Certification[] = [
  { name: 'Claude Code in Action', issuer: 'Anthropic', date: '' },
  { name: 'Model Context Protocol: Advanced Topics', issuer: 'Anthropic', date: '' },
  { name: 'Introduction to Model Context Protocol', issuer: 'Anthropic', date: '' },
  { name: 'Claude 101', issuer: 'Anthropic', date: '' },
  { name: 'Building with the Claude API', issuer: 'Anthropic', date: '' },
]

/* ── Skills (for resume view) ── */

export const skills: SkillGroup[] = [
  { category: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Ionic', 'Three.js', 'GSAP'] },
  { category: 'Backend', items: ['Python', 'Java', 'Node.js', 'FastAPI', 'Express', 'PostgreSQL', 'SQL Server'] },
  { category: 'AI & Automation', items: ['Anthropic API', 'LangChain', 'LangGraph', 'MCP', 'Voice AI', 'Test Automation'] },
  { category: 'Integration & APIs', items: ['REST APIs', 'SFTP', 'HL7', 'FHIR', 'Mirth Connect', 'Postman', 'OAuth 2.0'] },
  { category: 'Data', items: ['SQL', 'XML', 'JSON', 'CSV', 'Data Modeling', 'Data Validation', 'Data Engineering', 'ETL Pipelines'] },
  { category: 'Infrastructure', items: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Supabase', 'GitHub Actions', 'Networking'] },
]
