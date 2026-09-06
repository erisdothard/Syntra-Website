declare module 'n8ao' {
  import type { Camera, Color, Scene } from 'three'
  import { Pass } from 'postprocessing'

  export interface N8AOConfiguration {
    aoRadius: number
    distanceFalloff: number
    intensity: number
    color: Color
    halfRes: boolean
    screenSpaceRadius: boolean
    aoSamples: number
    denoiseSamples: number
    denoiseRadius: number
    gammaCorrection: boolean
    renderMode: number
  }

  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number)
    configuration: N8AOConfiguration
    setSize(width: number, height: number): void
    dispose(): void
  }

  export class N8AOPass extends N8AOPostPass {}
}
