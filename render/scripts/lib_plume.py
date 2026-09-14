"""Helpers for the emissive F-1 plume (add_plume.py): meshes, the geometry-nodes
shape modifier, the fire shader group, plume lights and the compositor bloom.

No volumes anywhere.  The plume is an emissive surface whose radiance clips to
white under AgX; a translucent sheath softens the silhouette, and Point lights
carry the fire light to the deck, tower and cloud at low sample counts.

Every mesh is built in metres along local -Z from its origin (d = -z = metres
downstream), so the shader can key colour and strength off d directly.
"""
import math

import bpy
import bmesh

from lib_nodes import NT, iter_fcurves

SHAPE_GROUP = "PLUME_SHAPE"
FIRE_GROUP = "PLUME_FIRE"
COMP_GROUP = "PLUME_COMPOSITE"
EXIT_DIAMETER = 3.7          # F-1 nozzle exit diameter, metres


def smooth(a, b, x):
    t = 0.0 if x < a else 1.0 if x > b else (x - a) / (b - a)
    return t * t * (3 - 2 * t)


def interp(stations, d):
    """Piecewise-linear lookup in a sorted [(d, value), ...] table."""
    if d <= stations[0][0]:
        return stations[0][1]
    for (d0, v0), (d1, v1) in zip(stations, stations[1:]):
        if d <= d1:
            return v0 + (v1 - v0) * (d - d0) / (d1 - d0)
    return stations[-1][1]


# Core radius (m) vs metres below the exit plane: 5.5 at the bells, a slight
# neck, then the flare to ~18 m at 120 m and ~35 m at 300 m.
CORE_RADIUS = [(-3.0, 4.2), (0.0, 5.5), (8.0, 5.0), (18.0, 5.7), (40.0, 8.4), (80.0, 13.0),
               (120.0, 18.0), (200.0, 27.0), (300.0, 35.0), (360.0, 39.0)]


def core_stations(length=360.0, top=-3.0, scale=1.0, step=2.0):
    """(d, rx, ry) rings: 1 m apart for the first 30 m, `step` m after that."""
    out = []
    d = top
    while d < length:
        r = interp(CORE_RADIUS, d) * scale
        out.append((d, r, r))
        d += 1.0 if d < 30 else step
    r = interp(CORE_RADIUS, length) * scale
    out.append((length, r, r))
    return out


def lobe_stations(length=40.0, width=25.0, height=12.0):
    """Flat trench lobe: wide across the trench (local X), low (local Y), tapering."""
    out = []
    n = 16
    for i in range(n + 1):
        d = length * i / n
        t = d / length
        rx = width * 0.5 * (1.0 - 0.6 * t * t)
        ry = height * 0.5 * (1.0 - 0.5 * t)
        out.append((d, rx, ry))
    return out


def flare_stations(length=10.0, r0=6.5, r1=10.0):
    out = []
    n = 7
    for i in range(n + 1):
        d = length * i / n
        r = r0 + (r1 - r0) * smooth(0, length, d)
        out.append((d, r, r))
    return out


