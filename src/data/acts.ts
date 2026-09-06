export interface Act {
  n: 1 | 2 | 3
  label: string
  title: string
  headline: string
  body: string
  chips: string[]
  /** Tailwind color class for the chip accent. */
  tone: 'ember' | 'data' | 'hot'
  align: 'left' | 'right' | 'center'
}

export const acts: Act[] = [
  {
    n: 1,
    label: 'T-minus · Venting & pressure build-up',
    title: 'Heavy manual friction',
    headline: 'Everything is held together by hand.',
    body:
      'Spreadsheets reconciled by people. Files moved by email. Systems that only talk through a human in the loop. Pressure builds in the chamber and nothing moves.',
    chips: ['Spreadsheets', 'Manual reconciliation', 'Email hand-offs', 'Siloed systems', 'Tribal knowledge'],
    tone: 'ember',
    align: 'left',
  },
  {
    n: 2,
    label: 'T-zero · Core ignition & shockwaves',
    title: 'Automated ingestion',
    headline: 'Pipelines ignite. Structure transforms.',
    body:
      'Syntra wires your sources into automated ingestion and processing. Dataiku flows, Snowflake warehousing, validated schemas, and transformations that run without anyone watching.',
    chips: ['Dataiku', 'Snowflake', 'ETL / ELT pipelines', 'Schema transformation', 'Data validation'],
    tone: 'data',
    align: 'right',
  },
  {
    n: 3,
    label: 'Liftoff · Final thrust',
    title: 'Enterprise-scale delivery',
    headline: 'Clean data, delivered everywhere it needs to go.',
    body:
      'Power BI dashboards that update themselves. CRMs that act on their own records. Custom apps and APIs integrated into the systems your teams already run. Full thrust, no friction.',
    chips: ['Power BI', 'Automated CRMs', 'Custom app integration', 'REST & MCP APIs', 'Zero-downtime deploys'],
    tone: 'hot',
    align: 'left',
  },
]
