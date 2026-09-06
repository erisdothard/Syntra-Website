# Syntra AI — Ignition

The syntraai.tech site: a full-screen, scroll-scrubbed rocket launch that tells the Syntra AI story in three acts.

| Scroll | Act | Story |
| --- | --- | --- |
| 0–6% | Hero | Wordmark over the pad at night |
| 6–34% | 1 · Venting & pressure build-up | Heavy manual operational friction |
| 34–66% | 2 · Core ignition & shockwaves | Automated ingestion and processing (Dataiku, Snowflake), structural transformation |
| 66–100% | 3 · Final thrust & liftoff | Enterprise-scale delivery (Power BI, automated CRMs, custom app integration) |

After the launch track ends, a normal-scroll outro carries the contact CTA, service list, and footer. Portfolio, Services, and Resume open in the nav overlay.

## Stack

React 19 · Vite 8 · Tailwind v4 · GSAP ScrollTrigger · Lenis · react-three-fiber · three · postprocessing

## How the scroll works

```
scroll ──▶ ScrollTrigger (scrub) ──▶ launchTimeline.mapProgress() ──▶ scrollState (mutable singleton)
                                                                        │
                    ┌───────────────────────────────────────────────────┤
                    ▼                                                   ▼
        DOM act panels (class toggle)                    R3F layers read it in useFrame
        HUD telemetry (rAF, ~12 Hz)                      camera · sky · gantry · rocket · exhaust · smoke · shockwave · post FX
```

- `src/lib/launchTimeline.ts` — every choreography boundary lives in `PHASES`. Change a number there and the camera, particles, DOM panels, and HUD all follow. No spacer divs, no magic pixel heights.
- `src/lib/scrollState.ts` — the shared state object. GSAP writes, everything else reads. Nothing on the scroll path goes through React state.
- `src/hooks/useLaunchScroll.ts` — Lenis (desktop only) synced to ScrollTrigger, one master scrub over `#launch`, panel visibility derived from the same progress value.

## Scene layers (`src/components/scene/layers/`)

The vehicle and tower are real NASA models (public domain, see `public/models/LICENSE.md`):
the Saturn V and the Apollo-era Mobile Launcher, fetched and optimized once by
`npm run prepare:models` (Draco-compressed, 182 KB + 105 KB, committed). Everything
else — sky, smoke, plume, shockwave, pad — is procedural.

| Layer | Depth | What it does |
| --- | --- | --- |
| `Sky` | far background | Full-screen shader: gradient, FBM cloud bank, ember tint on ignition, stars fade in with altitude. Explicit slow parallax on top of perspective. |
| `Gantry` | midground | Concrete pad with the flame trench, the NASA Mobile Launcher (deck + umbilical tower) with PBR steel, beacons, lightning masts and tank farm far behind. |
| `Rocket` | foreground | NASA Saturn V. Materials rebuilt as `MeshPhysicalMaterial` (clearcoated paint, black roll pattern, metal bells that glow at ignition, decal textures) with procedural panel seams, rivets, grime and a frost band injected via `onBeforeCompile` (`shaders/surfaceDetail.ts`, `lib/rocketMaterials.ts`). Rumbles with pressure, lifts and pitches on Act 3. |
| `Exhaust` | — | Five F-1 plumes (one per engine bell, positions read from the model): premultiplied shader cones with scrolling noise and shock diamonds, inner core, nozzle glow sprite, flame point light. |
| `Smoke` | — | One instanced billboard draw call, three populations: Act 1 side vents, Act 2 ember-lit ground cloud, Act 3 exhaust column. |
| `Shockwave` | — | Two expanding pressure rings across the pad at T-zero. |
| `PostFX` | — | N8AO ambient occlusion (desktop), bloom ramp, chromatic aberration pulse on the shockwave, vignette, grain, SMAA. Tone-mapping exposure spikes at ignition. |

Lighting (`LaunchCanvas.tsx`): a shadow-casting moon key, warm rim, three xenon floodlights (volumetric cones on desktop), a procedural `Environment` built from `Lightformer`s for reflections (no HDR download), and a contact shadow under the vehicle. Everything is dimmed for a night launch so the white paint holds detail.

### Swapping the vehicle

`Rocket.tsx` loads `/models/saturn-v.glb` with `useGLTF`. Any glTF works: set `MODEL_SCALE` and `AXIS` so the engine plane sits at local y=0 on the axis, and adjust the material classifier in `lib/rocketMaterials.ts` to the new material names. Engine plume positions are found by mesh name; pass explicit positions to `Exhaust` if the model names differ.

## Content

- `src/data/acts.ts` — the three act panels (label, headline, copy, tech chips).
- `src/data/portfolio.ts` — projects, experience, services, certifications, skills. Single source for the nav overlay and the outro service list.

## Develop

```bash
npm install
npm run dev        # http://localhost:5179
npm run lint
npm run build
```

Append `?nolenis` to the dev URL to disable smooth scroll when driving the page programmatically (tests, screenshots). Dev-only bisect switches: `?noenv`, `?noshadow`, `?nosmaa`, `?noao`, `?novol`.

Reduced-motion users get native scroll, no scrub smoothing, and panels that fade instead of stagger. Touch devices skip Lenis and the magnetic button, and run fewer particles at a lower device pixel ratio cap.

## Optional asset generator

`scripts/generate-assets.ts` (Imagen via `@google/genai`) is kept as a standalone tool for OG images and textures. It needs `GEMINI_API_KEY` and is not part of the build.
