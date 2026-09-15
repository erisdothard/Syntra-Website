# Syntra launch scene — offline render spec

Goal: replace the live WebGL launch with a scroll-scrubbed image sequence rendered in
Blender Cycles. Target: a frame you would accept as a photograph of a Saturn V night
launch (Apollo 17, Pad 39A, 7 Dec 1972). Realism target ≥ 9/10 at the review gate.

## Frame contract (what the website consumes)

- `public/frames/desktop/manifest.json` → `{ "count": 240, "width": 1920, "height": 1080, "ext": "webp", "pad": 4 }`
- `public/frames/desktop/0001.webp … 0240.webp`, WebP quality 82, sRGB, no alpha.
- Frame `f` (1-based) corresponds to scroll progress `p = (f - 1) / (count - 1)` through `#launch`.
- Every phase boundary in `src/lib/launchTimeline.ts` (PHASES) is authoritative. Blender
  frame timing is derived from it, never the other way round.

## Timeline (240 frames)

| progress | frame | beat |
|---|---|---|
| 0.00–0.06 | 1–15 | Hero. Wide establishing shot, vehicle on the pad, floods on, LOX venting faintly. |
| 0.06–0.34 | 15–82 | Act 1. Camera dollies low and close to the F-1 bells. Vent plumes build to a peak at 0.28 then thin. Frost on the S-IC LOX band. |
| 0.34–0.66 | 82–158 | Act 2. Ignition 0.36→0.44 (frames 87–106). Hold-down release 0.46–0.58. Camera pulled back and low, watching the fireball fill the trench and the pad cloud roll out. |
| 0.66–1.00 | 158–240 | Act 3. Thrust to full by 0.76. Lift 0.70→0.97 (frames 169–233) with ease-in-cubic. Sky darkens to space from 0.78; by 0.97 the vehicle is against stars with the Earth limb below. |

## Coordinates (Blender)

- Metres, Z up. Real scale: Saturn V 110.6 m tall, 10.06 m S-IC diameter.
- Vehicle axis is the world Z axis. Pad concrete at z = 0. Mobile Launcher origin at
  z = 0 (its deck sits at ≈ 13 m). Engine exit plane (bottom of the F-1 bells) at
  z = 13.3 m when on the pad (= 2.9 site units). Flame trench runs along ±Y under the deck.
- Umbilical tower (LUT) on +X of the vehicle. Camera lives on the −Y/−X side.
- 1 site unit = 4.6 m. Site (x, y, z) → Blender (x·4.6, −z·4.6, y·4.6). This holds for
  the camera path, the look target (0, 0, look·4.6), and the lift (z = 13.3 + lift·95·4.6).
  Port mapProgress() from launchTimeline.ts exactly, including the `climb` term.

## Look references (render/assets/ref/)

- Apollo 17 night launch: the only Saturn V night launch. Plume is blinding white,
  every surface facing it is lit warm orange-white, pad cloud is lit from inside, sky
  goes black with a warm horizon glow. That is the target for acts 2–3.
- Apollo 11 pad photos for vehicle materials, frost band, tower detail, deck clutter.

## Non-negotiable realism cues

1. Real HDRI sky (kloppenheim_02 for the pad at night, stars visible) plus xenon
   floods as area lights: hard specular on the paint, long shadows on the deck.
2. Vehicle: PBR paint with micro-roughness variation, panel lines, rivets, the frost
   band on the LOX tank, black roll-pattern with slight sheen, decals.
3. Ground: real concrete texture, the crawlerway, the flame deflector, the trench, and
   a distant treeline/water silhouette. Height fog / aerial perspective.
4. Fire: volumetric. Blackbody emission, optically thick core, orange collar only near
   the bells, soot filaments downstream. The pad cloud is a real gas sim lit by the
   plume. No sprites, no shader cones.
5. Lens: 35 mm full-frame equivalent, f/4 depth of field in act 1, motion blur on lift,
   slight bloom, no chromatic aberration, subtle grain.
6. Nothing on screen that reads as UI: no shockwave rings, no glowing pad ring.

## Outputs

- `render/scripts/assemble.sh` → `render/cache/launch_final.blend` (build_scene → add_fluids → add_plume)
- `render/scripts/build_scene.py [-- --vehicle sketchfab|nasa]` → `render/cache/launch.blend` (pad, vehicle, lights, camera). Default vehicle: "Apollo | Saturn V Launch Vehicle" by devPilot, CC-BY-4.0 (render/assets/models/saturn-v-sketchfab.glb, exploded in the file, stacked by lib_vehicle_sf.py); the NASA model remains selectable.
- `render/scripts/add_fluids.py` → attaches the baked Mantaflow pad cloud + LOX vent (cache in `render/cache/fluids/`)
- `render/scripts/add_plume.py -- --blend IN --out OUT` → emissive plume core, fire lights, glare
- `python3 render/scripts/run_blender.py --timeout N --blend render/cache/launch_final.blend render/scripts/render.py -- --frames a:b --samples N --scale S --out DIR`
- `python3 render/scripts/run_blender.py --timeout N --blend render/cache/launch_final.blend render/scripts/preview.py` → six review frames (1, 54, 104, 121, 187, 228) at 50 %, 64 spp
- `node render/scripts/encode.mjs` → `public/frames/desktop/*.webp` + manifest.json (`npm run frames:encode`)

## Production settings (gate 3, 2026-09-13)

`bash render/scripts/render_all.sh 64 2 0.05` → 1920×1080, 64 spp adaptive (threshold
0.05), volume step rate 2, OIDN, AgX. Smoke domains do not cast shadows
(post_assemble.py) — small plume lights through the lumpy cloud otherwise mottle the
ground. Cost: ~40–60 s/frame at 50 % for cloud frames → 3–4 min at 100 %; whole run
≈ 8–11 h. Resumable: existing PNGs in render/out/final are skipped.

## Machine

MacBook Air M4, 8-core GPU, 16 GB. Cycles Metal. Keep sim resolution and render
samples inside that budget; denoise (OpenImageDenoise) is on.
