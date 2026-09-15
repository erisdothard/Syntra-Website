/**
 * Encodes the offline-rendered launch sequence into the frame contract the
 * site consumes (render/SPEC.md → "Frame contract"):
 *
 *   public/frames/desktop/0001.webp … NNNN.webp   (1920×1080, WebP q82, sRGB, no alpha)
 *   public/frames/desktop/manifest.json           { count, width, height, ext, pad }
 *
 *   npm run frames:encode        reads render/out/final/<n>.png (any zero-padded
 *                                numeric name; <n>_5.png is the half-step n + 0.5),
 *                                sorts by that value, renumbers 1..N and writes a
 *                                "progress" table (one entry per output frame, on the
 *                                original 240-frame timeline grid) so the player can
 *                                scrub a non-uniform sequence
 *   npm run frames:placeholder   generates 240 synthetic frames so the player can
 *                                be exercised before a single frame is rendered
 *
 * Flags: --src <dir> --out <dir> --quality <n> --count <n> (placeholder mode only:
 *        frames to generate; encode mode always counts the source files)
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/* ── Contract ── */
const WIDTH = 1920
const HEIGHT = 1080
const PAD = 4
const EXT = 'webp'
const DEFAULT_QUALITY = 82
const PLACEHOLDER_COUNT = 240
const CONCURRENCY = 4
/** The timeline (src/lib/launchTimeline.ts PHASES) is defined on this grid; half-step renders sit between its frames. */
const TIMELINE_FRAMES = 240

/* Mirrors PHASES.liftStart / liftEnd in src/lib/launchTimeline.ts (0.70 → 0.97). */
const LIFT_START = 0.7
const LIFT_END = 0.97

/* ── Args ── */
function parseArgs(argv) {
  const opts = {
    placeholder: false,
    countExplicit: false,
    src: path.join(root, 'render', 'out', 'final'),
    out: path.join(root, 'public', 'frames', 'desktop'),
    quality: DEFAULT_QUALITY,
    count: PLACEHOLDER_COUNT,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => {
      const v = argv[++i]
      if (v === undefined) throw new Error(`${a} needs a value`)
      return v
    }
    if (a === '--placeholder') opts.placeholder = true
    else if (a === '--src') opts.src = path.resolve(root, next())
    else if (a === '--out') opts.out = path.resolve(root, next())
    else if (a === '--quality') opts.quality = Number(next())
    else if (a === '--count') { opts.count = Number(next()); opts.countExplicit = true }
    else throw new Error(`unknown argument ${a}`)
  }
  if (!Number.isInteger(opts.quality) || opts.quality < 1 || opts.quality > 100) throw new Error('--quality must be 1..100')
  if (!Number.isInteger(opts.count) || opts.count < 2) throw new Error('--count must be an integer ≥ 2')
  return opts
}

const frameName = (i) => `${String(i).padStart(PAD, '0')}.${EXT}`
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeInCubic = (t) => t * t * t

/** Run `fn` over `items` with at most `limit` in flight. */
async function pool(items, limit, fn) {
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor++
      await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

/** `progress` (optional): scroll progress of each output frame on the timeline grid, strictly increasing. */
async function writeManifest(out, count, progress) {
  const manifest = { count, width: WIDTH, height: HEIGHT, ext: EXT, pad: PAD, ...(progress ? { progress } : {}) }
  await writeFile(path.join(out, 'manifest.json'), `${JSON.stringify(manifest)}\n`)
  return manifest
}

async function resetOut(out) {
  await rm(out, { recursive: true, force: true })
  await mkdir(out, { recursive: true })
}

/* ── Encode mode ── */
async function listSourceFrames(src) {
  let entries
  try {
    entries = await readdir(src)
  } catch (err) {
    throw new Error(`cannot read ${src}: ${err instanceof Error ? err.message : String(err)}`)
  }
  const frames = entries
    .map((name) => {
      const m = /^(\d+)(_5)?\.png$/i.exec(name)
      return m ? { name, value: Number(m[1]) + (m[2] ? 0.5 : 0) } : null
    })
    .filter((f) => f !== null)
    .sort((a, b) => a.value - b.value)
  if (frames.length === 0) throw new Error(`no numeric .png frames in ${src}`)
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].value === frames[i - 1].value) throw new Error(`duplicate frame value ${frames[i].value}: ${frames[i - 1].name}, ${frames[i].name}`)
  }
  const last = frames[frames.length - 1].value
  if (frames[0].value < 1 || last > TIMELINE_FRAMES) throw new Error(`frame values must lie in 1..${TIMELINE_FRAMES}, got ${frames[0].value}..${last}`)
  return frames
}

/** Scroll progress of a source frame value on the timeline grid: frame 1 → 0, frame 240 → 1. */
const progressOf = (value) => Number(((value - 1) / (TIMELINE_FRAMES - 1)).toFixed(6))

