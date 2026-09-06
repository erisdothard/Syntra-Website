/**
 * Fetches the NASA Saturn V and Mobile Launcher models (public domain,
 * https://github.com/nasa/NASA-3D-Resources), optimizes them, and writes
 * Draco-compressed GLBs into public/models plus the Draco decoder into
 * public/draco. Run once: `npm run prepare:models`. Outputs are committed;
 * the build never fetches anything.
 */
import { mkdir, writeFile, copyFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cache = path.join(root, 'scripts', '.cache', 'models')
const out = path.join(root, 'public', 'models')
const draco = path.join(root, 'public', 'draco')
const BASE = 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models'

const MODELS = [
  { name: 'saturn-v', url: `${BASE}/Saturn%20V/Saturn%20V.glb`, resize: 1024 },
  { name: 'mobile-launcher', url: `${BASE}/Mobile%20Launcher/Mobile%20Launcher%20(assembled).glb`, resize: 512 },
]

await mkdir(cache, { recursive: true })
await mkdir(out, { recursive: true })
await mkdir(draco, { recursive: true })

const bin = path.join(root, 'node_modules', '.bin', 'gltf-transform')
const run = (args) => execFileSync(bin, args, { stdio: 'inherit' })

for (const m of MODELS) {
  const src = path.join(cache, `${m.name}.src.glb`)
  if (!existsSync(src)) {
    console.log(`fetch ${m.url}`)
    const res = await fetch(m.url)
    if (!res.ok) throw new Error(`${m.url} → ${res.status}`)
    await writeFile(src, Buffer.from(await res.arrayBuffer()))
  }
  const tmp = path.join(cache, `${m.name}.tmp.glb`)
  const dst = path.join(out, `${m.name}.glb`)
  // Strip the no-op animations and duplicate PNG copies, merge identical
  // buffers, then compress geometry with Draco.
  run(['prune', '--keep-attributes', 'false', src, tmp])
  run(['dedup', tmp, tmp])
  run(['resize', '--width', String(m.resize), '--height', String(m.resize), tmp, tmp])
  run(['draco', '--method', 'edgebreaker', '--quantize-position', '14', '--quantize-normal', '10', '--quantize-texcoord', '12', tmp, dst])
  const size = (await stat(dst)).size
  console.log(`→ ${path.relative(root, dst)} ${(size / 1024).toFixed(0)} KB`)
}

const decoderDir = path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf')
for (const f of ['draco_decoder.wasm', 'draco_wasm_wrapper.js', 'draco_decoder.js']) {
  await copyFile(path.join(decoderDir, f), path.join(draco, f))
}
console.log('→ public/draco/ decoder copied')
