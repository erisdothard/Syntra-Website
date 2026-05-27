import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { GenerationManifest } from './types.js'

const MANIFEST_PATH = join(import.meta.dirname, '..', '.cache', 'manifest.json')

export function hashSpec(prompt: string, negativePrompt: string | undefined, width: number, height: number): string {
  const input = `${prompt}|${negativePrompt ?? ''}|${width}x${height}`
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

export function readManifest(): GenerationManifest {
  if (!existsSync(MANIFEST_PATH)) return {}
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

export function writeManifest(manifest: GenerationManifest): void {
  const dir = dirname(MANIFEST_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
}

export function isCached(manifest: GenerationManifest, hash: string): boolean {
  return hash in manifest
}