def tube_mesh(name, stations, segs=64, cap_start=0.6, cap_end=0.4):
    """Closed tube along local -Z. stations: [(d, rx, ry)]; caps taper by the
    given factor so the ends read as rounded, not flat."""
    bm = bmesh.new()
    loops = []
    last = len(stations) - 1
    for i, (d, rx, ry) in enumerate(stations):
        cap = cap_start if i == 0 else cap_end if i == last else 1.0
        ring = [bm.verts.new((rx * cap * math.cos(2 * math.pi * j / segs),
                              ry * cap * math.sin(2 * math.pi * j / segs), -d))
                for j in range(segs)]
        loops.append(ring)
    for i in range(last):
        for j in range(segs):
            bm.faces.new((loops[i][j], loops[i][(j + 1) % segs],
                          loops[i + 1][(j + 1) % segs], loops[i + 1][j]))
    bm.faces.new(loops[0][::-1])
    bm.faces.new(loops[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


# ----------------------------------------------------------------------------- geometry nodes

class GB:
    """Tiny geometry-nodes builder (all helpers return an output socket)."""

    def __init__(self, tree):
        self.t = tree
        self.n = tree.nodes
        self.l = tree.links

    def node(self, kind, **kw):
        nd = self.n.new(kind)
        for k, v in kw.items():
            setattr(nd, k, v)
        return nd

    def feed(self, sock, v):
        if isinstance(v, bpy.types.NodeSocket):
            self.l.new(v, sock)
        else:
            sock.default_value = v

    def math(self, op, a, b=0.0, c=None):
        nd = self.node("ShaderNodeMath", operation=op)
        self.feed(nd.inputs[0], a)
        self.feed(nd.inputs[1], b)
        if c is not None:
            self.feed(nd.inputs[2], c)
        return nd.outputs[0]

    def smoothstep(self, x, a, b):
        nd = self.node("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP", clamp=True)
        self.feed(nd.inputs[0], x)
        self.feed(nd.inputs[1], a)
        self.feed(nd.inputs[2], b)
        return nd.outputs[0]

    def sep(self, v):
        nd = self.node("ShaderNodeSeparateXYZ")
        self.feed(nd.inputs[0], v)
        return nd.outputs[0], nd.outputs[1], nd.outputs[2]

    def comb(self, x, y, z):
        nd = self.node("ShaderNodeCombineXYZ")
        self.feed(nd.inputs[0], x)
        self.feed(nd.inputs[1], y)
        self.feed(nd.inputs[2], z)
        return nd.outputs[0]

    def vscale(self, v, s):
        nd = self.node("ShaderNodeVectorMath", operation="SCALE")
        self.feed(nd.inputs[0], v)
        self.feed(nd.inputs["Scale"], s)
        return nd.outputs[0]


def build_shape_group():
    """GN modifier: cut the tube at `Cut` metres, subdivide, expand the radius
    with altitude (ramping in over ExpandRamp metres so the hot section stays a column),
    then displace along the normal with a 4D noise whose W is driven by frame."""
    old = bpy.data.node_groups.get(SHAPE_GROUP)
    if old is not None:
        bpy.data.node_groups.remove(old)
    tree = bpy.data.node_groups.new(SHAPE_GROUP, "GeometryNodeTree")
    tree.is_modifier = True
    it = tree.interface
    it.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    for nm, dv in (("W", 0.0), ("Cut", 400.0), ("Expand", 0.0), ("ExpandRamp", 120.0),
                   ("Amp", 1.0), ("NoiseScale", 0.11), ("Flow", 4.0), ("AmpGrow", 0.035)):  # ExpandRamp: far-field only
        s = it.new_socket(nm, in_out="INPUT", socket_type="NodeSocketFloat")
        s.default_value = dv
    lvl = it.new_socket("Level", in_out="INPUT", socket_type="NodeSocketInt")
    lvl.default_value = 2
    it.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")

    b = GB(tree)
    gin = b.node("NodeGroupInput")
    gout = b.node("NodeGroupOutput")
    I = {s.name: s for s in gin.outputs if s.name}

    pos = b.node("GeometryNodeInputPosition").outputs[0]
    px, py, pz = b.sep(pos)
    d = b.math("MULTIPLY", pz, -1.0)

    cmp = b.node("FunctionNodeCompare", data_type="FLOAT", operation="GREATER_THAN")
    b.feed(cmp.inputs[0], d)
    b.feed(cmp.inputs[1], I["Cut"])
    dele = b.node("GeometryNodeDeleteGeometry", domain="POINT", mode="ALL")
    b.l.new(I["Geometry"], dele.inputs["Geometry"])
    b.l.new(cmp.outputs[0], dele.inputs["Selection"])

    sub = b.node("GeometryNodeSubdivideMesh")
    b.l.new(dele.outputs[0], sub.inputs["Mesh"])
    b.feed(sub.inputs["Level"], I["Level"])

    # Radial expansion with altitude.
    e = b.math("MULTIPLY_ADD", b.math("MULTIPLY", I["Expand"], 1.6), b.smoothstep(d, 0.0, I["ExpandRamp"]), 1.0)
    setp = b.node("GeometryNodeSetPosition")
    b.l.new(sub.outputs[0], setp.inputs["Geometry"])
    b.feed(setp.inputs["Position"], b.comb(b.math("MULTIPLY", px, e), b.math("MULTIPLY", py, e), pz))

    # Ragged, flickering boundary: 4D noise in metres, advected downstream.
    pos2 = b.node("GeometryNodeInputPosition").outputs[0]
    qx, qy, qz = b.sep(pos2)
    d2 = b.math("MULTIPLY", qz, -1.0)
    adv = b.comb(qx, qy, b.math("MULTIPLY_ADD", I["W"], I["Flow"], qz))
    nz = b.node("ShaderNodeTexNoise", noise_dimensions="4D")
    b.feed(nz.inputs["Vector"], adv)
    b.feed(nz.inputs["W"], b.math("MULTIPLY", I["W"], 0.15))
    b.feed(nz.inputs["Scale"], I["NoiseScale"])
    nz.inputs["Detail"].default_value = 3.0
    nz.inputs["Roughness"].default_value = 0.55
    # Second, finer octave so the rim is fibrous rather than a lumpy polygon edge.
    nz2 = b.node("ShaderNodeTexNoise", noise_dimensions="4D")
    b.feed(nz2.inputs["Vector"], adv)
    b.feed(nz2.inputs["W"], b.math("MULTIPLY_ADD", I["W"], 0.23, 11.0))
    b.feed(nz2.inputs["Scale"], b.math("MULTIPLY", I["NoiseScale"], 3.5))
    nz2.inputs["Detail"].default_value = 2.0
    nz2.inputs["Roughness"].default_value = 0.6
    amp = b.math("MINIMUM", b.math("MULTIPLY_ADD", d2, I["AmpGrow"], 0.5), 9.0)
    amp = b.math("MULTIPLY", amp, I["Amp"])
    disp = b.math("MULTIPLY", b.math("SUBTRACT", nz.outputs["Fac"], 0.5), b.math("MULTIPLY", amp, 2.0))
    disp = b.math("MULTIPLY_ADD", b.math("SUBTRACT", nz2.outputs["Fac"], 0.5), b.math("MULTIPLY", amp, 0.7), disp)
    nrm = b.node("GeometryNodeInputNormal").outputs[0]
    setd = b.node("GeometryNodeSetPosition")
    b.l.new(setp.outputs[0], setd.inputs["Geometry"])
    b.feed(setd.inputs["Offset"], b.vscale(nrm, disp))

    sm = b.node("GeometryNodeSetShadeSmooth")
    b.l.new(setd.outputs[0], sm.inputs["Mesh"])
    sm.inputs["Shade Smooth"].default_value = True
    b.l.new(sm.outputs[0], gout.inputs[0])
    return tree


def socket_ids(tree):
    return {item.name: item.identifier for item in tree.interface.items_tree
            if item.item_type == "SOCKET" and item.in_out == "INPUT"}


def add_shape_modifier(ob, tree, **values):
    mod = ob.modifiers.new("PlumeShape", "NODES")
    mod.node_group = tree
    ids = socket_ids(tree)
    for k, v in values.items():
        mod[ids[k]] = v
    return mod, ids


# ----------------------------------------------------------------------------- fire shader

def _noise4(nt, vec, w, scale, detail, rough):
    nd = nt.node("ShaderNodeTexNoise", noise_dimensions="4D")
    nt.feed(nd.inputs["Vector"], vec)
    nt.feed(nd.inputs["W"], w)
    nd.inputs["Scale"].default_value = scale
    nd.inputs["Detail"].default_value = detail
    nd.inputs["Roughness"].default_value = rough
    return nd.outputs["Fac"]


def build_fire_group():
    """Emission + Transparent, keyed on d = metres downstream:
    collar (0-1.5 exit diameters) 1900 K at 12, white 6500 K at 40 to `White`
    metres, then cooling (to `Cool`) and dimming exponentially (`Decay`), the
    trail going holed and translucent, dissolving over `Band` metres before `Len`.  Silhouette edges (Layer Weight facing) go warm and
    dimmer, which is what gives the clipped core its orange fringe under AgX."""
    old = bpy.data.node_groups.get(FIRE_GROUP)
    if old is not None:
        bpy.data.node_groups.remove(old)
    tree = bpy.data.node_groups.new(FIRE_GROUP, "ShaderNodeTree")
    it = tree.interface
    for nm, dv in (("Len", 300.0), ("Ignition", 1.0), ("Gain", 1.0), ("Time", 0.0),
                   ("Collar", 1.0), ("White", 30.0), ("Cool", 200.0), ("Band", 30.0),
                   ("Translucent", 0.0), ("TempOffset", 0.0), ("Holes", 0.9), ("HoleBase", 0.0),
                   ("Decay", 30.0), ("Trans", 0.7), ("Vac", 0.0), ("VacStrength", 4.0),
                   ("VacAlpha", 0.25), ("EdgeFade", 0.6), ("TopFade", 0.0)):
        s = it.new_socket(nm, in_out="INPUT", socket_type="NodeSocketFloat")
        s.default_value = dv
    it.new_socket("Shader", in_out="OUTPUT", socket_type="NodeSocketShader")

    nt = NT(tree)
    gin = nt.node("NodeGroupInput")
    gout = nt.node("NodeGroupOutput")
    I = {s.name: s for s in gin.outputs if s.name}

    coord = nt.texcoord()
    P = coord.outputs["Object"]
    ox, oy, oz = nt.sep_xyz(P)
    d = nt.math("MULTIPLY", oz, -1.0)
    lw = nt.node("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    facing = lw.outputs["Facing"]

    adv = nt.comb_xyz(ox, oy, nt.math("MULTIPLY_ADD", I["Time"], 4.0, oz))
    n1 = _noise4(nt, adv, nt.math("MULTIPLY", I["Time"], 0.07), 1.0 / 9.0, 4.0, 0.55)
    n2 = _noise4(nt, adv, nt.math("MULTIPLY_ADD", I["Time"], 0.11, 5.0), 1.0 / 3.0, 2.0, 0.5)
    n1r = nt.smoothstep(0.3, 0.7, n1)

    # Visibility: ragged end over Band metres before Len, holes in the cooled trail,
    # ignition ramp, optional translucency (sheath).
    band = nt.math("MINIMUM", I["Band"], nt.math("MULTIPLY", I["Len"], 0.4))
    t_end = nt.math("DIVIDE", nt.math("SUBTRACT", I["Len"], d), band)
    tailvis = nt.smoothstep(0.2, 0.8, nt.math("MULTIPLY_ADD", nt.math("SUBTRACT", n1, 0.5), 0.9, t_end))
    trail = nt.map_range(d, I["White"], I["Cool"], 0.0, 1.0, smooth=True)
    holes = nt.math("MULTIPLY", nt.math("MULTIPLY_ADD", trail, I["Holes"], I["HoleBase"]),
                    nt.smoothstep(0.42, 0.72, n1), clamp=True)
    alpha = nt.math("MULTIPLY", tailvis, nt.math("SUBTRACT", 1.0, holes))
    alpha = nt.math("MULTIPLY", alpha, nt.math("SUBTRACT", 1.0, nt.math("MULTIPLY", trail, I["Trans"])))
    alpha = nt.math("MULTIPLY", alpha, nt.smoothstep(0.0, 0.12, I["Ignition"]))
    sheath_a = nt.math("MULTIPLY_ADD", n1r, 0.25, 0.15)
    alpha = nt.math("MULTIPLY", alpha, nt.mix_f(I["Translucent"], 1.0, sheath_a), clamp=True)
    # Silhouette: alpha falls to 0 over the grazing band (noise-broken), so no hard outline.
    edge = nt.smoothstep(0.3, 0.9, nt.math("MULTIPLY_ADD", nt.math("SUBTRACT", n2, 0.5), 0.4, facing))
    alpha = nt.math("MULTIPLY", alpha, nt.math("SUBTRACT", 1.0, nt.math("MULTIPLY", edge, I["EdgeFade"])))
    # Tops (local +Y, lobes only: TopFade metres) dissolve upward into the cloud.
    top = nt.smoothstep(nt.math("MULTIPLY", I["TopFade"], 0.25), I["TopFade"],
                        nt.math("MULTIPLY_ADD", nt.math("SUBTRACT", n1, 0.5), 5.0, oy))
    top = nt.math("MULTIPLY", top, nt.math("GREATER_THAN", I["TopFade"], 0.0))
    alpha = nt.math("MULTIPLY", alpha, nt.math("SUBTRACT", 1.0, top))

    # Temperature and strength along the plume.
    collar = nt.math("MULTIPLY", I["Collar"], nt.math("SUBTRACT", 1.0, nt.smoothstep(1.2 * EXIT_DIAMETER, 2.0 * EXIT_DIAMETER, d)))
    fringe = nt.smoothstep(0.45, 0.9, facing)
    temp = nt.math("MULTIPLY_ADD", collar, -4600.0, 6500.0)
    temp = nt.math("MULTIPLY_ADD", nt.math("MULTIPLY", fringe, nt.math("SUBTRACT", 1.0, collar)), -2400.0, temp)
    temp = nt.math("MULTIPLY_ADD", trail, -3000.0, temp)
    temp = nt.math("MAXIMUM", nt.math("ADD", temp, I["TempOffset"]), 1600.0)
    temp = nt.mix_f(I["Vac"], temp, 9000.0)                     # vacuum: blue-white
    col = nt.blackbody(temp)

    # 40 through the white section, then exp(-(d - White) / Decay): ~15 one decay
    # length later (still near-white under AgX), orange by two, a faint veil by four.
    past = nt.math("MAXIMUM", nt.math("SUBTRACT", d, I["White"]), 0.0)
    s = nt.math("MULTIPLY", 40.0, nt.math("EXPONENT", nt.math("DIVIDE", past, nt.math("MULTIPLY", I["Decay"], -1.0))))
    s = nt.mix_f(collar, s, 12.0)
    s = nt.math("MULTIPLY", s, nt.math("MULTIPLY_ADD", n2, 0.8, 0.5))
    s = nt.math("MULTIPLY", s, nt.math("MULTIPLY_ADD", fringe, -0.8, 1.0))
    s = nt.math("MULTIPLY", s, nt.math("MULTIPLY", I["Ignition"], I["Gain"]))
    # Vacuum (Vac -> 1): the envelope becomes a faint, huge, diffuse fan -- strength
    # VacStrength x (0.5..1.5), alpha VacAlpha x (0.6..1.4) -- so stars read through it.
    vac_s = nt.math("MULTIPLY", I["VacStrength"], nt.math("MULTIPLY_ADD", n2, 1.0, 0.5))
    vac_s = nt.math("MULTIPLY", vac_s, nt.math("MULTIPLY_ADD", fringe, -0.5, 1.0))
    s = nt.mix_f(I["Vac"], s, nt.math("MULTIPLY", vac_s, I["Ignition"]))
    vac_a = nt.math("MULTIPLY", I["VacAlpha"], nt.math("MULTIPLY_ADD", n1r, 0.8, 0.6))
    vac_a = nt.math("MULTIPLY", vac_a, nt.math("MULTIPLY", tailvis, nt.smoothstep(0.0, 0.12, I["Ignition"])))
    alpha = nt.mix_f(I["Vac"], alpha, vac_a)

    em = nt.emission(col, s)
    tr = nt.node("ShaderNodeBsdfTransparent").outputs[0]
    out = nt.mix_shader(alpha, tr, em)
    nt.l.new(out, gout.inputs["Shader"])
    return tree


def make_fire_material(name, group, **inputs):
    mat = bpy.data.materials.get(name)
    if mat is not None:
        bpy.data.materials.remove(mat)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (300, 0)
    g = nt.nodes.new("ShaderNodeGroup")
    g.node_tree = group
    g.name = "FIRE"
    for k, v in inputs.items():
        g.inputs[k].default_value = v
    nt.links.new(g.outputs["Shader"], out.inputs["Surface"])
    mat.use_backface_culling = False
    if hasattr(mat, "use_backface_culling_shadow"):
        mat.use_backface_culling_shadow = False
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED"
    return mat


def set_linear(id_block):
    ad = getattr(id_block, "animation_data", None)
    if ad and ad.action:
        for fc in iter_fcurves(ad.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


# ----------------------------------------------------------------------------- lights & compositor

def point_light(name, coll, parent, radius, kelvin, volume_scatter=False):
    old = bpy.data.objects.get(name)
    if old is not None:
        bpy.data.objects.remove(old, do_unlink=True)
    ld = bpy.data.lights.get(name) or bpy.data.lights.new(name, "POINT")
    ld.energy = 0.0
    ld.shadow_soft_size = radius
    ld.use_nodes = True
    nt = ld.node_tree
    nt.nodes.clear()
    bb = nt.nodes.new("ShaderNodeBlackbody")
    bb.inputs["Temperature"].default_value = kelvin
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputLight")
    nt.links.new(bb.outputs[0], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    ob = bpy.data.objects.new(name, ld)
    coll.objects.link(ob)
    ob.parent = parent
    # Megawatt lights inside FOG_VOLUME wash the whole frame with in-scatter; the
    # emissive meshes still glow into the fog, the lights only light surfaces.
    ob.visible_volume_scatter = volume_scatter
    return ob


def link_lights_except(scene, lights, excluded, name="PLUME_LIT"):
    """Light linking: the plume lights light every object except `excluded`
    (FOG_VOLUME -- megawatt in-scatter there washes the frame; the pad cloud
    domains ARE lit, that is the point of the cloud)."""
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
    for ob in scene.objects:
        if ob.name in excluded or ob in lights or ob.name in coll.objects:
            continue
        coll.objects.link(ob)
    for lt in lights:
        lt.light_linking.receiver_collection = coll
    return coll


def add_bloom(scene, threshold=4.0, size=0.7, strength=0.25):
    """Render Layers -> Glare (Fog Glow) -> output.  Blender 5: the compositor is a
    node group on scene.compositing_node_group with a Group Output node."""
    old = bpy.data.node_groups.get(COMP_GROUP)
    if old is not None:
        bpy.data.node_groups.remove(old)
    tree = bpy.data.node_groups.new(COMP_GROUP, "CompositorNodeTree")
    tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = tree.nodes.new("CompositorNodeRLayers")
    rl.scene = scene
    glare = tree.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = "Fog Glow"
    glare.inputs["Quality"].default_value = "High"
    glare.inputs["Threshold"].default_value = threshold
    glare.inputs["Size"].default_value = size
    glare.inputs["Strength"].default_value = strength
    out = tree.nodes.new("NodeGroupOutput")
    tree.links.new(rl.outputs["Image"], glare.inputs["Image"])
    tree.links.new(glare.outputs["Image"], out.inputs[0])
    rl.location, glare.location, out.location = (0, 0), (300, 0), (600, 0)
    scene.compositing_node_group = tree
    scene.render.use_compositing = True
    return tree
