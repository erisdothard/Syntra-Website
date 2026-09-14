"""Procedural F-1 plume volume shader as a reusable node group (PLUME_VOL).

Look bible: src/components/scene/layers/Exhaust.tsx. The plume is optically thick
kerolox: achromatic white core, an orange collar only 1-3 exit diameters below the
bells, a sooty dark sheath at the lip, soft luminance swells (no crisp Mach
diamonds), soot filaments downstream, and a dim blue-white condensation trail.

The volume mesh is a unit column in object space: z in [-1, 0] (0 at the exit
plane, -1 at the tail), radius r(a) = 1 + 1.6 a. The object scale (w, w, L) turns
that into metres; the same vector is fed in as `Scale` so noise lives in metres.
"""
import bpy

GROUP_NAME = 'PLUME_VOL'


class NB:
    """Minimal node-builder: every helper returns an output socket."""

    def __init__(self, tree):
        self.t = tree
        self.n = tree.nodes
        self.l = tree.links
        self._x = 0

    def _place(self, node):
        node.location = (self._x, 0)
        self._x += 180
        return node

    def link(self, src, dst):
        if isinstance(src, (int, float)):
            dst.default_value = src
        elif isinstance(src, (tuple, list)):
            dst.default_value = src
        else:
            self.l.new(src, dst)

    def math(self, op, a, b=0.0, c=None, clamp=False):
        nd = self._place(self.n.new('ShaderNodeMath'))
        nd.operation = op
        nd.use_clamp = clamp
        self.link(a, nd.inputs[0])
        self.link(b, nd.inputs[1])
        if c is not None:
            self.link(c, nd.inputs[2])
        return nd.outputs[0]

    def vmath(self, op, a, b=None, scale=None):
        nd = self._place(self.n.new('ShaderNodeVectorMath'))
        nd.operation = op
        self.link(a, nd.inputs[0])
        if b is not None:
            self.link(b, nd.inputs[1])
        if scale is not None:
            self.link(scale, nd.inputs['Scale'])
        return nd.outputs['Value'] if op in ('LENGTH', 'DOT_PRODUCT', 'DISTANCE') else nd.outputs[0]

    def sep(self, v):
        nd = self._place(self.n.new('ShaderNodeSeparateXYZ'))
        self.link(v, nd.inputs[0])
        return nd.outputs['X'], nd.outputs['Y'], nd.outputs['Z']

    def comb(self, x, y, z):
        nd = self._place(self.n.new('ShaderNodeCombineXYZ'))
        self.link(x, nd.inputs['X'])
        self.link(y, nd.inputs['Y'])
        self.link(z, nd.inputs['Z'])
        return nd.outputs[0]

    def smooth(self, lo, hi, x):
        nd = self._place(self.n.new('ShaderNodeMapRange'))
        nd.interpolation_type = 'SMOOTHSTEP'
        nd.clamp = True
        self.link(x, nd.inputs['Value'])
        nd.inputs['From Min'].default_value = lo
        nd.inputs['From Max'].default_value = hi
        return nd.outputs['Result']

    def remap_ss(self, x, lo, hi):
        nd = self._place(self.n.new('ShaderNodeMapRange'))
        nd.interpolation_type = 'SMOOTHSTEP'
        nd.clamp = True
        self.link(x, nd.inputs['Value'])
        self.link(lo, nd.inputs['From Min'])
        self.link(hi, nd.inputs['From Max'])
        return nd.outputs['Result']

    def remap(self, x, lo, hi, clamp=True):
        nd = self._place(self.n.new('ShaderNodeMapRange'))
        nd.clamp = clamp
        self.link(x, nd.inputs['Value'])
        nd.inputs['From Min'].default_value = lo
        nd.inputs['From Max'].default_value = hi
        return nd.outputs['Result']

    def noise4(self, vec, w, scale, detail, rough, lac=2.2):
        nd = self._place(self.n.new('ShaderNodeTexNoise'))
        nd.noise_dimensions = '4D'
        self.link(vec, nd.inputs['Vector'])
        self.link(w, nd.inputs['W'])
        nd.inputs['Scale'].default_value = scale
        nd.inputs['Detail'].default_value = detail
        nd.inputs['Roughness'].default_value = rough
        nd.inputs['Lacunarity'].default_value = lac
        return nd.outputs['Fac']

    def mixc(self, a, b, fac):
        nd = self._place(self.n.new('ShaderNodeMix'))
        nd.data_type = 'RGBA'
        nd.clamp_factor = True
        self.link(fac, nd.inputs['Factor'])
        self.link(a if not isinstance(a, tuple) else (*a, 1), nd.inputs[6])
        self.link(b if not isinstance(b, tuple) else (*b, 1), nd.inputs[7])
        return nd.outputs[2]

    def blackbody(self, temp):
        nd = self._place(self.n.new('ShaderNodeBlackbody'))
        self.link(temp, nd.inputs['Temperature'])
        return nd.outputs[0]


