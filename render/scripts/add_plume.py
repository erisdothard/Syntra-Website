"""Copy a scene .blend and add the emissive F-1 plume rig inside the FLUIDS collection.

    python3 render/scripts/run_blender.py --timeout 900 render/scripts/add_plume.py -- \
        --blend render/cache/launch.blend --out render/cache/launch_plume.blend \
        [--light-mw 6 --light2-mw 1.5 --no-flare]

Adds, all keyed to lib_timeline (ignition / thrust / lift / altitude per frame):
  PLUME_CORE    emissive column parented to PLUME_ORIGIN, pointing -Z
  PLUME_SHEATH  1.4x translucent shell, same parent
  PLUME_LOBE_N/S  flat fire pouring out of the +-Y trench ends while lift < 0.03
  PLUME_FLARE   ignition fire licking up through the deck hole around the bells
  PLUME_LIGHT_A/B  small point lights carrying the fire light (A: 25 m below the bells,
                 clamped up into the ML exhaust shaft on the pad; B: 60 m further down)
  PLUME_LIGHT_N/S(2)  trench-void + open-air lights at each trench end, following the lobes
  compositor    Render Layers -> Glare (Fog Glow) -> output
Everything is hidden (hide_render keyed) before frame 86.  Never touches src/ or IN.
"""
import argparse
import math
import os
import shutil
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib_timeline as tl  # noqa: E402
import lib_plume as lp  # noqa: E402

DEFLECTOR_Z = -7.0            # world z where the on-pad core terminates
TRENCH_HALF_LEN = 34.5        # +-Y trench ends
DECK_Z = 13.4
FIRST_FRAME = 86              # ignition starts at 87
MESH_LIGHTING = False
FAN_RADIUS = 45.0             # vacuum fan: added radius at altitude 1, reached 200 m downstream (cone, ~10 diameters wide)
CORE_VAC_LEN = 120.0          # clipped inner core length in vacuum (~1.1 vehicle lengths)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--blend", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--light-mw", type=float, default=8.0, help="PLUME_LIGHT_A power at full ignition, MW")
    ap.add_argument("--light2-mw", type=float, default=3.0, help="PLUME_LIGHT_B power, MW")
    ap.add_argument("--lobe-light-mw", type=float, default=5.0, help="PLUME_LIGHT_N/S (trench ends) power, MW")
    ap.add_argument("--ring-mw", type=float, default=5.0, help="in-flight ring lights (4, 14 m off-axis, 18 m below the bells), total MW")
    ap.add_argument("--core-gain", type=float, default=1.0)
    ap.add_argument("--no-flare", action="store_true")
    ap.add_argument("--mesh-lighting", action="store_true", help="let the emissive meshes light the scene (slow with smoke)")
    ap.add_argument("--no-lights-scatter", action="store_true", help="fire lights do not scatter in any volume")
    ap.add_argument("--fog-scatter", action="store_true", help="let the fire lights also scatter in FOG_VOLUME (washes the frame)")
    ap.add_argument("--bloom-size", type=float, default=0.7)
    ap.add_argument("--bloom-strength", type=float, default=0.25)
    ap.add_argument("--bloom-threshold", type=float, default=4.0)
    return ap.parse_args(argv)


def new_object(name, data, coll):
    old = bpy.data.objects.get(name)
    if old is not None:
        bpy.data.objects.remove(old, do_unlink=True)
    ob = bpy.data.objects.new(name, data)
    coll.objects.link(ob)
    ob.cycles.use_deform_motion = False      # GN topology changes per frame
    if not MESH_LIGHTING:
        # Camera-only: with ~1e5 emissive triangles per column, letting the smoke
        # sample them as lights made a frame 25x slower (and OOM-aborted at 50 %).
        # The PLUME_LIGHT_* point lights carry the fire light instead.
        for attr in ("visible_diffuse", "visible_glossy", "visible_transmission",
                     "visible_volume_scatter", "visible_shadow"):
            setattr(ob, attr, False)
    return ob


def key(ob, path, frame, value=None, index=-1):
    if value is not None:
        if index >= 0:
            getattr(ob, path)[index] = value
        else:
            setattr(ob, path, value)
    ob.keyframe_insert(path, index=index, frame=frame)


