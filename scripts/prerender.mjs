/**
 * Runs after `vite build`. Renders every addressed page (src/site/pages.ts) to
 * HTML and writes dist/<path>/index.html, so the text is in the response a crawler
 * or a link preview receives, not assembled later by JavaScript. Also writes
 * dist/sitemap.xml. The home page keeps the built index.html untouched.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ROOT_MARKER = '<div id="root"></div>'
const HEAD_BLOCK = /<!--page-head-->[\s\S]*?<!--\/page-head-->/

const escapeAttr = (value) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** JSON inside a <script> must not be able to close the tag. */
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

function headFor(page, ogImage) {
  const title = escapeAttr(page.title)
  const description = escapeAttr(page.description)
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${page.url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${page.url}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...page.jsonLd.map((entry) => `<script type="application/ld+json">${safeJson(entry)}</script>`),
  ].join('\n    ')
}

const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn' })
try {
  const { renderAll, SITE_ORIGIN } = await vite.ssrLoadModule('/src/site/render.ts')
  const template = await readFile(join(dist, 'index.html'), 'utf8')
  if (!template.includes(ROOT_MARKER)) throw new Error(`prerender: ${ROOT_MARKER} not found in dist/index.html`)
  if (!HEAD_BLOCK.test(template)) throw new Error('prerender: <!--page-head--> block not found in dist/index.html')

  const ogImage = `${SITE_ORIGIN}/img/og-v1.jpg`
  const rendered = renderAll()
  for (const page of rendered) {
    const html = template
      .replace(HEAD_BLOCK, () => headFor(page, ogImage))
      .replace(ROOT_MARKER, () => `<div id="root">${page.html}</div>`)
    const file = join(dist, page.path, 'index.html')
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, html)
  }

  const urls = [`${SITE_ORIGIN}/`, ...rendered.map((page) => page.url)]
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')
  await writeFile(join(dist, 'sitemap.xml'), sitemap)
  process.stdout.write(`prerender: wrote ${rendered.length} pages and sitemap.xml\n`)
} finally {
  await vite.close()
}