def _interface(tree):
    it = tree.interface
    spec = [
        ('Scale', 'NodeSocketVector', (5.6, 5.6, 100.0)),
        ('Ignition', 'NodeSocketFloat', 1.0),
        ('Expand', 'NodeSocketFloat', 0.0),
        ('Heat', 'NodeSocketFloat', 60.0),
        ('Soot', 'NodeSocketFloat', 0.35),
        ('Density', 'NodeSocketFloat', 0.6),
        ('Time', 'NodeSocketFloat', 0.0),
        ('Flow', 'NodeSocketFloat', 6.0),
        ('Cool', 'NodeSocketFloat', 0.72),
        ('RefLen', 'NodeSocketFloat', 300.0),
        ('DimStart', 'NodeSocketFloat', 40.0),
        ('DimEnd', 'NodeSocketFloat', 110.0),
    ]
    for name, stype, default in spec:
        s = it.new_socket(name, in_out='INPUT', socket_type=stype)
        s.default_value = default
    it.new_socket('Volume', in_out='OUTPUT', socket_type='NodeSocketShader')


def build_group():
    tree = bpy.data.node_groups.get(GROUP_NAME)
    if tree is not None:
        bpy.data.node_groups.remove(tree)
    tree = bpy.data.node_groups.new(GROUP_NAME, 'ShaderNodeTree')
    _interface(tree)
    b = NB(tree)
    gin = b.n.new('NodeGroupInput')
    gout = b.n.new('NodeGroupOutput')
    gout.location = (5000, 0)
    I = {s.name: s for s in gin.outputs}

    coord = b.n.new('ShaderNodeTexCoord')
    obj = coord.outputs['Object']
    ox, oy, oz = b.sep(obj)
    # Axial coordinate in metres over a reference length, so a short column (the
    # 12 m stub between the bells and the deflector) is all white core, not a
    # miniature of the whole plume.
    sz = b.sep(I['Scale'])[2]
    a = b.math('DIVIDE', b.math('MULTIPLY', oz, sz), b.math('MULTIPLY', I['RefLen'], -1.0), clamp=True)
    one_a = b.math('SUBTRACT', 1.0, a)
    rxy = b.vmath('LENGTH', b.comb(ox, oy, 0.0))
    r_env = b.math('ADD', 1.0, b.math('MULTIPLY', a, b.math('MULTIPLY_ADD', I['Expand'], 1.1, 0.35)))
    rn = b.math('DIVIDE', rxy, r_env, clamp=True)

    # Noise in metres, advected downstream (+z object -> features drift toward -z).
    P = b.vmath('MULTIPLY', obj, I['Scale'])
    px, py, pz = b.sep(P)
    pz_adv = b.math('MULTIPLY_ADD', I['Time'], I['Flow'], pz)
    Pn = b.comb(px, py, pz_adv)
    w1 = b.math('MULTIPLY', I['Time'], 0.06)
    n1 = b.noise4(Pn, w1, 1.0 / 9.0, 5.0, 0.55)
    w2 = b.math('MULTIPLY_ADD', I['Time'], 0.11, 7.0)
    n2 = b.noise4(Pn, w2, 1.0 / 3.2, 3.0, 0.5)
    nA = b.remap(n1, 0.38, 0.68)

    # Ragged silhouette: boundary wobbles more downstream.
    wob = b.math('MULTIPLY', b.math('SUBTRACT', n1, 0.5), b.math('MULTIPLY_ADD', a, 0.9, 0.25))
    rn2 = b.math('ADD', rn, wob)
    radial = b.math('SUBTRACT', 1.0, rn2, clamp=True)
    # Flat-topped radial profile: the column is squared off the full stage width,
    # it does not narrow to an axial spike.
    plateau = b.smooth(0.0, 0.32, radial)
    chord = b.math('SQRT', b.math('SUBTRACT', 1.0, b.math('MULTIPLY', rn2, rn2), clamp=True))
    down = b.math('MULTIPLY', pz, -1.0)          # metres below the exit plane

    body = b.math('POWER', one_a, 0.85)
    dens = b.math('MULTIPLY', I['Density'], I['Ignition'])
    dens = b.math('MULTIPLY', dens, body)
    dens = b.math('MULTIPLY', dens, plateau)
    dens = b.math('MULTIPLY', dens, b.math('MULTIPLY_ADD', nA, 0.9, 0.55))
    dens = b.math('MULTIPLY', dens, b.math('MULTIPLY_ADD', chord, 0.5, 0.5))

    # Heat: the incandescent section is short (DimStart..DimEnd metres), then a
    # dim trail. Soft luminance swells from n2, never crisp diamonds.
    dim = b.math('MULTIPLY_ADD', b.remap_ss(down, I['DimStart'], I['DimEnd']), -0.78, 1.0)
    heat = b.math('MULTIPLY', b.math('POWER', one_a, 1.2), dim)
    heat = b.math('MULTIPLY', heat, plateau)
    heat = b.math('MULTIPLY', heat, I['Ignition'])
    heat = b.math('MULTIPLY', heat, b.math('MULTIPLY_ADD', n2, 0.5, 0.75))

    # Orange collar 1-3 exit diameters (4-12 m) below the bells, shear-layer weighted.
    collar = b.math('MULTIPLY', b.smooth(3.0, 7.0, down), b.math('SUBTRACT', 1.0, b.smooth(12.0, 30.0, down)))
    collar = b.math('MULTIPLY', collar, b.math('MULTIPLY_ADD', b.math('SUBTRACT', 1.0, radial), 0.7, 0.3))
    # Warm fringe only at the very edge of the column.
    fringe = b.math('MULTIPLY', b.smooth(0.72, 1.0, rn2), 0.6)
    temp = b.math('MULTIPLY_ADD', collar, -4800.0, 7200.0)
    temp = b.math('MULTIPLY_ADD', fringe, -3800.0, temp)
    col = b.blackbody(temp)
    col = b.mixc(col, (0.75, 0.82, 0.93), b.math('MULTIPLY', b.smooth(0.30, 0.95, a), I['Cool']))

    # Turbine-exhaust sheath: black film at the lip, gone 6 m downstream.
    sheath = b.math('MULTIPLY', b.smooth(0.60, 0.88, rn), b.math('SUBTRACT', 1.0, b.smooth(3.0, 7.0, down)))
    soot = b.math('MULTIPLY', I['Soot'], b.smooth(0.10, 0.50, a))
    soot = b.math('MULTIPLY', soot, b.smooth(0.45, 0.72, n1), clamp=True)

    estr = b.math('MULTIPLY', I['Heat'], b.math('POWER', heat, 1.5))
    estr = b.math('MULTIPLY', estr, b.math('MULTIPLY_ADD', collar, -0.6, 1.0))
    estr = b.math('MULTIPLY', estr, b.math('MULTIPLY_ADD', sheath, -0.92, 1.0))
    estr = b.math('MULTIPLY', estr, b.math('MULTIPLY_ADD', soot, -0.9, 1.0, clamp=True))
    estr = b.math('MULTIPLY', estr, b.smooth(0.0, 0.15, dens))

    dark = b.math('MAXIMUM', soot, sheath)
    albedo = b.mixc((0.85, 0.82, 0.78), (0.03, 0.02, 0.02), dark)

    pv = b.n.new('ShaderNodeVolumePrincipled')
    pv.location = (4800, 0)
    b.link(albedo, pv.inputs['Color'])
    b.link(dens, pv.inputs['Density'])
    pv.inputs['Absorption Color'].default_value = (0, 0, 0, 1)
    pv.inputs['Anisotropy'].default_value = 0.2
    b.link(estr, pv.inputs['Emission Strength'])
    b.link(col, pv.inputs['Emission Color'])
    pv.inputs['Blackbody Intensity'].default_value = 0.0
    b.link(pv.outputs['Volume'], gout.inputs['Volume'])
    return tree


def make_plume_material(name, group, **inputs):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    out.location = (300, 0)
    g = nt.nodes.new('ShaderNodeGroup')
    g.node_tree = group
    g.name = 'PLUME'
    for k, v in inputs.items():
        g.inputs[k].default_value = v
    nt.links.new(g.outputs['Volume'], out.inputs['Volume'])
    mat.cycles.volume_step_rate = 0.5
    mat.volume_intersection_method = 'FAST'
    return mat
