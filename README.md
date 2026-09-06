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

All assets are procedural. There is nothing to download and nothing to generate.

| Layer | Depth | What it does |
| --- | --- | --- |
| `Sky` | far background | Full-screen shader: gradient, FBM cloud bank, ember tint on ignition, stars fade in with altitude. Explicit slow parallax on top of perspective. |
| `Gantry` | midground | Pad with a cut-out flame pit, launch mount, instanced lattice tower, umbilical arms that swing away on release, lightning masts and tank farm far behind. |
| `Rocket` | foreground | Body, nose, fins, five engine bells. Rumbles with pressure, lifts and pitches on Act 3. `Exhaust` is a child so the plume follows. |
| `Exhaust` | — | Additive shader plume with scrolling noise and shock diamonds, inner core, nozzle glow sprite, flame point light. Pushed above 1.0 so bloom treats it as HDR. |
| `Smoke` | — | One instanced billboard draw call, three populations: Act 1 side vents, Act 2 ember-lit ground cloud, Act 3 exhaust column. |
| `Shockwave` | — | Two expanding pressure rings across the pad at T-zero. |
| `PostFX` | — | Bloom ramp, chromatic aberration pulse on the shockwave, vignette, grain. Tone-mapping exposure spikes at ignition. |

### Dropping in real footage

The layer system is plain meshes. To use a 4K generated plate for any layer, render it to a textured plane in that layer's group and read `scrollState` for the frame index. The camera path and act boundaries do not need to change.

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

Append `?nolenis` to the dev URL to disable smooth scroll when driving the page programmatically (tests, screenshots).

Reduced-motion users get native scroll, no scrub smoothing, and panels that fade instead of stagger. Touch devices skip Lenis and the magnetic button, and run fewer particles at a lower device pixel ratio cap.

## Optional asset generator

`scripts/generate-assets.ts` (Imagen via `@google/genai`) is kept as a standalone tool for OG images and textures. It needs `GEMINI_API_KEY` and is not part of the build.
