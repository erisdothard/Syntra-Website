"""Emissive plume core meshes (the light source) for the F-1 plume.

The core is a closed, noise-displaced tube built in metres along local -Z from the
exit plane. All animation lives in the material (visible length, ignition, heat)
and in the Displace texture driver, so the geometry itself is static.
"""
import math

import bpy
import bmesh

CORE_GROUP = 'PLUME_CORE_EMIT'


def smooth(a, b, x):
    t = 0.0 if x < a else 1.0 if x > b else (x - a) / (b - a)
    return t * t * (3 - 2 * t)


def core_profile(d):
    """Radii (x, y) in metres at d metres below the bells: 5 m at the bells,
    7 m at 30 m, flaring to 20 m (40 m wide) by 300 m."""
    r = 5.0 + 2.0 * smooth(0, 30, d) + 13.0 * smooth(30, 300, d)
    return r, r


def lobe_profile(d):
    """Flat trench lobe: wide across the trench, short in height; local X = width,
    local Y = height (the lobe object is rotated so local -Z runs along +-Y)."""
    rx = 7.0 + 22.0 * smooth(0, 110, d)
    ry = 3.5 + 7.0 * smooth(0, 110, d)
    return rx, ry


def tube_mesh(name, length, profile, rings=64, segs=48):
    bm = bmesh.new()
    loops = []
    for i in range(rings + 1):
        d = length * i / rings
        rx, ry = profile(d)
        cap = 0.35 if i == rings else 1.0
        ring = [bm.verts.new((rx * cap * math.cos(2 * math.pi * j / segs),
                              ry * cap * math.sin(2 * math.pi * j / segs), -d))
                for j in range(segs)]
        loops.append(ring)
    for i in range(rings):
        for j in range(segs):
            bm.faces.new((loops[i][j], loops[i][(j + 1) % segs],
                          loops[i + 1][(j + 1) % segs], loops[i + 1][j]))
    bm.faces.new(loops[0][::-1])
    bm.faces.new(loops[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def add_displace(ob, driver_name, strength, scale, coll):
    tex = bpy.data.textures.get(f'{ob.name}_NOISE') or bpy.data.textures.new(f'{ob.name}_NOISE', 'CLOUDS')
    tex.noise_scale = scale
    tex.noise_depth = 3
    tex.noise_basis = 'IMPROVED_PERLIN'
    old = bpy.data.objects.get(driver_name)
    if old is not None:
        bpy.data.objects.remove(old, do_unlink=True)
    drv = bpy.data.objects.new(driver_name, None)
    drv.empty_display_size = 2
    coll.objects.link(drv)
    drv.parent = ob
    mod = ob.modifiers.new('Displace', 'DISPLACE')
    mod.texture = tex
    mod.texture_coords = 'OBJECT'
    mod.texture_coords_object = drv
    mod.direction = 'NORMAL'
    mod.strength = strength
    mod.mid_level = 0.5
    return drv


def _iface(tree):
    it = tree.interface
    for name, default in (('Len', 300.0), ('Ignition', 1.0), ('Heat', 1.0), ('Time', 0.0),
                          ('FloorZ', 0.6), ('WhiteEnd', 45.0), ('TrailEnd', 130.0), ('Collar', 1.0)):
        s = it.new_socket(name, in_out='INPUT', socket_type='NodeSocketFloat')
        s.default_value = default
    it.new_socket('Shader', in_out='OUTPUT', socket_type='NodeSocketShader')


def build_core_group():
    from lib_plume_shader import NB
    tree = bpy.data.node_groups.get(CORE_GROUP)
    if tree is not None:
        bpy.data.node_groups.remove(tree)
    tree = bpy.data.node_groups.new(CORE_GROUP, 'ShaderNodeTree')
    _iface(tree)
    b = NB(tree)
    gin = b.n.new('NodeGroupInput')
    gout = b.n.new('NodeGroupOutput')
    gout.location = (4000, 0)
    I = {s.name: s for s in gin.outputs}
    coord = b.n.new('ShaderNodeTexCoord')
    geo = b.n.new('ShaderNodeNewGeometry')
    ox, oy, oz = b.sep(coord.outputs['Object'])
    d = b.math('MULTIPLY', oz, -1.0)                       # metres below the bells
    wz = b.sep(geo.outputs['Position'])[2]
    n = b.noise4(coord.outputs['Object'], b.math('MULTIPLY', I['Time'], 0.08), 1.0 / 14.0, 4.0, 0.55)
    n2 = b.noise4(coord.outputs['Object'], b.math('MULTIPLY_ADD', I['Time'], 0.13, 5.0), 1.0 / 4.5, 2.0, 0.5)

    # Visible extent: ends at Len (ragged), never below the pad floor.
    tail = b.remap_ss(d, b.math('SUBTRACT', I['Len'], b.math('MULTIPLY_ADD', n, 30.0, 6.0)), I['Len'])
    vis = b.math('SUBTRACT', 1.0, tail)
    vis = b.math('MULTIPLY', vis, b.remap_ss(wz, I['FloorZ'], b.math('ADD', I['FloorZ'], 1.2)))
    # Translucent, breaking-up trail past WhiteEnd.
    trail = b.remap_ss(d, I['WhiteEnd'], I['TrailEnd'])
    holes = b.math('MULTIPLY', trail, b.math('MULTIPLY_ADD', b.smooth(0.42, 0.62, n), 0.75, 0.15))
    alpha = b.math('MULTIPLY', vis, b.math('SUBTRACT', 1.0, holes), clamp=True)
    alpha = b.math('MULTIPLY', alpha, b.smooth(0.0, 0.05, I['Ignition']))

    # Temperature: orange collar 1-8 m below the bells, white body, cooling trail.
    collar = b.math('MULTIPLY', b.math('MULTIPLY', b.smooth(0.5, 2.5, d), b.math('SUBTRACT', 1.0, b.smooth(6.0, 10.0, d))), I['Collar'])
    temp = b.math('MULTIPLY_ADD', collar, -4000.0, 6200.0)
    temp = b.math('MULTIPLY_ADD', trail, -1500.0, temp)
    col = b.blackbody(temp)
    strength = b.math('MULTIPLY_ADD', collar, -0.8, 1.0)                 # collar ~12 of 60
    strength = b.math('MULTIPLY', strength, b.math('MULTIPLY_ADD', trail, -0.85, 1.0))
    strength = b.math('MULTIPLY', strength, b.math('MULTIPLY_ADD', n2, 0.35, 0.8))
    strength = b.math('MULTIPLY', strength, b.math('MULTIPLY', I['Heat'], 60.0))
    strength = b.math('MULTIPLY', strength, I['Ignition'])

    em = b.n.new('ShaderNodeEmission')
    b.link(col, em.inputs['Color'])
    b.link(strength, em.inputs['Strength'])
    tr = b.n.new('ShaderNodeBsdfTransparent')
    mix = b.n.new('ShaderNodeMixShader')
    b.link(alpha, mix.inputs['Fac'])
    b.link(tr.outputs[0], mix.inputs[1])
    b.link(em.outputs[0], mix.inputs[2])
    b.link(mix.outputs[0], gout.inputs['Shader'])
    return tree


def make_core_material(name, group, **inputs):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    g = nt.nodes.new('ShaderNodeGroup')
    g.node_tree = group
    g.name = 'CORE'
    for k, v in inputs.items():
        g.inputs[k].default_value = v
    nt.links.new(g.outputs['Shader'], out.inputs['Surface'])
    mat.surface_render_method = 'BLENDED' if hasattr(mat, 'surface_render_method') else None
    return mat
