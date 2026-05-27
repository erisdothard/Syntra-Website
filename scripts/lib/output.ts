import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const PUBLIC_DIR = join(import.meta.dirname, '..', '..', 'public', 'generated')

export function outputPath(category: string, id: string, ext: string): string {
  return join(PUBLIC_DIR, category, `${id}.${ext}`)
}

export function writeAsset(filePath: string, data: Buffer): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, data)
  console.log(`  ✅ ${filePath.replace(PUBLIC_DIR, 'public/generated')}`)
}
