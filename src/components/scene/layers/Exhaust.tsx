import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../../lib/scrollState'
import { NOISE_GLSL } from '../shaders/noise'

const vert = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying float vWorldY;
void main() {
  vUv = uv;
  vWorldY = (modelMatrix * vec4(position, 1.0)).y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying float vWorldY;
uniform float uFloorY;   // trench floor — plume fades out before it clips
uniform float uTime;
uniform float uPower;    // 0..1 ignition
uniform float uThrust;   // 0..1
uniform float uHeat;     // brightness multiplier for HDR
${NOISE_GLSL}

void main() {
  // v = 1 at the nozzle (apex), 0 at the far end of the plume
  // Keep the tail strictly positive: pow(0, y) is undefined on some GPUs and
  // NaN under additive blending shows up as a saturated blob at the base.
  float v = clamp(vUv.y, 0.002, 1.0);
  float along = 1.0 - v;

  // Turbulent plume: noise scrolling away from the nozzle
  float n = fbm(vec2(vUv.x * 5.0, along * 4.0 - uTime * 6.5));
  float n2 = vnoise(vec2(vUv.x * 14.0 + uTime * 2.0, along * 18.0 - uTime * 14.0));

  // Edge softness by silhouette
  float rim = abs(dot(normalize(vNormalV), normalize(vViewDir)));
  float edge = smoothstep(0.05, 0.75, rim);

  // Shock diamonds along the core
  float diamonds = 0.5 + 0.5 * sin(along * (34.0 + uThrust * 10.0) - uTime * 3.0);
  diamonds = pow(diamonds, 6.0) * smoothstep(0.0, 0.25, along) * (1.0 - along);

  // Length falloff — plume thins and breaks up toward the tail
  float body = pow(v, 0.9 + n * 0.8);
  float alpha = body * edge * (0.9 + n * 0.5) * uPower;
  alpha += diamonds * edge * 0.6 * uPower;
  alpha *= smoothstep(uFloorY, uFloorY + 3.5, vWorldY);
  alpha = clamp(alpha, 0.0, 1.0);

  // Colour ramp: white-hot core → ember → deep orange
  vec3 core  = vec3(1.0, 0.93, 0.82);
  vec3 hot   = vec3(1.0, 0.62, 0.25);
  vec3 ember = vec3(1.0, 0.30, 0.06);
  float coreness = pow(v, 2.2) * (0.6 + 0.4 * rim);
  vec3 col = mix(ember, hot, smoothstep(0.1, 0.7, coreness + n2 * 0.15));
  col = mix(col, core, smoothstep(0.55, 1.0, coreness + diamonds * 0.8));

  // Premultiplied output, bounded so the buffer can never run away
  col = min(col * uHeat, vec3(1.9));
  gl_FragColor = vec4(col * alpha, alpha);
}
`

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,240,220,1)')
  g.addColorStop(0.25, 'rgba(255,170,90,0.7)')
  g.addColorStop(0.6, 'rgba(255,90,20,0.18)')
  g.addColorStop(1, 'rgba(255,60,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Flame plume: an additive shader cone (apex at the engines) plus an inner
 * core cone and a billboard glow at the nozzle. Values are pushed above 1.0
 * so bloom treats them as HDR.
 */
interface ExhaustProps {
  /** Engine bell positions in the parent (vehicle) space. */
  engines: THREE.Vector3[]
}

export function Exhaust({ engines }: ExhaustProps) {
  const cluster = useRef<THREE.Group>(null)
  const outerMat = useRef<THREE.ShaderMaterial>(null)
  const innerMat = useRef<THREE.ShaderMaterial>(null)
  // per-engine plume scale: five F-1s share the total plume footprint
  const per = Math.max(0.68, 1 / Math.sqrt(engines.length))
  const glow = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPower: { value: 0 }, uThrust: { value: 0 }, uHeat: { value: 1.5 }, uFloorY: { value: -7.4 } }),
    [],
  )
  const uniformsInner = useMemo(
    () => ({ uTime: { value: 0 }, uPower: { value: 0 }, uThrust: { value: 0 }, uHeat: { value: 1.9 }, uFloorY: { value: -7.4 } }),
    [],
  )
  const tex = useMemo(glowTexture, [])

  useFrame((state) => {
    const s = scrollState
    const t = state.clock.elapsedTime
    const power = Math.max(s.ignition, 0)
    const flicker = 1 + Math.sin(t * 57) * 0.05 + Math.sin(t * 91) * 0.03
    const len = (0.6 + power * 15 + s.thrust * 11) * flicker
    const wid = (0.55 + power * 1.9 + s.thrust * 0.7) * per

    // R3F copies the uniforms object on assignment — always write through the material.
    if (outerMat.current) {
      const u = outerMat.current.uniforms
      u.uTime.value = t
      u.uPower.value = power
      u.uThrust.value = s.thrust
    }
    if (innerMat.current) {
      const u = innerMat.current.uniforms
      u.uTime.value = t * 1.3
      u.uPower.value = power
      u.uThrust.value = s.thrust
    }

    if (cluster.current) {
      cluster.current.visible = power > 0.001
      for (const eng of cluster.current.children) {
        const [outer, inner] = eng.children as THREE.Mesh[]
        const j = 1 + Math.sin(t * 47 + eng.position.x * 9) * 0.04
        outer.scale.set(wid * j, len, wid * j)
        outer.position.y = 0.3 - len / 2
        inner.scale.set(wid * 0.45, len * 0.62, wid * 0.45)
        inner.position.y = 0.3 - (len * 0.62) / 2
      }
    }
    if (glow.current) {
      const g = (power * 6.5 + s.vent * 0.6) * flicker
      glow.current.visible = g > 0.01
      glow.current.scale.set(g, g, 1)
      ;(glow.current.material as THREE.SpriteMaterial).opacity = Math.min(0.85, power * 1.0 + s.vent * 0.1)
    }
    if (light.current) {
      light.current.intensity = power * 420 * flicker + s.vent * 10
      light.current.position.y = 0.2 - len * 0.18
    }
  })

  const outerMaterial = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending, premultipliedAlpha: true, side: THREE.DoubleSide }),
    [uniforms],
  )
  const innerMaterial = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: uniformsInner, transparent: true, depthWrite: false, blending: THREE.NormalBlending, premultipliedAlpha: true, side: THREE.DoubleSide }),
    [uniformsInner],
  )
  const outerGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 1, 1, 40, 24, true), [])
  const innerGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 1, 1, 32, 16, true), [])
  // materials are shared across engines; the refs feed the per-frame uniform writes
  outerMat.current = outerMaterial
  innerMat.current = innerMaterial

  return (
    <group>
      <group ref={cluster} visible={false}>
        {engines.map((e, i) => (
          <group key={i} position={[e.x, e.y, e.z]}>
            <mesh geometry={outerGeo} material={outerMaterial} frustumCulled={false} />
            <mesh geometry={innerGeo} material={innerMaterial} frustumCulled={false} />
          </group>
        ))}
      </group>
      <sprite ref={glow} position={[0, 0.4, 0]}>
        <spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0.2, 0]} color="#FF7A2A" intensity={0} distance={90} decay={2} />
    </group>
  )
}
