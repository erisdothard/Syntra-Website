/* ── Centralized content data ── */

export interface Project {
  title: string
  tag: string
  stack: string
  featured: boolean
  description: string
  github?: string
  /** Production URL, for client work that is live. */
  live?: string
  /** One short line for the homepage proof strip. Presence opts a project in. */
  proof?: string
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
    title: 'Hyper Racer USA',
    tag: 'Website + CRM + Agentic Lead Pipeline',
    stack: 'Next.js 16 \u00b7 React 19 \u00b7 TypeScript \u00b7 Supabase \u00b7 Anthropic SDK \u00b7 GSAP \u00b7 Mapbox \u00b7 Resend \u00b7 Vercel',
    featured: true,
    description:
      'Full ecosystem rebuild for the US distributor of the X1 ground-effects race car \u2014 Wix to Next.js 16, live in production. Public site with a pricing configurator, inventory, a Mapbox dealer network, gallery, news and events; behind it a 19-section admin CRM where the client edits their own live site content, works a leads \u2192 customers \u2192 deals pipeline, and audits every mutation in an activity log. Inbound leads run an Anthropic-SDK agent pipeline \u2014 junk filter, enrichment, then scoring \u2014 dry-run by default and graded by an eval harness against the same code path production runs, with tokens, cost and latency itemised per call. Offline kiosk capture for trade shows.',
    live: 'https://www.hyperracerusa.com',
    proof: 'Site, configurator, CRM, and an AI lead pipeline.',
  },
  {
    title: 'FreightX',
    tag: 'Full-Stack Freight Marketplace',
    stack: 'React 19 · TypeScript · Vite · Supabase · Stripe · Anthropic Claude · Upstash Redis',
    featured: true,
    proof: 'Freight marketplace \u2014 four roles, live GPS, automated billing.',
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
    proof: 'HL7 v2.5 / FHIR R4 \u2014 four production channels.',
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
  {
    title: 'PropLogix Extraction Pipeline',
    tag: 'AI-Powered Property Data Extraction',
    stack: 'Python · FastAPI · Claude API · Playwright · Pydantic · MCP · Streamlit',
    featured: true,
    description:
      'Agentic property data extraction system that scrapes county appraiser sites via Playwright, extracts structured records through Claude tool use with per-field confidence scoring, and routes results through auto-approve, human-review, or reject lanes. Three service surfaces — FastAPI gateway, MCP server for AI agents, and Streamlit monitoring dashboard.',
    github: 'https://github.com/erisdothard/property-data-extraction-pipeline',
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
          'Deliver full builds end to end — frontend, backend, database, and the AI agents that run inside them — scoped directly with the client and owned through production deployment and support',
          'Custom integration and agentic workflow engineering: REST and MCP APIs, third-party pipelines, and legacy systems connected to model-driven automation, under the change-management discipline carried forward from regulated banking work',
        ],
      },
      {
        label: 'Shipped Infrastructure',
        bullets: [
          'Hyper Racer USA — full ecosystem rebuild for the US distributor of the X1 ground-effects race car, Wix to Next.js 16 and live in production: public site, pricing configurator, Mapbox dealer network, and a 19-section admin CRM the client edits their own live pages from; inbound leads run an Anthropic-SDK agent pipeline (enrich, score, prioritise) graded by an eval harness with per-request cost logging',
          'FreightX — multi-role logistics marketplace built across 20+ phases with autonomous load management, live GPS tracking, billing automation, and carrier verification',
          'BridgeLink Core — HL7 v2.5 / FHIR R4 integration engine across four channels: ORU lab routing with NPI provider enrichment and critical-result branching, ADT admit/discharge/update with UPSERT for duplicate-admit resilience, and FHIR R4 Patient/Observation Bundles with LOINC-coded results',
          'DispatchRelay — voice-AI engine for small-tier trucking fleets with automated dispatch handling and background workflow automation',
          '3 Aces Trucking Inc. — full application and web development for a commercial trucking carrier; voice AI integration, autonomous load and document automation, and client-facing site',
        ],
      },
    ],
  },
  {
    role: 'Data Scientist II / AI Engineer',
    org: 'Caterpillar Financial',
    date: '2026 \u2013',
    sections: [
      {
        label: 'AI Engineering & Agent Integration',
        bullets: [
          'Build and deploy AI agents into core business workflows \u2014 wiring model-driven decisioning into the systems the business already runs on, rather than standing up parallel tooling nobody adopts',
          'Replace manual, human-in-the-loop steps with automated pipelines: identify where analyst hours go to routing, lookup, and reconciliation, then move that work to scheduled or event-driven execution',
          'Own solutions end to end \u2014 problem framing with business stakeholders, data sourcing, agent and model design, deployment, and the monitoring that keeps output trustworthy in production',
        ],
      },
      {
        label: 'Data Platform \u2014 Snowflake-first',
        bullets: [
          'Snowflake as the primary platform: data modeling, SQL development, and the warehouse layer that downstream reporting and automation depend on',
          'Dataiku flows for automated ingestion, transformation, and validation \u2014 repeatable pipelines in place of one-off extracts',
          'Build and maintain the curated datasets analytics and AI workloads read from, with validation rules that catch bad data before it reaches a dashboard or a model',
        ],
      },
      {
        label: 'Reporting & Decision Support',
        bullets: [
          'Power BI reporting built directly on the warehouse layer, so figures refresh themselves instead of being rebuilt by hand each cycle',
          'Translate stakeholder questions into data products \u2014 specify the metric, source the data, and deliver the view the decision actually needs',
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
    title: 'Web & Applications',
    desc: 'Hyper Racer USA is the proof: we replaced their Wix site with a Next.js 16 build \u2014 public site, pricing configurator, Mapbox dealer network, inventory, events \u2014 and put a 19-section CRM behind it, so they edit their own live pages, work a leads \u2192 customers \u2192 deals pipeline, and audit every change. FreightX before it: four user roles, 20+ phases, live GPS fleet tracking, Stripe billing, real-time bidding. Same team from the first wireframe to the production deploy, every time.',
  },
  {
    title: 'AI Automation',
    desc: 'Every lead that hits Hyper Racer runs a junk filter, an enrichment pass, then scoring before a human sees it \u2014 dry-run by default, graded by an eval harness against the same code path production runs, with tokens, cost and latency logged per call. DispatchRelay answers dispatch calls with an ElevenLabs voice agent. Our extraction pipeline reads county appraiser sites through Playwright and routes Claude-scored fields into auto-approve, human-review, and reject lanes.',
  },
  {
    title: 'Integration',
    desc: 'BridgeLink Core runs four HL7 v2.5 / FHIR R4 channels: ORU lab routing with NPI provider enrichment and critical-result branching, ADT admit/discharge/update with UPSERT for duplicate admits, LOINC-coded Patient and Observation bundles. Integration either survives production or it does not.',
  },
]

/* ── Background orgs (Portfolio tab: names only, no titles or dates) ── */

export const backgroundOrgs = ['Google', 'CPI Card Group', 'Caterpillar Financial']

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
  { category: 'Integration & APIs', items: ['REST APIs', 'CRM Automation', 'SFTP', 'HL7', 'FHIR', 'Mirth Connect', 'OAuth 2.0'] },
  { category: 'Data', items: ['SQL', 'Snowflake', 'Dataiku', 'Power BI', 'Data Modeling', 'Data Validation', 'Data Engineering', 'ETL / ELT Pipelines'] },
  { category: 'Infrastructure', items: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Supabase', 'GitHub Actions', 'Networking'] },
]