def key_hidden(ob):
    ob.hide_render = True
    ob.hide_viewport = True
    ob.keyframe_insert("hide_render", frame=1)
    ob.keyframe_insert("hide_viewport", frame=1)
    ob.hide_render = False
    ob.hide_viewport = False
    ob.keyframe_insert("hide_render", frame=FIRST_FRAME)
    ob.keyframe_insert("hide_viewport", frame=FIRST_FRAME)


def per_frame_state(f):
    s = tl.frame_state(f)
    oz = s["vehicle_z"]
    ig, thrust, lift, alt = s["ignition"], s["thrust"], s["lift"], s["altitude"]
    free_len = 60.0 + thrust * 120.0 + alt * 140.0      # 320 m in vacuum, ramps with altitude
    pad_len = oz - DEFLECTOR_Z
    length = min(free_len, pad_len) * min(1.0, ig * 1.6)
    vac = tl.smoothstep(0.3, 0.7, alt)
    fan = FAN_RADIUS * tl.smoothstep(0.3, 1.0, alt)      # metres added to the envelope radius
    flight = tl.smoothstep(0.03, 0.10, lift)        # airborne: ring lights on, A boosted; pad frames untouched
    lobe = (ig ** 1.5) * (1.0 - tl.smoothstep(0.03, 0.10, lift))
    # Ignition fireball above the deck: up with ignition, gone once hold-down release starts.
    flare = tl.smoothstep(0.15, 0.7, ig) * (1.0 - tl.smoothstep(0.45, 0.50, s["progress"]))
    return dict(frame=f, oz=oz, ig=ig, alt=alt, length=length, lobe=lobe, flare=flare, vac=vac, flight=flight, fan=fan)


def build_column(name, coll, parent, group, mat, stations, mod_vals):
    ob = new_object(name, lp.tube_mesh(name, stations), coll)
    ob.data.materials.append(mat)
    ob.parent = parent
    mod, ids = lp.add_shape_modifier(ob, group, **mod_vals)
    key_hidden(ob)
    return ob, mod, ids


def key_column(ob, mod, ids, fire, states, len_of, ig_of, expand_of=None, vac_of=None):
    for s in states:
        f = s["frame"]
        if vac_of is not None:
            fire.inputs["Vac"].default_value = vac_of(s)
            fire.inputs["Vac"].keyframe_insert("default_value", frame=f)
        mod[ids["W"]] = float(f)
        mod.keyframe_insert(f'["{ids["W"]}"]', frame=f)
        mod[ids["Cut"]] = len_of(s) + 3.0
        mod.keyframe_insert(f'["{ids["Cut"]}"]', frame=f)
        if expand_of is not None:
            mod[ids["Expand"]] = expand_of(s)
            mod.keyframe_insert(f'["{ids["Expand"]}"]', frame=f)
        fire.inputs["Len"].default_value = len_of(s)
        fire.inputs["Len"].keyframe_insert("default_value", frame=f)
        fire.inputs["Ignition"].default_value = ig_of(s)
        fire.inputs["Ignition"].keyframe_insert("default_value", frame=f)
        fire.inputs["Time"].default_value = float(f)
        fire.inputs["Time"].keyframe_insert("default_value", frame=f)
    lp.set_linear(ob)
    lp.set_linear(fire.id_data)


