"""
Blender headless — Syntra emblem as thin concentric rings (bullseye).

Logo structure (viewed head-on = target/iris):
  - Outer ghost ring: thin, subtle green, r≈46
  - Green ring: main brand ring, thick stroke, r≈42
  - White ring: light/silver, r≈32
  - Dark ring: dark gray, r≈22
  - Void core: black sphere, r≈14
  - 3 orbiting dots

All tori are VERY thin (minor_radius ~0.02-0.04) so they read as
circles/strokes, not tubes. Lying flat in XY plane so the camera
looking down Z sees the bullseye.

Radii scaled to match SVG proportions (base 100 → scale to ~2.5 units).
"""

import bpy
import math
import os

# ─── Clean scene ───
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Scale factor: SVG viewBox is 100, we want ~2.5 unit radius max
S = 2.5 / 50.0  # = 0.05

def make_mat(name, base, emission, em_str=0, metal=0.8, rough=0.25):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for n in nodes:
        nodes.remove(n)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*base, 1.0)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    if em_str > 0:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = em_str
    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (300, 0)
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

# Materials
# Outer rings: darker green (#008f5d / rgb 0, 0.56, 0.365)
mat_ghost = make_mat("GhostRing", (0.0, 0.45, 0.29), (0.0, 0.56, 0.365), 0.6, 0.9, 0.15)
mat_green = make_mat("GreenRing", (0.0, 0.56, 0.365), (0.0, 0.56, 0.365), 1.0, 0.9, 0.2)
mat_white = make_mat("WhiteRing", (0.9, 0.9, 0.9), (0.9, 0.9, 0.9), 0.4, 0.7, 0.2)
mat_dark  = make_mat("DarkRing",  (0.165, 0.165, 0.165), (0.0, 0.56, 0.365), 0.15, 0.85, 0.3)
mat_dot_g = make_mat("DotGreen",  (0.0, 0.56, 0.365), (0.0, 0.56, 0.365), 8.0, 0.0, 0.0)
mat_dot_w = make_mat("DotWhite",  (0.9, 0.9, 0.9), (0.9, 0.9, 0.9), 6.0, 0.0, 0.0)

# Core sphere: proper 3D shading — dark base with Fresnel green edge
mat_core = bpy.data.materials.new(name="VoidCore")
mat_core.use_nodes = True
cn = mat_core.node_tree.nodes
cl = mat_core.node_tree.links
for n in cn:
    cn.remove(n)

# Dark base BSDF
base_bsdf = cn.new('ShaderNodeBsdfPrincipled')
base_bsdf.location = (-200, 200)
base_bsdf.inputs['Base Color'].default_value = (0.02, 0.025, 0.03, 1.0)
base_bsdf.inputs['Metallic'].default_value = 0.6
base_bsdf.inputs['Roughness'].default_value = 0.35
base_bsdf.inputs['Emission Color'].default_value = (0.0, 0.56, 0.365, 1.0)
base_bsdf.inputs['Emission Strength'].default_value = 0.5

# Green rim/edge BSDF (Fresnel-driven)
rim_bsdf = cn.new('ShaderNodeBsdfPrincipled')
rim_bsdf.location = (-200, -100)
rim_bsdf.inputs['Base Color'].default_value = (0.0, 0.56, 0.365, 1.0)
rim_bsdf.inputs['Metallic'].default_value = 0.0
rim_bsdf.inputs['Roughness'].default_value = 0.1
rim_bsdf.inputs['Emission Color'].default_value = (0.0, 0.714, 0.478, 1.0)
rim_bsdf.inputs['Emission Strength'].default_value = 4.0

# Fresnel for edge detection
fresnel = cn.new('ShaderNodeFresnel')
fresnel.location = (-400, 50)
fresnel.inputs['IOR'].default_value = 1.8

# Mix shader: dark center, green glowing edges
mix = cn.new('ShaderNodeMixShader')
mix.location = (100, 100)
cl.new(fresnel.outputs['Fac'], mix.inputs['Fac'])
cl.new(base_bsdf.outputs['BSDF'], mix.inputs[1])
cl.new(rim_bsdf.outputs['BSDF'], mix.inputs[2])

# Output
out = cn.new('ShaderNodeOutputMaterial')
out.location = (350, 100)
cl.new(mix.outputs['Shader'], out.inputs['Surface'])

# ─── Ring helper ───
def add_ring(name, major_r, minor_r, mat):
    """major_r in SVG units (0-50 from center), minor_r = stroke half-width in SVG units"""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_r * S,
        minor_radius=minor_r * S,
        major_segments=128,
        minor_segments=16,
        location=(0, 0, 0),
        rotation=(math.pi / 2, 0, 0)  # Lie flat so face = XY plane, viewed along Z
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

# SVG rings (from the SVG: cx=50,cy=50 so all centered):
# Ghost:  r=46, stroke-width=3   → major=46, minor≈1.5
# Green:  r=42, stroke-width=4   → major=42, minor≈2  (thinned to avoid Ghost overlap)
# White:  r=32, stroke-width=7   → major=32, minor≈3.5
# Dark:   r=22, stroke-width=6   → major=22, minor≈3

add_ring("RingGreen", 44, 2.5, mat_green)
add_ring("RingWhite", 32, 3.5, mat_white)
add_ring("RingDark",  22, 3.0, mat_dark)

# ─── Void core sphere: r=14 in SVG ───
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=14 * S,
    segments=48,
    ring_count=24,
    location=(0, 0, 0)
)
core = bpy.context.active_object
core.name = "VoidCore"
core.data.materials.append(mat_core)

# ─── Orbiting dots ───
dot_r = 46 * S  # orbit at ghost ring radius

for i, (angle, mat, sz) in enumerate([
    (0,   mat_dot_g, 1.5),
    (120, mat_dot_g, 1.5),
    (240, mat_dot_w, 1.2),
]):
    a = math.radians(angle)
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=sz * S,
        segments=16,
        ring_count=8,
        location=(math.cos(a) * dot_r, math.sin(a) * dot_r, 0)
    )
    dot = bpy.context.active_object
    dot.name = f"OrbDot{i+1}"
    dot.data.materials.append(mat)

# ─── Apply transforms ───
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# ─── Export ───
output_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public",
    "syntra-emblem-3d.glb"
)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
    export_normals=True,
)

print(f"\n✅ Exported: {output_path}")
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        print(f"   {obj.name}: {len(obj.data.polygons)} faces")
