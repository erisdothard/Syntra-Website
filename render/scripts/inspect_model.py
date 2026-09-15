"""Inspect a GLB: hierarchy, dimensions, materials, textures; render a lit still.
    python3 render/scripts/run_blender.py render/scripts/inspect_model.py -- --glb PATH --out DIR
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from lib_render import script_args, enable_metal

a = script_args(); o = {"glb": None, "out": "render/out/model_inspect"}
for i in range(0, len(a) - 1, 2): o[a[i].lstrip("-")] = a[i + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=o["glb"])
meshes = [ob for ob in bpy.data.objects if ob.type == "MESH"]
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3); faces = 0
for ob in meshes:
    faces += len(ob.data.polygons)
    for c in ob.bound_box:
        w = ob.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
print(f"[inspect] meshes={len(meshes)} faces={faces} bbox min={tuple(round(v,2) for v in lo)} max={tuple(round(v,2) for v in hi)} size={tuple(round(v,2) for v in (hi-lo))}")
for ob in meshes[:60]:
    print(f"[mesh] {ob.name:40s} faces={len(ob.data.polygons):7d} mats={[m.name for m in ob.data.materials if m]}")
for m in bpy.data.materials:
    imgs = [n.image.name for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image] if m.node_tree else []
    print(f"[mat] {m.name:40s} images={imgs}")
for img in bpy.data.images: print(f"[img] {img.name} {img.size[0]}x{img.size[1]}")
# quick lit still: camera framing the whole model from the front-left, HDRI world
sc = bpy.context.scene; enable_metal()
sc.render.engine = "CYCLES"; sc.cycles.samples = 64; sc.render.resolution_x = 1600; sc.render.resolution_y = 1000
sc.cycles.use_denoising = True
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
env = w.node_tree.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.abspath("render/assets/hdri/kloppenheim_02_4k.hdr"))
bg = w.node_tree.nodes["Background"]; w.node_tree.links.new(env.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 3.0
size = hi - lo; c = (hi + lo) / 2; d = max(size) * 1.4
cam = bpy.data.objects.new("CAM", bpy.data.cameras.new("C")); sc.collection.objects.link(cam); sc.camera = cam
up = 2 if size.z >= size.y else 1  # detect up axis
cam.location = c + Vector((-d * 0.7, -d * 0.9, d * 0.35)) if up == 2 else c + Vector((-d * 0.7, d * 0.35, d * 0.9))
tt = cam.constraints.new("TRACK_TO"); e = bpy.data.objects.new("T", None); sc.collection.objects.link(e); e.location = c; tt.target = e
key = bpy.data.objects.new("KEY", bpy.data.lights.new("K", "SUN")); sc.collection.objects.link(key); key.data.energy = 3
key.rotation_euler = (0.9, 0.2, 0.8)
os.makedirs(o["out"], exist_ok=True); sc.render.filepath = os.path.join(o["out"], "inspect.png"); bpy.ops.render.render(write_still=True)
print("[inspect] rendered", sc.render.filepath)