def main():
    global MESH_LIGHTING
    a = parse_args()
    MESH_LIGHTING = a.mesh_lighting
    src, dst = os.path.abspath(a.blend), os.path.abspath(a.out)
    if src == dst:
        raise SystemExit("--out must differ from --blend (the source scene is never modified)")
    shutil.copyfile(src, dst)
    bpy.ops.wm.open_mainfile(filepath=dst)
    sc = bpy.context.scene
    coll = bpy.data.collections["FLUIDS"]
    origin = bpy.data.objects["PLUME_ORIGIN"]
    states = [per_frame_state(f) for f in range(1, tl.FRAME_COUNT + 1)]

    shape = lp.build_shape_group()
    fire = lp.build_fire_group()

    # 1. CORE envelope (goes translucent/diffuse in vacuum) + INNER core (0.4x, stays clipped white)
    core_mat = lp.make_fire_material("PLUME_CORE", fire, Gain=a.core_gain, Collar=1.0, Band=30.0,
                                     VacStrength=1.8, VacAlpha=0.07)
    core, cmod, cids = build_column("PLUME_CORE", coll, origin, shape, core_mat, lp.core_stations(step=2.0),
                                    dict(Amp=1.2, NoiseScale=0.11, Flow=4.0, Level=2))
    key_column(core, cmod, cids, core_mat.node_tree.nodes["FIRE"], states,
               lambda s: s["length"], lambda s: s["ig"], lambda s: s["fan"], lambda s: s["vac"])
    # Inner core: 0.6x the sea-level radius, NO altitude expansion, tail fading over ~200 m.
    in_mat = lp.make_fire_material("PLUME_INNER", fire, Gain=a.core_gain, Collar=1.0, Band=60.0, Decay=45.0,
                                   EdgeFade=0.3)
    inner, imod, iids = build_column("PLUME_INNER", coll, origin, shape, in_mat,
                                     lp.core_stations(scale=0.6, top=-2.0, step=4.0),
                                     dict(Amp=0.5, NoiseScale=0.14, Flow=5.0, Level=1, AmpGrow=0.02))
    key_column(inner, imod, iids, in_mat.node_tree.nodes["FIRE"], states,
               lambda s: s["length"] + s["vac"] * (min(CORE_VAC_LEN, s["length"]) - s["length"]), lambda s: s["ig"])

    # 2. SHEATH (1.4x radius, translucent; fainter still in vacuum)
    sh_mat = lp.make_fire_material("PLUME_SHEATH", fire, Gain=3.0 / 40.0, Collar=0.0, Band=30.0,
                                   Translucent=1.0, TempOffset=-1200.0, Holes=0.3, VacStrength=1.0, VacAlpha=0.02)
    sheath, smod, sids = build_column("PLUME_SHEATH", coll, origin, shape, sh_mat,
                                      lp.core_stations(scale=1.4, step=3.0),
                                      dict(Amp=1.3, NoiseScale=0.08, Flow=6.0, Level=1))
    key_column(sheath, smod, sids, sh_mat.node_tree.nodes["FIRE"], states,
               lambda s: s["length"] * 1.05, lambda s: s["ig"], lambda s: s["fan"], lambda s: s["vac"])

    # 3. TRENCH LOBES at the +-Y trench ends, tilted 10 deg up
    lobe_mat = lp.make_fire_material("PLUME_LOBE", fire, Gain=15.0 / 40.0, Collar=0.0, Band=15.0,
                                     White=10.0, Cool=30.0, Decay=11.0, TempOffset=-600.0, Holes=0.6, Trans=0.5,
                                     EdgeFade=1.0, TopFade=4.5)
    for tag, sign in (("N", 1.0), ("S", -1.0)):
        ob, mod, ids = build_column(f"PLUME_LOBE_{tag}", coll, None, shape, lobe_mat, lp.lobe_stations(),
                                    dict(Amp=2.5, NoiseScale=0.1, Flow=5.0, Level=2, AmpGrow=0.08))
        ob.location = (0.0, sign * TRENCH_HALF_LEN, 3.0)
        # local -Z -> +-Y tilted 10 deg up, local +Y -> up for both (TopFade needs it)
        ob.rotation_euler = (math.radians(100.0), 0.0, 0.0 if sign > 0 else math.pi)
        key_column(ob, mod, ids, lobe_mat.node_tree.nodes["FIRE"], states, lambda s: 40.0, lambda s: s["lobe"])

    # 3b. FLARE: ignition fire licking up through the deck hole around the bells
    if not a.no_flare:
        fl_mat = lp.make_fire_material("PLUME_FLARE", fire, Gain=1.0, Collar=0.0, Band=6.0,
                                       White=4.0, Cool=10.0, Decay=5.0, TempOffset=0.0, Holes=0.5, HoleBase=0.5)
        ob, mod, ids = build_column("PLUME_FLARE", coll, None, shape, fl_mat, lp.flare_stations(),
                                    dict(Amp=3.0, NoiseScale=0.2, Flow=-6.0, Level=1, AmpGrow=0.0))
        ob.location = (0.0, 0.0, DECK_Z)
        ob.rotation_euler = (math.pi, 0.0, 0.0)          # local -Z points up
        key_column(ob, mod, ids, fl_mat.node_tree.nodes["FIRE"], states, lambda s: 7.0, lambda s: s["flare"])

    # 4. LIGHTS, all radius 1.5 m and in clear air (radius 8-12 m lights intersecting the
    # deck/trench/ground produced half-occluded shadow rays = salt noise on the apron).
    # A/B ride with PLUME_ORIGIN: on the pad A is clamped up into the ML exhaust shaft
    # (world z 8, 4.7 m clearance) and B just above the deflector apex (world z 4).
    # N/S each split into a trench-void light (0, +-28, -6) and an open-air light above
    # the trench mouth (0, +-48, 7); they follow the lobes and light the cloud/tower.
    vs = not a.no_lights_scatter
    R = 1.5
    la = lp.point_light("PLUME_LIGHT_A", coll, origin, radius=R, kelvin=3400.0, volume_scatter=vs)
    lb = lp.point_light("PLUME_LIGHT_B", coll, origin, radius=R, kelvin=3000.0, volume_scatter=vs)
    lobe_lights = []
    for tag, sign in (("N", 1.0), ("S", -1.0)):
        l1 = lp.point_light(f"PLUME_LIGHT_{tag}", coll, None, radius=R, kelvin=3000.0, volume_scatter=vs)
        l1.location = (0.0, sign * 28.0, -6.0)
        l2 = lp.point_light(f"PLUME_LIGHT_{tag}2", coll, None, radius=R, kelvin=3000.0, volume_scatter=vs)
        l2.location = (0.0, sign * 48.0, 7.0)
        lobe_lights += [l1, l2]
    # In flight only: a ring of four small lights off-axis below the bells so the S-IC
    # base, sides and fins are lit warm from below (the real plume is an extended source).
    ring = []
    for i, (x, y) in enumerate(((14.0, 0.0), (-14.0, 0.0), (0.0, 14.0), (0.0, -14.0))):
        lr = lp.point_light(f"PLUME_LIGHT_R{i}", coll, origin, radius=R, kelvin=3400.0, volume_scatter=vs)
        lr.location = (x, y, -18.0)
        ring.append(lr)
    lights = [la, lb] + lobe_lights + ring
    for ob in lights:
        key_hidden(ob)
    for s in states:
        f = s["frame"]
        key(la, "location", f, max(-25.0, 8.0 - s["oz"]), index=2)
        key(lb, "location", f, max(-85.0, 4.0 - s["oz"]), index=2)
        key(la.data, "energy", f, s["ig"] * a.light_mw * (1.0 - 0.2 * s["flight"]) * 1e6)   # in flight x0.8
        for ob in ring:
            key(ob.data, "energy", f, s["ig"] * s["flight"] * a.ring_mw * 0.25e6)
        key(lb.data, "energy", f, s["ig"] * a.light2_mw * 1e6)
        for ob in lobe_lights:
            key(ob.data, "energy", f, s["lobe"] * a.lobe_light_mw * 0.5e6)
    for ob in lights:
        lp.set_linear(ob)
        lp.set_linear(ob.data)
    if vs and not a.fog_scatter:
        lp.link_lights_except(sc, lights, {"FOG_VOLUME"})

    # 5. COMPOSITOR bloom
    lp.add_bloom(sc, threshold=a.bloom_threshold, size=a.bloom_size, strength=a.bloom_strength)

    bpy.ops.wm.save_mainfile(filepath=dst)
    print(f"[add_plume] wrote {dst}: {[o.name for o in coll.objects]}")
    for f in (87, 95, 104, 121, 172, 200, 228):
        s = per_frame_state(f)
        print(f"[add_plume] f{f:03d} ig={s['ig']:.2f} len={s['length']:.1f} lobe={s['lobe']:.2f} "
              f"flare={s['flare']:.2f} alt={s['alt']:.2f} vac={s['vac']:.2f} oz={s['oz']:.1f}")


if __name__ == "__main__":
    main()
