"""Attach the Mantaflow pad cloud (and LOX vent) to a .blend, SMOKE ONLY.

    python3 render/scripts/run_blender.py --blend render/cache/launch.blend \
        render/scripts/add_fluids.py -- [--res 160] [--vent-res 80] [--fresh-sim]

Default behaviour: append the already-BAKED sim objects (domains, inflows, vents,
effector, smoke materials) from the bake source render/cache/fluid_proxy.blend, so
the target file reads render/cache/fluids/{pad,vent} (absolute path, OpenVDB)
without re-baking. --fresh-sim builds unbaked sim objects instead (then run
bake_fluids.py). Everything lives in the FLUIDS collection; only FLUID_* objects
are replaced on rerun, so plume objects other agents put there are untouched.
Scene contract: pad concrete z = 0, trench centred on world (0, 0) along Y; an
Empty PLUME_ORIGIN (exit plane, z = 13.3 at frame 1) is used for the vent height
if present. The file is saved in place.
"""
import os
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib_timeline as tl  # noqa: E402
import lib_anim as la  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..'))
CACHE_ROOT = os.path.join(ROOT, 'cache', 'fluids')
BAKE_SOURCE = os.path.join(ROOT, 'cache', 'fluid_proxy.blend')

TRENCH_HALF_LEN = 34.5       # 69 m trench along Y
SIM_OBJECTS = ['FLUID_DOMAIN_PAD', 'FLUID_INFLOW_N', 'FLUID_INFLOW_S', 'FLUID_EFFECTOR_ML',
               'FLUID_DOMAIN_VENT', 'FLUID_VENT_E', 'FLUID_VENT_W']
PAD_DENSITY, PAD_COLOR = 0.35, (0.78, 0.72, 0.64)
PAD_FADE_Y = (-165.0, -120.0)     # cloud density -> 0 toward the act-2 lens (y ~ -202)
PAD_FADE_Z = (60.0, 120.0)        # cloud density -> 0 with height: broad and low, vehicle clear above
PAD_REMAP = (0.20, 0.75)          # sim density -> opaque front, no beige wall inside the frame
VENT_DENSITY, VENT_COLOR = 1.2, (0.84, 0.88, 0.95)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--res', type=int, default=160)
    ap.add_argument('--vent-res', type=int, default=80)
    ap.add_argument('--cache', default=CACHE_ROOT)
    ap.add_argument('--time-scale', type=float, default=4.0)
    ap.add_argument('--noise', type=int, default=0, help='Mantaflow noise upres factor (0 = off)')
    ap.add_argument('--fresh-sim', action='store_true', help='build unbaked sim objects instead of appending the baked ones')
    ap.add_argument('--source', default=BAKE_SOURCE, help='.blend holding the baked FLUID_* objects')
    return ap.parse_args(argv)


def smooth(a, b, x):
    return tl.smoothstep(a, b, x)


# ----------------------------------------------------------------------------- objects

def new_object(name, data, coll):
    old = bpy.data.objects.get(name)
    if old is not None:
        bpy.data.objects.remove(old, do_unlink=True)
    ob = bpy.data.objects.new(name, data)
    coll.objects.link(ob)
    return ob


def box_object(name, size, loc, coll):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(me)
    bm.free()
    ob = new_object(name, me, coll)
    ob.scale = size
    ob.location = loc
    return ob


def sphere_object(name, radius, loc, coll):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=radius)
    bm.to_mesh(me)
    bm.free()
    ob = new_object(name, me, coll)
    ob.location = loc
    return ob


# ----------------------------------------------------------------------------- sim setup

def setup_domain(ob, res, cache_dir, frames, time_scale, noise, big):
    mod = ob.modifiers.new('Fluid', 'FLUID')
    mod.fluid_type = 'DOMAIN'
    ds = mod.domain_settings
    ds.domain_type = 'GAS'
    ds.resolution_max = res
    ds.use_adaptive_domain = True
    ds.adapt_margin = 6
    ds.adapt_threshold = 0.004
    ds.use_dissolve_smoke = False
    ds.vorticity = 0.45 if big else 0.2
    ds.alpha = 0.6 if big else 1.2
    ds.beta = 0.28 if big else 0.6
    ds.time_scale = time_scale
    ds.cfl_condition = 3.0
    ds.use_adaptive_timesteps = True
    ds.timesteps_min = 1
    ds.timesteps_max = 8
    for side in ('front', 'back', 'left', 'right', 'top'):
        setattr(ds, f'use_collision_border_{side}', False)
    ds.use_collision_border_bottom = bool(big)
    ds.cache_type = 'ALL'
    ds.cache_data_format = 'OPENVDB'
    try:
        ds.openvdb_data_depth = '16'
    except TypeError:
        pass
    try:
        ds.openvdb_cache_compress_type = 'ZIP'
    except TypeError:
        pass
    ds.cache_directory = cache_dir
    ds.cache_frame_start, ds.cache_frame_end = frames
    ds.clipping = 1e-4
    ds.use_noise = noise > 0
    if noise > 0:
        ds.noise_scale = noise
        ds.noise_strength = 1.0
    return ds


