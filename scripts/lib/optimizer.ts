import sharp from 'sharp'
import type { OutputFormat } from './types.js'

interface OptimizeOptions {
  format: OutputFormat
  width: number
  height: number
  quality: number
}

export async function optimize(pngBuffer: Buffer, opts: OptimizeOptions): Promise<Buffer> {
  let pipeline = sharp(pngBuffer).resize(opts.width, opts.height, { fit: 'cover' })

  switch (opts.format) {
    case 'webp':
      pipeline = pipeline.webp({ quality: opts.quality })
      break
    case 'avif':
      pipeline = pipeline.avif({ quality: opts.quality })
      break
    case 'png':
      pipeline = pipeline.png({ quality: opts.quality })
      break
  }

  return pipeline.toBuffer()
}
