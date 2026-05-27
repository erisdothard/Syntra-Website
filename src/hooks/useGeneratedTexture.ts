import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Load a generated texture with optional equirectangular mapping for HDRI plates.
 * Falls back gracefully if the asset hasn't been generated yet.
 */
export function useGeneratedTexture(
  path: string,
  options?: { equirectangular?: boolean },
): THREE.Texture | null {
  try {
    const texture = useTexture(path)
    if (options?.equirectangular) {
      texture.mapping = THREE.EquirectangularReflectionMapping
    }
    return texture
  } catch {
    return null
  }
}