def setup_inflow(ob, color, temperature=1.0):
    mod = ob.modifiers.new('Fluid', 'FLUID')
    mod.fluid_type = 'FLOW'
    fs = mod.flow_settings
    fs.flow_type = 'SMOKE'
    fs.flow_behavior = 'INFLOW'
    fs.use_inflow = True
    fs.density = 0.0
    fs.temperature = temperature
    fs.smoke_color = color
    fs.use_initial_velocity = True
    fs.velocity_normal = 0.0
    fs.surface_distance = 1.5
    fs.subframes = 2
    ob.hide_render = True
    ob.display_type = 'WIRE'
    return fs


def setup_effector(ob):
    mod = ob.modifiers.new('Fluid', 'FLUID')
    mod.fluid_type = 'EFFECTOR'
    es = mod.effector_settings
    es.effector_type = 'COLLISION'
    es.use_effector = True
    es.surface_distance = 1.0
    ob.hide_render = True
    ob.display_type = 'WIRE'


def smoke_material(name, color, density, aniso, fade_y=None, fade_z=None, remap=(0.10, 0.75)):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    pv = nt.nodes.new('ShaderNodeVolumePrincipled')
    pv.name = 'SMOKE'
    pv.inputs['Color'].default_value = (*color, 1)
    pv.inputs['Absorption Color'].default_value = (0, 0, 0, 1)
    pv.inputs['Anisotropy'].default_value = aniso
    pv.inputs['Blackbody Intensity'].default_value = 0.0
    # Density remap: the sim fills the domain with thin haze that reads as fog and
    # blocks the plume over 100 m; only the billows (sim density > ~0.1) are opaque.
    pv.inputs['Density Attribute'].default_value = ''
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'density'
    rm = nt.nodes.new('ShaderNodeMapRange')
    rm.name = 'DENSITY_REMAP'
    rm.interpolation_type = 'SMOOTHSTEP'
    rm.clamp = True
    rm.inputs['From Min'].default_value, rm.inputs['From Max'].default_value = remap
    rm.inputs['To Max'].default_value = density
    nt.links.new(attr.outputs['Fac'], rm.inputs['Value'])
    dens = rm.outputs['Result']
    if fade_y is not None:
        # Keep the act-2 camera (y = -152) out of the opaque cloud: fade density
        # toward -Y so the front rolls up to the lens but never swallows it.
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.name = 'CAMERA_FADE'
        mr.interpolation_type = 'SMOOTHSTEP'
        mr.clamp = True
        mr.inputs['From Min'].default_value, mr.inputs['From Max'].default_value = fade_y
        mul = nt.nodes.new('ShaderNodeMath')
        mul.operation = 'MULTIPLY'
        nt.links.new(geo.outputs['Position'], sep.inputs[0])
        nt.links.new(sep.outputs['Y'], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], mul.inputs[0])
        nt.links.new(dens, mul.inputs[1])
        dens = mul.outputs[0]
    if fade_z is not None:
        # Height fade: density x smoothstep(fade_z[1] -> fade_z[0], z) keeps the
        # cloud low like S72-55070; the vehicle stands clear above it.
        geo_z = nt.nodes.new('ShaderNodeNewGeometry')
        sep_z = nt.nodes.new('ShaderNodeSeparateXYZ')
        mz = nt.nodes.new('ShaderNodeMapRange')
        mz.name = 'HEIGHT_FADE'
        mz.interpolation_type = 'SMOOTHSTEP'
        mz.clamp = True
        mz.inputs['From Min'].default_value, mz.inputs['From Max'].default_value = fade_z
        mz.inputs['To Min'].default_value, mz.inputs['To Max'].default_value = 1.0, 0.0
        mul_z = nt.nodes.new('ShaderNodeMath')
        mul_z.operation = 'MULTIPLY'
        nt.links.new(geo_z.outputs['Position'], sep_z.inputs[0])
        nt.links.new(sep_z.outputs['Z'], mz.inputs['Value'])
        nt.links.new(mz.outputs['Result'], mul_z.inputs[0])
        nt.links.new(dens, mul_z.inputs[1])
        dens = mul_z.outputs[0]
    # Domain-edge falloff: the cache stops hard at the simulation box and the cut
    # reads as a scalloped edge on the far side of the cloud. Object coordinates
    # of the domain run -0.5..0.5 per axis; fade 1 -> 0 from 70 % to 98 % of the
    # half-extent on all six faces.
    geo_e = nt.nodes.new('ShaderNodeTexCoord')
    sep_e = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo_e.outputs['Object'], sep_e.inputs[0])
    edge = None
    for axis in ('X', 'Y', 'Z'):
        ab = nt.nodes.new('ShaderNodeMath')
        ab.operation = 'ABSOLUTE'
        nt.links.new(sep_e.outputs[axis], ab.inputs[0])
        me = nt.nodes.new('ShaderNodeMapRange')
        me.name = f'EDGE_FADE_{axis}'
        me.interpolation_type = 'SMOOTHSTEP'
        me.clamp = True
        me.inputs['From Min'].default_value, me.inputs['From Max'].default_value = 0.35, 0.49
        me.inputs['To Min'].default_value, me.inputs['To Max'].default_value = 1.0, 0.0
        nt.links.new(ab.outputs[0], me.inputs['Value'])
        if edge is None:
            edge = me.outputs['Result']
        else:
            mm = nt.nodes.new('ShaderNodeMath')
            mm.operation = 'MULTIPLY'
            nt.links.new(edge, mm.inputs[0])
            nt.links.new(me.outputs['Result'], mm.inputs[1])
            edge = mm.outputs[0]
    mul_e = nt.nodes.new('ShaderNodeMath')
    mul_e.operation = 'MULTIPLY'
    nt.links.new(dens, mul_e.inputs[0])
    nt.links.new(edge, mul_e.inputs[1])
    dens = mul_e.outputs[0]
    nt.links.new(dens, pv.inputs['Density'])
    nt.links.new(pv.outputs['Volume'], out.inputs['Volume'])
    mat.cycles.volume_step_rate = 1.0
    return mat


