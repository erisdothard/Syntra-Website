#!/usr/bin/env tsx
/**
 * Syntra AI — Gemini Image Generation Pipeline
 *
 * Usage:
 *   npm run gen:assets                    # generate all (skip cached)
 *   npm run gen:assets -- --force         # regenerate everything
 *   npm run gen:assets -- --dry-run       # log prompts, skip API
 *   npm run gen:assets -- --section bg    # only backgrounds
 *   npm run gen:assets -- --skip-explore  # skip explore variants
 */

import 'dotenv/config'
import { ALL_SPECS, BACKGROUND_SPECS, OG_SPECS, TEXTURE_SPECS, EXPLORE_SPECS } from './config/asset-prompts.js'
import { hashSpec, readManifest, writeManifest, isCached } from './lib/cache.js'
import { generateImage } from './lib/gemini-client.js'
import { optimize } from './lib/optimizer.js'
import { outputPath, writeAsset } from './lib/output.js'
import type { AssetSpec, GenerationResult } from './lib/types.js'

function parseArgs(): { force: boolean; dryRun: boolean; section?: string; skipExplore: boolean } {
  const args = process.argv.slice(2)
  return {
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    section: args.find((_, i, a) => a[i - 1] === '--section'),
    skipExplore: args.includes('--skip-explore'),
  }
}

function getSpecs(section?: string, skipExplore?: boolean): AssetSpec[] {
  if (section) {
    const map: Record<string, AssetSpec[]> = {
      bg: BACKGROUND_SPECS,
      backgrounds: BACKGROUND_SPECS,
      og: OG_SPECS,
      textures: TEXTURE_SPECS,
      tex: TEXTURE_SPECS,
      explore: EXPLORE_SPECS,
    }
    return map[section] ?? ALL_SPECS
  }
  if (skipExplore) return ALL_SPECS.filter(s => s.category !== 'explore')
  return ALL_SPECS
}

async function processSpec(spec: AssetSpec, force: boolean, dryRun: boolean, manifest: ReturnType<typeof readManifest>): Promise<GenerationResult> {
  const hash = hashSpec(spec.prompt, spec.negativePrompt, spec.width, spec.height)

  if (!force && isCached(manifest, hash)) {
    console.log(`  ⏭️  Cached: ${spec.id}`)
    return { specId: spec.id, outputPaths: manifest[hash].paths, cacheHit: true }
  }

  if (dryRun) {
    console.log(`  🔍 [DRY RUN] ${spec.id}: ${spec.prompt.slice(0, 100)}...`)
    return { specId: spec.id, outputPaths: [], cacheHit: false }
  }

  const pngBuffers = await generateImage(spec.prompt, spec.negativePrompt, spec.width, spec.height, spec.count ?? 1)

  const outputPaths: string[] = []

  for (let i = 0; i < pngBuffers.length; i++) {
    const suffix = pngBuffers.length > 1 ? `-${i + 1}` : ''
    const idWithSuffix = `${spec.id}${suffix}`

    for (const format of spec.formats) {
      const optimized = await optimize(pngBuffers[i], {
        format,
        width: spec.width,
        height: spec.height,
        quality: spec.quality ?? 85,
      })
      const path = outputPath(spec.category, idWithSuffix, format)
      writeAsset(path, optimized)
      outputPaths.push(path)
    }
  }

  manifest[hash] = { paths: outputPaths, generatedAt: new Date().toISOString() }
  return { specId: spec.id, outputPaths, cacheHit: false }
}

async function main() {
  const { force, dryRun, section, skipExplore } = parseArgs()
  const specs = getSpecs(section, skipExplore)
  const manifest = readManifest()

  console.log(`\n🚀 Syntra Asset Pipeline`)
  console.log(`   Specs: ${specs.length} | Force: ${force} | Dry Run: ${dryRun}\n`)

  const results: GenerationResult[] = []
  let generated = 0
  let cached = 0

  for (const spec of specs) {
    try {
      const result = await processSpec(spec, force, dryRun, manifest)
      results.push(result)
      if (result.cacheHit) cached++
      else generated++
    } catch (err) {
      console.error(`  ❌ Failed: ${spec.id} — ${err instanceof Error ? err.message : err}`)
    }
  }

  writeManifest(manifest)

  console.log(`\n✅ Done: ${generated} generated, ${cached} cached, ${specs.length - generated - cached} failed\n`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
