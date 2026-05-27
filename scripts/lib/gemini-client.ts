import { GoogleGenAI } from '@google/genai'

const SUPPORTED_RATIOS = [
  { r: '1:1', v: 1 },
  { r: '4:3', v: 4 / 3 },
  { r: '3:4', v: 3 / 4 },
  { r: '16:9', v: 16 / 9 },
  { r: '9:16', v: 9 / 16 },
]

function nearestAspectRatio(w: number, h: number): string {
  const ratio = w / h
  return SUPPORTED_RATIOS.reduce((best, cur) =>
    Math.abs(cur.v - ratio) < Math.abs(best.v - ratio) ? cur : best
  ).r
}

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment')
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

let lastRequestTime = 0
const MIN_INTERVAL_MS = 31_000

async function waitForSlot(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_INTERVAL_MS) {
    const delay = MIN_INTERVAL_MS - elapsed
    console.log(`  ⏳ Rate limit: waiting ${(delay / 1000).toFixed(1)}s`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  lastRequestTime = Date.now()
}

export async function generateImage(
  prompt: string,
  negativePrompt: string | undefined,
  width: number,
  height: number,
  count: number = 1,
): Promise<Buffer[]> {
  const ai = getClient()
  const aspectRatio = nearestAspectRatio(width, height)

  await waitForSlot()

  // Developer API doesn't support negativePrompt param — fold into prompt
  const fullPrompt = negativePrompt
    ? `${prompt}. Avoid: ${negativePrompt}`
    : prompt

  console.log(`  🎨 Generating (${aspectRatio}, ${count}x): ${fullPrompt.slice(0, 80)}...`)

  const config: Record<string, unknown> = {
    numberOfImages: count,
    aspectRatio,
  }

  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: fullPrompt,
        config,
      })

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('No images returned from Imagen 3')
      }

      return response.generatedImages.map(img => {
        const bytes = img.image?.imageBytes
        if (!bytes) throw new Error('Missing imageBytes in response')
        return Buffer.from(bytes, 'base64')
      })
    } catch (err: unknown) {
      attempts++
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('429') && attempts < maxAttempts) {
        const backoff = 60_000 * attempts
        console.log(`  ⚠️  Rate limited (429). Backing off ${backoff / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, backoff))
        continue
      }
      throw err
    }
  }

  throw new Error(`Failed after ${maxAttempts} attempts`)
}