# ----------------------------------------------------------------------------- build

def clear_sim_objects(scene):
    coll = la.get_or_make_collection(scene, 'FLUIDS')
    for ob in list(bpy.data.objects):
        if ob.name.startswith('FLUID_'):
            bpy.data.objects.remove(ob, do_unlink=True)
    return coll


def append_baked(coll, source):
    """Append the baked FLUID_* objects (with their cache flags) from the bake source."""
    if not os.path.exists(source) or os.path.abspath(source) == os.path.abspath(bpy.data.filepath):
        return False
    with bpy.data.libraries.load(source, link=False) as (data_from, data_to):
        names = [n for n in SIM_OBJECTS if n in data_from.objects]
        data_to.objects = names
    if not names:
        return False
    for ob in data_to.objects:
        if ob is None:
            continue
        coll.objects.link(ob)
    for ob in coll.objects:
        if ob.name.startswith('FLUID_DOMAIN_'):
            ds = ob.modifiers['Fluid'].domain_settings
            print(f'  appended {ob.name}: res {ds.resolution_max}, baked {ds.has_cache_baked_data}, cache {ds.cache_directory}')
    return True


def build_fresh(coll, args, base):
    os.makedirs(args.cache, exist_ok=True)
    dom = box_object('FLUID_DOMAIN_PAD', (360, 360, 160), (base.x, base.y, 80), coll)
    setup_domain(dom, args.res, os.path.join(args.cache, 'pad'), (80, tl.FRAME_COUNT), args.time_scale, args.noise, big=True)
    for sgn, tag in ((1, 'N'), (-1, 'S')):
        inf = box_object(f'FLUID_INFLOW_{tag}', (30, 8, 10), (base.x, base.y + sgn * (TRENCH_HALF_LEN + 5), 6), coll)
        setup_inflow(inf, (0.80, 0.74, 0.66), temperature=1.2)
    setup_effector(box_object('FLUID_EFFECTOR_ML', (50, 50, 13), (base.x, base.y, 6.5), coll))
    vdom = box_object('FLUID_DOMAIN_VENT', (44, 44, 60), (base.x, base.y, base.z + 8 + 30), coll)
    setup_domain(vdom, args.vent_res, os.path.join(args.cache, 'vent'), (10, 118), 2.0, 0, big=False)
    for sgn, tag in ((1, 'E'), (-1, 'W')):
        v = sphere_object(f'FLUID_VENT_{tag}', 1.2, (base.x + sgn * 5.6, base.y, base.z + 38.0), coll)
        setup_inflow(v, (0.85, 0.9, 0.97), temperature=-0.6)


