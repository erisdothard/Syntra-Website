export type OutputFormat = 'webp' | 'avif' | 'png'

export type AssetCategory =
  | 'background'
  | 'og'
  | 'hdri-plate'
  | 'texture-roughness'
  | 'texture-emissive'
  | 'particle-sprite'
  | 'skybox'
  | 'explore'

export interface AssetSpec {
  id: string
  category: AssetCategory
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  count?: number
  formats: OutputFormat[]
  quality?: number
}

export interface GenerationManifest {
  [promptHash: string]: {
    paths: string[]
    generatedAt: string
  }
}

export interface GenerationResult {
  specId: string
  outputPaths: string[]
  cacheHit: boolean
}

export interface PipelineOptions {
  force: boolean
  dryRun: boolean
  section?: string
  concurrency: number
}
