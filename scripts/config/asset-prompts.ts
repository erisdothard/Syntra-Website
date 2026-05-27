import type { AssetSpec } from '../lib/types.js'

export const BACKGROUND_SPECS: AssetSpec[] = [
  {
    id: 'bg-hero',
    category: 'background',
    prompt: 'Ultra-dark atmospheric void, deep space background, extremely subtle emerald (#00B67A) volumetric light rays emanating from center, bokeh micro-particles, depth fog, 8K cinematic, photorealistic, no text, no UI elements',
    negativePrompt: 'bright, white background, text, UI, logos, cartoonish',
    width: 1920, height: 1080, formats: ['webp', 'avif'], quality: 85,
  },
  {
    id: 'bg-deconstruct',
    category: 'background',
    prompt: 'Abstract dark void with fractured geometric planes separating, emerald green energy traces along fracture lines, deep space atmosphere, moody cinematic lighting, hex #0D0E12 base tone',
    negativePrompt: 'bright, colorful, text, cartoonish',
    width: 1920, height: 1080, formats: ['webp', 'avif'], quality: 85,
  },
  {
    id: 'bg-core',
    category: 'background',
    prompt: 'Dark liquid metal environment, barely visible teal-emerald iridescence at edges, macro depth of field, extremely dark #0D0E12 base, subtle concentric ring light artifacts',
    negativePrompt: 'bright, white, text',
    width: 1920, height: 1080, formats: ['webp', 'avif'], quality: 85,
  },
  {
    id: 'bg-capabilities',
    category: 'background',
    prompt: 'Neural network topology faintly visible in dark void, nodes emit dim emerald pulse, deep space scale, motion blur, cinematic atmosphere, no text',
    negativePrompt: 'bright, colorful labels, text, UI',
    width: 1920, height: 1080, formats: ['webp', 'avif'], quality: 85,
  },
  {
    id: 'bg-crystal',
    category: 'background',
    prompt: 'Crystalline dark environment, scattered icosahedral shards with emerald internal glow, ultra-dark background hex #0D0E12, subsurface scattering, 8K macro photograph style',
    negativePrompt: 'bright, white, text, cartoonish',
    width: 1920, height: 1080, formats: ['webp', 'avif'], quality: 85,
  },
  {
    id: 'bg-metrics',
    category: 'background',
    prompt: 'Abstract data stream visualization in void darkness, barely visible grid lines, emerald data pulses traveling along paths, atmospheric fog, cinematic depth of field',
    negativePrompt: 'text, labels, UI, bright',
    width: 1920, height: 1080, formats: ['webp', 'avif'], quality: 85,
  },
  {
    id: 'bg-reconstruct',
    category: 'background',
    prompt: 'Dark space with converging emerald light streams reassembling into a single point, radial motion blur, cosmic scale, photorealistic, no text',
    negativePrompt: 'text, UI, bright, cartoonish',
    width: 1920, height: 1080, formats: ['webp', 'avif'], quality: 85,
  },
]

export const OG_SPECS: AssetSpec[] = [
  {
    id: 'og-default',
    category: 'og',
    prompt: 'Premium dark technology brand card, deep void black background, elegant emerald green geometric accent shape center-left, bold minimal layout, luxury AI brand aesthetic, 1200x630 social preview',
    negativePrompt: 'text, logo, cartoonish, bright',
    width: 1200, height: 630, formats: ['png'], quality: 90,
  },
]

export const TEXTURE_SPECS: AssetSpec[] = [
  {
    id: 'hdri-studio-dark',
    category: 'hdri-plate',
    prompt: 'Equirectangular panoramic environment map, dark studio space, single emerald green area light source upper left, deep shadows, minimal ambient, 360 degree photographic environment, 2:1 aspect ratio, ultra-wide panorama',
    negativePrompt: 'text, objects, people, bright overall',
    width: 4096, height: 2048, formats: ['png'], quality: 95,
  },
  {
    id: 'roughness-crystal',
    category: 'texture-roughness',
    prompt: 'Grayscale roughness texture map, crystalline surface, micro-facet variation, subtle irregular scratches and smooth patches, PBR material map, white=rough black=smooth, seamless tileable, no color',
    width: 1024, height: 1024, formats: ['png'], quality: 95,
  },
  {
    id: 'emissive-emerald',
    category: 'texture-emissive',
    prompt: 'Emissive glow texture map for 3D model, deep black background with organic emerald green (#00B67A) self-illuminated veins and hotspots, subsurface glow effect, PBR emissive channel map, seamless',
    width: 1024, height: 1024, formats: ['png'], quality: 95,
  },
  {
    id: 'particle-glow-soft',
    category: 'particle-sprite',
    prompt: 'Single centered soft glow particle sprite, pure white circular radial gradient on pure black background, soft falloff, no hard edges, sprite sheet format single particle, square image',
    negativePrompt: 'multiple particles, color, texture, background objects',
    width: 128, height: 128, formats: ['png'], quality: 95,
  },
  {
    id: 'skybox-void',
    category: 'skybox',
    prompt: 'Ultra-dark void space skybox background plate, equirectangular projection, extremely subtle emerald nebula wisps at horizon, deep interstellar black, 2:1 panoramic',
    negativePrompt: 'bright stars, colorful nebula, text',
    width: 4096, height: 2048, formats: ['webp'], quality: 90,
  },
]

export const EXPLORE_SPECS: AssetSpec[] = [
  {
    id: 'explore-hero-concept',
    category: 'explore',
    prompt: 'Syntra AI brand hero visual concept, dark luxury tech aesthetic, crystalline geometric emblem, emerald accent lighting, editorial magazine layout reference',
    width: 1920, height: 1080, count: 4, formats: ['webp'], quality: 85,
  },
]

export const ALL_SPECS: AssetSpec[] = [
  ...BACKGROUND_SPECS,
  ...OG_SPECS,
  ...TEXTURE_SPECS,
  ...EXPLORE_SPECS,
]
