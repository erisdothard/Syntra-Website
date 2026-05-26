import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SyntraEmblem3D } from './components/SyntraEmblem3D'
import { ParticleField } from './components/ParticleField'

gsap.registerPlugin(ScrollTrigger)

/* ─── Mutable scroll store — GSAP writes, R3F reads ─── */
const scrollState = {
  explode: 0,
  rotationY: 0,
  scale: 1,
  cameraY: 0,
  lookAtY: 0,
  envRotation: 0,
  mouseX: 0,
  mouseY: 0,
}

/* ─── Camera ─── */
function CameraRig() {
  const { camera } = useThree()
  const target = new THREE.Vector3()

  useFrame(() => {
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, scrollState.cameraY, 0.05)
    target.y = THREE.MathUtils.lerp(target.y, scrollState.lookAtY, 0.05)
    camera.lookAt(target)
  })

  return null
}

/* ─── GSAP scroll wiring ─── */
function useScrollAnimations() {
  useEffect(() => {
    // Small delay to ensure DOM is fully painted and measured
    const timer = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 100)

    const ctx = gsap.context(() => {
      // Section 2: Rings separate + deconstruct
      ScrollTrigger.create({
        trigger: '#section-2',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          scrollState.explode = self.progress
          scrollState.rotationY = self.progress * Math.PI * 1.5
          scrollState.envRotation = self.progress * Math.PI * 0.5
        },
      })

      // Section 3: Hold open + scale up + camera shift
      ScrollTrigger.create({
        trigger: '#section-3',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          scrollState.scale = 1 + self.progress * 0.3
          scrollState.cameraY = self.progress * 0.8
          scrollState.lookAtY = self.progress * -0.4
          scrollState.envRotation = Math.PI * 0.3 + self.progress * Math.PI * 0.2
        },
      })

      // Section 4: Reconstruct — rings converge
      ScrollTrigger.create({
        trigger: '#section-4',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          scrollState.explode = 1 - self.progress
          scrollState.rotationY = Math.PI * 1.5 + self.progress * Math.PI * 1.5
          scrollState.scale = 1.3 - self.progress * 0.3
          scrollState.cameraY = 0.8 - self.progress * 0.8
          scrollState.lookAtY = -0.4 + self.progress * 0.4
          scrollState.envRotation = Math.PI * 0.5 + self.progress * Math.PI * 0.5
        },
      })
    })

    return () => {
      clearTimeout(timer)
      ctx.revert()
    }
  }, [])
}

/* ─── Mouse tracking ─── */
function useMouseTracking() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      scrollState.mouseX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.mouseY = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
}