def assign_materials():
    """(Re)build the cloud materials with the current defaults on both paths, so the
    look is owned by this script and not by whatever the bake source carried."""
    pad = smoke_material('SMOKE_PAD_MAT', PAD_COLOR, PAD_DENSITY, 0.35, fade_y=PAD_FADE_Y, fade_z=PAD_FADE_Z, remap=PAD_REMAP)
    vent = smoke_material('SMOKE_VENT_MAT', VENT_COLOR, VENT_DENSITY, 0.2)
    for name, mat in (('FLUID_DOMAIN_PAD', pad), ('FLUID_DOMAIN_VENT', vent)):
        ob = bpy.data.objects.get(name)
        if ob is None:
            continue
        ob.data.materials.clear()
        ob.data.materials.append(mat)


def key(target, path, value, frame):
    setattr(target, path, value)
    target.keyframe_insert(path, frame=frame)


def apply_keys():
    flows = {n: bpy.data.objects[n].modifiers['Fluid'].flow_settings
             for n in ('FLUID_INFLOW_N', 'FLUID_INFLOW_S', 'FLUID_VENT_E', 'FLUID_VENT_W') if n in bpy.data.objects}
    for f in range(1, tl.FRAME_COUNT + 1):
        s = tl.frame_state(f)
        ig, lift, vent = s['ignition'], s['lift'], s['vent']
        rate = ig * (1 - smooth(0.05, 0.35, lift))
        for tag, sgn in (('N', 1), ('S', -1)):
            fs = flows.get(f'FLUID_INFLOW_{tag}')
            if fs is None:
                continue
            vy = sgn * (15.0 if sgn > 0 else 19.0) * (0.35 + 0.65 * ig) * (0.5 + 0.5 * rate)
            key(fs, 'use_inflow', ig > 0.01, f)
            key(fs, 'density', 1.0 * rate, f)
            key(fs, 'temperature', 0.7 * rate + 0.15, f)
            key(fs, 'velocity_coord', (0.0, vy, 2.5 * rate), f)
        for tag, sgn in (('E', 1), ('W', -1)):
            fs = flows.get(f'FLUID_VENT_{tag}')
            if fs is None:
                continue
            key(fs, 'use_inflow', vent > 0.01, f)
            key(fs, 'density', 0.8 * vent, f)
            key(fs, 'velocity_coord', (sgn * 4.0, 0.0, -2.0), f)
    for ob in bpy.data.objects:
        if ob.name.startswith('FLUID_'):
            la.linearize(ob)


def build(args):
    scene = bpy.context.scene
    scene.frame_set(1)
    origin = bpy.data.objects.get('PLUME_ORIGIN')
    base = Vector((0.0, 0.0, tl.ENGINE_PLANE_Z))
    if origin is not None:
        base.z = origin.matrix_world.translation.z
    print(f'add_fluids: trench at (0, 0), exit plane z = {base.z:.1f}')
    coll = clear_sim_objects(scene)
    appended = False if args.fresh_sim else append_baked(coll, args.source)
    if appended:
        print('add_fluids: appended baked sim objects from', args.source)
    else:
        build_fresh(coll, args, base)
        print('add_fluids: built fresh (unbaked) sim objects; run bake_fluids.py')
    for ob in coll.objects:
        if ob.name.startswith('FLUID_DOMAIN_'):
            ds = ob.modifiers['Fluid'].domain_settings
            ds.cache_directory = os.path.join(args.cache, 'pad' if ob.name.endswith('_PAD') else 'vent')
    assign_materials()
    apply_keys()
    cyc = scene.cycles
    cyc.volume_bounces = max(cyc.volume_bounces, 1)
    cyc.volume_max_steps = max(cyc.volume_max_steps, 1024)
    scene.frame_set(1)
    bpy.ops.wm.save_mainfile()
    print('add_fluids: saved', bpy.data.filepath)


if __name__ == '__main__':
    build(parse_args())
