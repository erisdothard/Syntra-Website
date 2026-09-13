import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Server-only variables the /api functions read. Never prefixed VITE_, so never in the client bundle. */
const API_ENV_KEYS = ['RESEND_API_KEY', 'EMAIL_FROM', 'DEMO_NOTIFY_EMAIL']

/**
 * Serves /api/*.ts under `vite dev` the way Vercel serves them in production:
 * the file's exported POST/GET receives a Web Request and returns a Response.
 * Without it the demo form 404s locally and can only be tested on a deploy.
 */
function vercelApiDev(): Plugin {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      const { root, mode } = server.config
      const env = loadEnv(mode, root, '')
      for (const key of API_ENV_KEYS) {
        if (env[key] && !process.env[key]) process.env[key] = env[key]
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
        const match = /^\/api\/([a-z0-9-]+)$/.exec(url.pathname)
        if (!match || !existsSync(join(root, 'api', `${match[1]}.ts`))) return next()

        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            res.end()
            return
          }
          const response: Response = await handler(await toWebRequest(req, url))
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

async function toWebRequest(req: IncomingMessage, url: URL): Promise<Request> {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const chunks: Buffer[] = []
  if (hasBody) for await (const chunk of req) chunks.push(chunk as Buffer)
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? new Uint8Array(Buffer.concat(chunks)) : undefined,
  })
}

export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiDev()],
  server: {
    port: 5179,
  },
})