/* ─── Text reveal observer ─── */
function useTextReveals() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          } else {
            entry.target.classList.remove('visible')
          }
        })
      },
      { threshold: 0.15 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ─── App ─── */
export default function App() {
  useScrollAnimations()
  useMouseTracking()
  useTextReveals()
  const glowRef = useRef<HTMLDivElement>(null)

  // Drive glow intensity from scroll
  useEffect(() => {
    const tick = () => {
      if (glowRef.current) {
        const intensity = 0.08 + scrollState.explode * 0.12
        glowRef.current.style.background = `radial-gradient(circle, rgba(0, 182, 122, ${intensity}) 0%, transparent 70%)`
      }
      requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <>
      {/* Ambient glow behind emblem */}
      <div ref={glowRef} className="emblem-glow" />

      {/* Fixed 3D canvas — pointer-events disabled so page scrolls through it */}
      <div
        className="fixed inset-0 z-0"
        style={{ pointerEvents: 'none' }}
      >
        <Canvas
          camera={{ position: [0, 0, 8], fov: 40 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          style={{ pointerEvents: 'none' }}
        >
          <CameraRig />
          <ambientLight intensity={0.1} />
          <directionalLight position={[5, 8, 6]} intensity={0.8} />
          <directionalLight position={[-4, -2, -5]} intensity={0.25} color="#8888aa" />
          <pointLight position={[3, 1, 4]} intensity={2} distance={15} color="#00b67a" />
          <pointLight position={[-3, -1, 3]} intensity={1.2} distance={12} color="#00d48a" />
          <pointLight position={[0, 3, -2]} intensity={1} distance={10} color="#00b67a" />
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={2} color="#ffffff"
              position={[4, 5, -3]} rotation={[Math.PI / 4, Math.PI / 4, 0]} scale={[10, 4, 1]} />
            <Lightformer form="rect" intensity={0.8} color="#c0d0e0"
              position={[-6, 2, 2]} rotation={[0, -Math.PI / 3, 0]} scale={[8, 6, 1]} />
            <Lightformer form="circle" intensity={1.5} color="#00b67a"
              position={[0, 0, -8]} scale={6} />
            <Lightformer form="rect" intensity={0.4} color="#1a1a2e"
              position={[0, -5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[20, 20, 1]} />
            <Lightformer form="ring" intensity={0.6} color="#334455"
              position={[0, 0, 0]} scale={16} />
          </Environment>
          <fog attach="fog" args={['#0D0E12', 12, 35]} />
          <ParticleField scrollProgress={scrollState} />
          <Suspense fallback={null}>
            <SyntraEmblem3D scrollProgress={scrollState} />
          </Suspense>
          <ContactShadows
            position={[0, -2.5, 0]}
            opacity={0.4}
            scale={10}
            blur={2.5}
            far={4}
            resolution={256}
            color="#00b67a"
            frames={1}
          />
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.4}
              luminanceSmoothing={0.8}
              intensity={0.8}
              mipmapBlur
            />
            <Vignette offset={0.3} darkness={0.7} />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.0008, 0.0008)}
            />
            <Noise opacity={0.06} blendFunction={BlendFunction.SOFT_LIGHT} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Scrollable HTML overlays */}
      <div className="relative z-10" style={{ pointerEvents: 'auto' }}>
        {/* Section 1: Hero — assembled emblem */}
        <section
          id="section-1"
          className="h-screen flex flex-col items-center justify-center text-center px-6"
        >
          <p className="reveal text-xs uppercase tracking-[0.2em] text-[#00b67a] mb-4 font-mono">
            AI Systems Engineering
          </p>
          <h1 className="reveal reveal-delay-1 text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
            SYNTRA
          </h1>
          <p className="reveal reveal-delay-2 mt-4 text-[#888] max-w-md text-lg">
            Intelligent systems that automate, optimize, and scale your
            business operations.
          </p>
          <div className="reveal reveal-delay-2 mt-12 flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#555]">Scroll</span>
            <div className="w-px h-10 bg-gradient-to-b from-[#00b67a] to-transparent animate-pulse" />
          </div>
        </section>

        {/* Section 2: Deconstruct — rings separate */}
        <section
          id="section-2"
          className="h-screen flex flex-col justify-center px-6 md:px-16 max-w-2xl"
        >
          <p className="reveal text-xs uppercase tracking-[0.15em] text-[#00b67a] mb-3 font-mono">
            01 &mdash; Deconstruct
          </p>
          <h2 className="reveal reveal-delay-1 text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
            See what's <span className="text-[#00b67a]">inside</span>
          </h2>
          <p className="reveal reveal-delay-2 text-[#888] text-base leading-relaxed max-w-lg">
            We break down your operations layer by layer — identifying
            where intelligent automation creates real impact.
          </p>
        </section>

        {/* Section 3: Exposed core — the engine revealed */}
        <section
          id="section-3"
          className="h-screen flex flex-col justify-center items-end px-6 md:px-16"
        >
          <div className="max-w-2xl text-right">
            <p className="reveal text-xs uppercase tracking-[0.15em] text-[#00b67a] mb-3 font-mono">
              02 &mdash; The Core
            </p>
            <h2 className="reveal reveal-delay-1 text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
              AI at the <span className="text-[#00b67a]">center</span>
            </h2>
            <p className="reveal reveal-delay-2 text-[#888] text-base leading-relaxed max-w-lg ml-auto">
              Autonomous agents, intelligent pipelines, production-grade
              systems. Not chatbot wrappers — real infrastructure.
            </p>
          </div>
        </section>

        {/* Section 4: Reconstruct — emblem reassembles */}
        <section
          id="section-4"
          className="h-screen flex flex-col items-center justify-center text-center px-6"
        >
          <p className="reveal text-xs uppercase tracking-[0.15em] text-[#00b67a] mb-3 font-mono">
            03 &mdash; Rebuild
          </p>
          <h2 className="reveal reveal-delay-1 text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
            Built to <span className="text-[#00b67a]">scale.</span>
          </h2>
          <p className="reveal reveal-delay-2 text-[#888] max-w-md text-base mb-8">
            Every layer reconnects. Tighter, smarter, automated.
            Your operations — running on intelligence.
          </p>
          <a
            href="mailto:eris@syntra.ai"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#00b67a] text-[#0D0E12] font-semibold text-sm rounded-full hover:bg-[#00d48a] transition-all hover:-translate-y-0.5"
          >
            Get in Touch
          </a>
        </section>
      </div>
    </>
  )
}
