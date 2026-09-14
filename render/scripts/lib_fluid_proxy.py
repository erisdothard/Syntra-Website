"""Proxy scene for fluid development: stand-ins for the pad, vehicle and cameras.

Run:  python3 render/scripts/run_blender.py render/scripts/lib_fluid_proxy.py
Writes render/cache/fluid_proxy.blend. Everything here mirrors SPEC.md coordinates:
metres, Z up, pad concrete z = 0, ML deck at 13 m, F-1 exit plane at z = 13.3,
trench 41 x 69 m along Y. The vehicle carries an Empty `PLUME_ORIGIN` at the
engine-cluster exit plane; add_fluids.py attaches everything to that.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib_timeline as tl  # noqa: E402
import lib_anim as la  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..'))
OUT_BLEND = os.path.join(ROOT, 'cache', 'fluid_proxy.blend')

VEHICLE_RADIUS = 5.03
VEHICLE_TOP_Z = 124.0
TRENCH_W, TRENCH_L, TRENCH_H = 41.0, 69.0, 13.0
DECK_HOLE = 14.0


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, tl.FRAME_COUNT
    scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
    scene.render.fps = 24
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    return scene


def flat_material(name, rgb, rough=0.7, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    return mat


def box(name, size, loc, mat, coll):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = size
    ob.data.materials.append(mat)
    for c in ob.users_collection:
        c.objects.unlink(ob)
    coll.objects.link(ob)
    return ob


def build_pad(coll):
    concrete = flat_material('PROXY_concrete', (0.42, 0.40, 0.37), 0.85)
    steel = flat_material('PROXY_steel', (0.30, 0.30, 0.32), 0.5, 0.6)
    # Ground: 1200 m square at z = 0 (also the trench floor).
    box('PROXY_floor', (1200, 1200, 0.5), (0, 0, -0.25), concrete, coll)
    # Deflector: a wedge under the exit plane splitting the flow along +-Y.
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=12, radius2=0.5, depth=6.5, location=(0, 0, 3.25))
    defl = bpy.context.object
    defl.name = 'PROXY_deflector'
    defl.rotation_euler = (0, 0, math.radians(45))
    defl.scale = (1.0, 1.6, 1.0)
    defl.data.materials.append(concrete)
    for c in defl.users_collection:
        c.objects.unlink(defl)
    coll.objects.link(defl)
    # Mobile Launcher base: 49 x 41 x 7.6 m box on six pedestals, deck top at 14.3 m,
    # 14 m exhaust hole. The "trench" is the open bay under it along +-Y.
    h = DECK_HOLE / 2
    zc = 6.7 + 7.6 / 2
    box('PROXY_ml_E', ((49 - DECK_HOLE) / 2, 41, 7.6), (h + (49 - DECK_HOLE) / 4, 0, zc), steel, coll)
    box('PROXY_ml_W', ((49 - DECK_HOLE) / 2, 41, 7.6), (-(h + (49 - DECK_HOLE) / 4), 0, zc), steel, coll)
    box('PROXY_ml_N', (DECK_HOLE, (41 - DECK_HOLE) / 2, 7.6), (0, h + (41 - DECK_HOLE) / 4, zc), steel, coll)
    box('PROXY_ml_S', (DECK_HOLE, (41 - DECK_HOLE) / 2, 7.6), (0, -(h + (41 - DECK_HOLE) / 4), zc), steel, coll)
    for i, (px, py) in enumerate(((-21, -17), (21, -17), (-21, 17), (21, 17), (-21, 0), (21, 0))):
        box(f'PROXY_pedestal_{i}', (5, 5, 6.7), (px, py, 3.35), concrete, coll)
    box('PROXY_tower', (12, 12, 120), (28, 0, 14.3 + 60), steel, coll)


def build_vehicle(coll):
    paint = flat_material('PROXY_paint', (0.85, 0.85, 0.82), 0.4)
    length = VEHICLE_TOP_Z - tl.ENGINE_PLANE_Z
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=VEHICLE_RADIUS, depth=length,
                                        location=(0, 0, 0))
    veh = bpy.context.object
    veh.name = 'PROXY_vehicle'
    veh.data.materials.append(paint)
    # Origin at the exit plane so lift is a plain z translation.
    for v in veh.data.vertices:
        v.co.z += length / 2
    for c in veh.users_collection:
        c.objects.unlink(veh)
    coll.objects.link(veh)
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    origin = bpy.context.object
    origin.name = 'PLUME_ORIGIN'
    origin.empty_display_size = 5
    for c in origin.users_collection:
        c.objects.unlink(origin)
    coll.objects.link(origin)
    origin.parent = veh
    # Lift animation straight from the timeline port.
    for f in range(1, tl.FRAME_COUNT + 1):
        veh.location = (0, 0, tl.frame_state(f)['vehicle_z'])
        veh.keyframe_insert('location', frame=f)
    la.linearize(veh)
    return veh, origin


def add_camera(name, site_pos, look_z_site, coll):
    pos = Vector(tl.site_to_blender(*site_pos))
    target = Vector((0, 0, look_z_site * tl.SITE_UNIT))
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = 35
    cam_data.sensor_width = 36
    cam_data.clip_end = 5000
    cam = bpy.data.objects.new(name, cam_data)
    coll.objects.link(cam)
    cam.location = pos
    cam.rotation_euler = (target - pos).to_track_quat('-Z', 'Y').to_euler()
    return cam


def add_lights(coll):
    # Four xenon floods off the pad perimeter, aimed at the vehicle.
    for i, (x, y) in enumerate(((-120, -90), (120, -90), (-120, 90), (120, 90))):
        ld = bpy.data.lights.new(f'PROXY_flood_{i}', 'SPOT')
        ld.energy = 2.0e5
        ld.color = (0.85, 0.9, 1.0)
        ld.spot_size = math.radians(30)
        ld.spot_blend = 0.4
        ld.shadow_soft_size = 2
        lo = bpy.data.objects.new(ld.name, ld)
        coll.objects.link(lo)
        lo.location = (x, y, 30)
        lo.rotation_euler = (Vector((0, 0, 60)) - Vector(lo.location)).to_track_quat('-Z', 'Y').to_euler()


def build():
    scene = reset_scene()
    coll = bpy.data.collections.new('PROXY')
    scene.collection.children.link(coll)
    build_pad(coll)
    build_vehicle(coll)
    cam2 = add_camera('CAM_ACT2', (-12, 9.5, 33), 10, coll)
    add_camera('CAM_ACT1', (-6.5, 3.4, 12.5), 3.6, coll)
    scene.camera = cam2
    add_lights(coll)
    world = bpy.data.worlds.new('PROXY_world')
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (0.003, 0.004, 0.008, 1)
    bg.inputs['Strength'].default_value = 1.0
    scene.world = world
    scene.render.engine = 'CYCLES'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Punchy'
    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
    print('PROXY saved', OUT_BLEND)


if __name__ == '__main__':
    build()