async function encode(opts) {
  const frames = await listSourceFrames(opts.src)
  await resetOut(opts.out)
  const t0 = performance.now()
  let bytes = 0
  if (opts.countExplicit) process.stderr.write('note: --count only applies to --placeholder; encode mode counts the source files\n')
  await pool(frames, CONCURRENCY, async (f, idx) => {
    // Output is renumbered 1..N in timeline order; the manifest's progress table
    // carries each frame's position (half-steps included), not the file name.
    const target = path.join(opts.out, frameName(idx + 1))
    const info = await sharp(path.join(opts.src, f.name))
      .flatten({ background: '#000000' })
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
      .toColourspace('srgb')
      .webp({ quality: opts.quality, effort: 5, smartSubsample: true })
      .toFile(target)
    bytes += info.size
  })
  const halves = frames.filter((f) => f.value % 1 !== 0).length
  const manifest = await writeManifest(opts.out, frames.length, frames.map((f) => progressOf(f.value)))
  const secs = ((performance.now() - t0) / 1000).toFixed(1)
  process.stdout.write(
    `encoded ${frames.length} frames (${halves} half-steps) → ${opts.out} (${(bytes / 1024 / 1024).toFixed(1)} MB, ${secs}s)\n` +
      `manifest count=${manifest.count} progress=[${manifest.progress.slice(0, 3).join(', ')} … ${manifest.progress.at(-1)}]\n`,
  )
}

/* ── Placeholder mode ── */
function placeholderSvg(i, count) {
  const p = (i - 1) / (count - 1)
  const liftT = clamp01((p - LIFT_START) / (LIFT_END - LIFT_START))
  const lift = easeInCubic(liftT)
  const padY = 860
  const dotX = WIDTH / 2
  const dotY = padY - lift * 900
  const horizonGlow = 0.12 + (p > 0.36 ? 0.5 * clamp01((p - 0.36) / 0.08) : 0)
  const act = p < 0.06 ? 'HERO' : p < 0.34 ? 'ACT 1' : p < 0.66 ? 'ACT 2' : 'ACT 3'
  const barW = 1400
  const barX = (WIDTH - barW) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050710"/>
      <stop offset="0.55" stop-color="#0E1220"/>
      <stop offset="1" stop-color="#171D33"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="1" r="0.6">
      <stop offset="0" stop-color="#FF6A1A" stop-opacity="${horizonGlow.toFixed(3)}"/>
      <stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="dot" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.35" stop-color="#FFE0B8"/>
      <stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <line x1="0" y1="${padY}" x2="${WIDTH}" y2="${padY}" stroke="#2A3352" stroke-width="2"/>
  <circle cx="${dotX}" cy="${dotY.toFixed(1)}" r="80" fill="url(#dot)"/>
  <circle cx="${dotX}" cy="${dotY.toFixed(1)}" r="14" fill="#FFFFFF"/>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2 + 90}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="300" fill="#FFFFFF" fill-opacity="0.22">${String(i).padStart(PAD, '0')}</text>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2 + 170}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="48" letter-spacing="6" fill="#FFFFFF" fill-opacity="0.6">PLACEHOLDER · ${act} · p = ${p.toFixed(3)} · lift = ${lift.toFixed(3)}</text>
  <rect x="${barX}" y="${HEIGHT - 80}" width="${barW}" height="4" fill="#FFFFFF" fill-opacity="0.12"/>
  <rect x="${barX}" y="${HEIGHT - 80}" width="${(barW * p).toFixed(1)}" height="4" fill="#FF6A1A"/>
</svg>`
}

async function placeholder(opts) {
  await resetOut(opts.out)
  const t0 = performance.now()
  const indices = Array.from({ length: opts.count }, (_, k) => k + 1)
  let bytes = 0
  await pool(indices, CONCURRENCY, async (i) => {
    const info = await sharp(Buffer.from(placeholderSvg(i, opts.count)), { density: 72 })
      .flatten({ background: '#050710' })
      .toColourspace('srgb')
      .webp({ quality: opts.quality, effort: 3 })
      .toFile(path.join(opts.out, frameName(i)))
    bytes += info.size
  })
  const manifest = await writeManifest(opts.out, opts.count)
  const secs = ((performance.now() - t0) / 1000).toFixed(1)
  process.stdout.write(
    `placeholder ${opts.count} frames → ${opts.out} (${(bytes / 1024).toFixed(0)} KB, ${secs}s)\n` +
      `manifest ${JSON.stringify(manifest)}\n`,
  )
}

/* ── Main ── */
try {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.placeholder) await placeholder(opts)
  else await encode(opts)
} catch (err) {
  process.stderr.write(`encode failed: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
}
