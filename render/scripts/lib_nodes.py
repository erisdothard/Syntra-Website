"""Small shader-node helpers so the material code stays readable.

Sockets can be passed wherever a float/colour is expected; plain numbers are
written to default_value instead of linked.  ANIM registers Value nodes that
build_scene keyframes per frame (name → list of output sockets).
"""
import bpy

ANIM = {}
TEX_DIR = "/Users/erisdothard/Syntra-Website/render/assets/tex/"


def _is_socket(v):
    return isinstance(v, bpy.types.NodeSocket)


class NT:
    """Wrapper around a node tree."""

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
        if v is None:
            return
        if _is_socket(v):
            self.l.new(v, sock)
        else:
            sock.default_value = v

    def math(self, op, a, b=0.0, c=None, clamp=False):
        nd = self.node("ShaderNodeMath", operation=op, use_clamp=clamp)
        self.feed(nd.inputs[0], a)
        self.feed(nd.inputs[1], b)
        if c is not None:
            self.feed(nd.inputs[2], c)
        return nd.outputs[0]

    def vmath(self, op, a, b=None, scale=None):
        nd = self.node("ShaderNodeVectorMath", operation=op)
        self.feed(nd.inputs[0], a)
        if b is not None:
            self.feed(nd.inputs[1], b)
        if scale is not None:
            self.feed(nd.inputs["Scale"], scale)
        return nd.outputs[0]

    def value(self, v, name=None):
        nd = self.node("ShaderNodeValue")
        nd.outputs[0].default_value = v
        if name:
            nd.label = name
            nd.name = name
            ANIM.setdefault(name, []).append(nd.outputs[0])
        return nd.outputs[0]

    def rgb(self, r, g, b):
        nd = self.node("ShaderNodeRGB")
        nd.outputs[0].default_value = (r, g, b, 1.0)
        return nd.outputs[0]

    def mix_rgb(self, fac, a, b):
        nd = self.node("ShaderNodeMix", data_type="RGBA", clamp_factor=True)
        self.feed(nd.inputs[0], fac)
        self.feed(nd.inputs[6], a if _is_socket(a) else (*a, 1.0))
        self.feed(nd.inputs[7], b if _is_socket(b) else (*b, 1.0))
        return nd.outputs[2]

    def mix_f(self, fac, a, b):
        nd = self.node("ShaderNodeMix", data_type="FLOAT", clamp_factor=True)
        self.feed(nd.inputs[0], fac)
        self.feed(nd.inputs[2], a)
        self.feed(nd.inputs[3], b)
        return nd.outputs[0]

    def mix_shader(self, fac, a, b):
        nd = self.node("ShaderNodeMixShader")
        self.feed(nd.inputs[0], fac)
        self.l.new(a, nd.inputs[1])
        self.l.new(b, nd.inputs[2])
        return nd.outputs[0]

    def map_range(self, v, fmin, fmax, tmin=0.0, tmax=1.0, smooth=False, clamp=True):
        nd = self.node("ShaderNodeMapRange", clamp=clamp,
                       interpolation_type="SMOOTHSTEP" if smooth else "LINEAR")
        self.feed(nd.inputs["Value"], v)
        self.feed(nd.inputs["From Min"], fmin)
        self.feed(nd.inputs["From Max"], fmax)
        self.feed(nd.inputs["To Min"], tmin)
        self.feed(nd.inputs["To Max"], tmax)
        return nd.outputs["Result"]

    def smoothstep(self, a, b, x):
        return self.map_range(x, a, b, 0.0, 1.0, smooth=True)

    def noise(self, vec, scale=1.0, detail=2.0, roughness=0.5, distortion=0.0, dim="3D"):
        nd = self.node("ShaderNodeTexNoise", noise_dimensions=dim)
        self.feed(nd.inputs["Vector"], vec)
        nd.inputs["Scale"].default_value = scale
        nd.inputs["Detail"].default_value = detail
        nd.inputs["Roughness"].default_value = roughness
        nd.inputs["Distortion"].default_value = distortion
        return nd.outputs["Fac"]

    def voronoi(self, vec, scale=1.0, randomness=1.0, feature="F1", dim="3D"):
        nd = self.node("ShaderNodeTexVoronoi", voronoi_dimensions=dim, feature=feature)
        self.feed(nd.inputs["Vector"], vec)
        nd.inputs["Scale"].default_value = scale
        nd.inputs["Randomness"].default_value = randomness
        return nd

    def sep_xyz(self, vec):
        nd = self.node("ShaderNodeSeparateXYZ")
        self.feed(nd.inputs[0], vec)
        return nd.outputs["X"], nd.outputs["Y"], nd.outputs["Z"]

    def comb_xyz(self, x, y, z):
        nd = self.node("ShaderNodeCombineXYZ")
        self.feed(nd.inputs[0], x)
        self.feed(nd.inputs[1], y)
        self.feed(nd.inputs[2], z)
        return nd.outputs[0]

    def sep_rgb(self, col):
        nd = self.node("ShaderNodeSeparateColor")
        self.feed(nd.inputs[0], col)
        return nd.outputs[0], nd.outputs[1], nd.outputs[2]

    def texcoord(self, obj=None):
        nd = self.node("ShaderNodeTexCoord")
        if obj is not None:
            nd.object = obj
        return nd

    def mapping(self, vec, scale=(1, 1, 1), rot=(0, 0, 0), loc=(0, 0, 0)):
        nd = self.node("ShaderNodeMapping", vector_type="POINT")
        self.feed(nd.inputs["Vector"], vec)
        nd.inputs["Scale"].default_value = scale
        nd.inputs["Rotation"].default_value = rot
        nd.inputs["Location"].default_value = loc
        return nd.outputs[0]

    def image(self, path_or_img, vec=None, colorspace=None, projection="FLAT", blend=0.2,
              interpolation="Linear"):
        nd = self.node("ShaderNodeTexImage", projection=projection, interpolation=interpolation)
        if isinstance(path_or_img, str):
            img = bpy.data.images.get(path_or_img.rsplit("/", 1)[-1])
            if img is None:
                img = bpy.data.images.load(path_or_img, check_existing=True)
        else:
            img = path_or_img
        nd.image = img
        if colorspace:
            img.colorspace_settings.name = colorspace
        if projection == "BOX":
            nd.projection_blend = blend
        if vec is not None:
            self.feed(nd.inputs["Vector"], vec)
        return nd

    def tex(self, name, vec, colorspace, projection="FLAT"):
        return self.image(TEX_DIR + name, vec, colorspace, projection)

    def bump(self, height, strength=0.3, distance=0.02, normal=None):
        nd = self.node("ShaderNodeBump")
        nd.inputs["Strength"].default_value = strength
        nd.inputs["Distance"].default_value = distance
        self.feed(nd.inputs["Height"], height)
        if normal is not None:
            self.feed(nd.inputs["Normal"], normal)
        return nd.outputs[0]

    def normal_map(self, col, strength=1.0):
        nd = self.node("ShaderNodeNormalMap", space="TANGENT")
        nd.inputs["Strength"].default_value = strength
        self.feed(nd.inputs["Color"], col)
        return nd.outputs[0]

    def blackbody(self, temp):
        nd = self.node("ShaderNodeBlackbody")
        self.feed(nd.inputs[0], temp)
        return nd.outputs[0]

    def principled(self, **kw):
        nd = self.node("ShaderNodeBsdfPrincipled")
        for k, v in kw.items():
            self.feed(nd.inputs[k], v)
        return nd

    def emission(self, color, strength=1.0):
        nd = self.node("ShaderNodeEmission")
        self.feed(nd.inputs["Color"], color if _is_socket(color) else (*color, 1.0))
        self.feed(nd.inputs["Strength"], strength)
        return nd.outputs[0]

    def out(self, shader, target="ALL", volume=None, displacement=None):
        nd = self.node("ShaderNodeOutputMaterial", target=target)
        if shader is not None:
            self.l.new(shader, nd.inputs["Surface"])
        if volume is not None:
            self.l.new(volume, nd.inputs["Volume"])
        if displacement is not None:
            self.l.new(displacement, nd.inputs["Displacement"])
        return nd


def new_material(name):
    mat = bpy.data.materials.get(name)
    if mat:
        bpy.data.materials.remove(mat)
    mat = bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except Exception:
        pass
    mat.node_tree.nodes.clear()
    return mat, NT(mat.node_tree)


def iter_fcurves(action):
    """Blender 5 layered actions: layers → strips → channelbags → fcurves."""
    if action is None:
        return
    if hasattr(action, "fcurves"):
        yield from action.fcurves
        return
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves


def set_linear(id_block):
    ad = id_block.animation_data
    if ad and ad.action:
        for fc in iter_fcurves(ad.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


def key_anim(states, getters):
    """Keyframe every registered Value node.  getters: name → fn(state) → float."""
    for name, sockets in ANIM.items():
        fn = getters.get(name)
        if fn is None:
            continue
        for sock in sockets:
            for s in states:
                sock.default_value = fn(s)
                sock.keyframe_insert("default_value", frame=s["frame"])
            set_linear(sock.id_data)
