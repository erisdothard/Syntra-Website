import { useMemo } from 'react'
import * as THREE from 'three'

export function useFresnelCoreMaterial() {
  return useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uExplode: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uExplode;

        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);

          // ── Lighting ──
          vec3 lightDir1 = normalize(vec3(5.0, 8.0, 6.0));
          vec3 lightDir2 = normalize(vec3(-4.0, -2.0, -5.0));

          // Diffuse
          float diff1 = max(dot(N, lightDir1), 0.0) * 0.7;
          float diff2 = max(dot(N, lightDir2), 0.0) * 0.2;
          float ambient = 0.08;
          float lighting = ambient + diff1 + diff2;

          // Specular (Blinn-Phong)
          vec3 H1 = normalize(lightDir1 + V);
          float spec1 = pow(max(dot(N, H1), 0.0), 64.0) * 0.6;
          vec3 H2 = normalize(lightDir2 + V);
          float spec2 = pow(max(dot(N, H2), 0.0), 32.0) * 0.15;

          // ── Base sphere: dark metallic ──
          vec3 baseColor = vec3(0.04, 0.045, 0.055);
          vec3 litColor = baseColor * lighting + vec3(0.7, 0.75, 0.8) * (spec1 + spec2);

          // ── Fresnel rim ──
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);

          // Subtle teal-green rim, not saturated slime green
          vec3 rimColor = vec3(0.0, 0.55, 0.45);
          float rimStrength = 0.4 + uExplode * 1.2;

          // Blend rim onto lit sphere
          vec3 color = litColor + rimColor * fresnel * rimStrength;

          // ── Subtle inner glow when exploded ──
          float innerGlow = smoothstep(0.5, 0.0, fresnel) * uExplode * 0.08;
          color += rimColor * innerGlow;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: false,
      side: THREE.FrontSide,
      toneMapped: false,
    })
  }, [])
}
