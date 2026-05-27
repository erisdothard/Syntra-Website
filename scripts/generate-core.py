"""
Blender headless script — generates a crystalline engine core GLB.

The model is a faceted icosphere with separated faces (loose parts),
so each triangle shard can be individually animated in R3F for the
construct/deconstruct scroll effect.

Run: blender --background --python scripts/generate-core.py
"""

import bpy
import bmesh
import math
import os

# ─── Clean scene ───
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in bpy.data.collections:
    if c.name != 'Scene Collection':
        bpy.data.collections.remove(c)

# ─── Create base icosphere ───
bpy.ops.mesh.primitive_ico_sphere_add(
    subdivisions=3,
    radius=1.0,
    location=(0, 0, 0)
)
core = bpy.context.active_object
core.name = "CoreShell"

# ─── Edit mode: split every face into a separate loose piece ───
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(core.data)

# Select all
for f in bm.faces:
    f.select = True

# Split edges so each face becomes its own island
bpy.ops.mesh.split()

# Slightly shrink each face inward to create gaps between shards
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.transform.shrink_fatten(value=-0.015)

bmesh.update_edit_mesh(core.data)
bpy.ops.object.mode_set(mode='OBJECT')

# ─── Separate each loose part into its own object ───
bpy.ops.object.select_all(action='DESELECT')
core.select_set(True)
bpy.context.view_layer.objects.active = core
bpy.ops.mesh.separate(type='LOOSE')

# ─── Create metallic green-tinted material ───
mat = bpy.data.materials.new(name="CoreMetal")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links

# Clear default nodes
for n in nodes:
    nodes.remove(n)

# Principled BSDF
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.location = (0, 0)
bsdf.inputs['Base Color'].default_value = (0.08, 0.12, 0.10, 1.0)  # Dark with green tint
bsdf.inputs['Metallic'].default_value = 0.9
bsdf.inputs['Roughness'].default_value = 0.25
bsdf.inputs['Emission Color'].default_value = (0.0, 0.714, 0.478, 1.0)  # #00b67a
bsdf.inputs['Emission Strength'].default_value = 0.3

# Output
output = nodes.new('ShaderNodeOutputMaterial')
output.location = (300, 0)
links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

# ─── Create inner glow core (smaller sphere) ───
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=0.35,
    segments=32,
    ring_count=16,
    location=(0, 0, 0)
)
inner = bpy.context.active_object
inner.name = "InnerCore"

mat_glow = bpy.data.materials.new(name="CoreGlow")
mat_glow.use_nodes = True
glow_nodes = mat_glow.node_tree.nodes
glow_links = mat_glow.node_tree.links

for n in glow_nodes:
    glow_nodes.remove(n)

glow_bsdf = glow_nodes.new('ShaderNodeBsdfPrincipled')
glow_bsdf.location = (0, 0)
glow_bsdf.inputs['Base Color'].default_value = (0.0, 0.714, 0.478, 1.0)
glow_bsdf.inputs['Metallic'].default_value = 0.0
glow_bsdf.inputs['Roughness'].default_value = 0.1
glow_bsdf.inputs['Emission Color'].default_value = (0.0, 0.714, 0.478, 1.0)
glow_bsdf.inputs['Emission Strength'].default_value = 5.0

glow_output = glow_nodes.new('ShaderNodeOutputMaterial')
glow_output.location = (300, 0)
glow_links.new(glow_bsdf.outputs['BSDF'], glow_output.inputs['Surface'])

inner.data.materials.append(mat_glow)

# ─── Apply metal material to all shard objects ───
for obj in bpy.data.objects:
    if obj.name.startswith("CoreShell"):
        if len(obj.data.materials) == 0:
            obj.data.materials.append(mat)
        else:
            obj.data.materials[0] = mat
        # Store original position as custom property (for R3F to read)
        obj.data.update()

# ─── Add orbital ring ───
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.6,
    minor_radius=0.015,
    major_segments=64,
    minor_segments=8,
    location=(0, 0, 0),
    rotation=(math.radians(70), 0, math.radians(15))
)
ring1 = bpy.context.active_object
ring1.name = "OrbitalRing1"

mat_ring = bpy.data.materials.new(name="RingMetal")
mat_ring.use_nodes = True
ring_nodes = mat_ring.node_tree.nodes
ring_links = mat_ring.node_tree.links

for n in ring_nodes:
    ring_nodes.remove(n)

ring_bsdf = ring_nodes.new('ShaderNodeBsdfPrincipled')
ring_bsdf.location = (0, 0)
ring_bsdf.inputs['Base Color'].default_value = (0.0, 0.714, 0.478, 1.0)
ring_bsdf.inputs['Metallic'].default_value = 0.95
ring_bsdf.inputs['Roughness'].default_value = 0.15
ring_bsdf.inputs['Emission Color'].default_value = (0.0, 0.714, 0.478, 1.0)
ring_bsdf.inputs['Emission Strength'].default_value = 1.0

ring_output = ring_nodes.new('ShaderNodeOutputMaterial')
ring_output.location = (300, 0)
ring_links.new(ring_bsdf.outputs['BSDF'], ring_output.inputs['Surface'])

ring1.data.materials.append(mat_ring)

# Second ring at different angle
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.8,
    minor_radius=0.01,
    major_segments=64,
    minor_segments=8,
    location=(0, 0, 0),
    rotation=(math.radians(30), math.radians(45), 0)
)
ring2 = bpy.context.active_object
ring2.name = "OrbitalRing2"
ring2.data.materials.append(mat_ring)

# ─── Export ───
output_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public",
    "crystal-core.glb"
)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
    export_normals=True,
    export_extras=True,
)

print(f"\n✅ Exported to: {output_path}")
print(f"   Objects: {len(bpy.data.objects)}")
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        print(f"   - {obj.name}: {len(obj.data.polygons)} faces")
