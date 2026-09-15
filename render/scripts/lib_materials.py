"""Cycles materials for the launch scene.

Vehicle kinds follow src/lib/rocketMaterials.ts (paint / dark / metal / decal /
nozzle).  All vehicle procedural detail uses the VEHICLE empty's object space:
metres, z = height above the F-1 exit plane, so no UVs are required.
"""
import math
import re
import bpy
from lib_nodes import NT, new_material, TEX_DIR


def classify(name, color):
    if re.match(r"^blinn(8|9|10|11)SG", name):
        return "decal"
    if name.startswith("initialShading"):
        return "nozzle"
    if re.match(r"^blinn(6|4|3)SG", name):
        return "metal"
    if re.match(r"^(blinn2SG|fin_blinn2SG)", name):
        return "dark"
    return "dark" if sum(color[:3]) < 0.6 else "paint"


def _src_info(mat):
    """Base colour and first image of an imported glTF material."""
    color = (0.8, 0.8, 0.8, 1.0)
    img = None
    if mat.node_tree:
        for n in mat.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                color = tuple(n.inputs["Base Color"].default_value)
            if n.type == "TEX_IMAGE" and n.image and img is None:
                img = n.image
    return color, img


# ---------------------------------------------------------------- vehicle detail

def _band(t, z, lo, hi, soft=0.4):
    return t.math("MULTIPLY", t.smoothstep(lo - soft, lo + soft, z), t.smoothstep(hi + soft, hi - soft, z))


def _hull_detail(t, P, ring_pitch=2.6):
    """Shared hull relief in VEHICLE object space (m above the F-1 exit plane).
    Returns (height, roughness, grime) sockets."""
    x, y, z = t.sep_xyz(P)
    ang = t.math("ADD", t.math("DIVIDE", t.math("ARCTAN2", x, y), 2 * math.pi), 0.5)
    circ = t.math("MULTIPLY", ang, 34.6)                       # metres around the S-IC
    # horizontal weld seams every tank ring (6 cm grooves)
    fz = t.math("FRACT", t.math("DIVIDE", z, ring_pitch))
    d = t.math("ABSOLUTE", t.math("SUBTRACT", fz, 0.5))
    seam = t.smoothstep(0.478, 0.5, d)
    # vertical panel seams every 22.5 deg
    fa = t.math("FRACT", t.math("MULTIPLY", ang, 16.0))
    vseam = t.smoothstep(0.485, 0.5, t.math("ABSOLUTE", t.math("SUBTRACT", fa, 0.5)))
    # corrugated stringers (~0.9 m pitch) on the tail section, intertank and S-II interstage
    zones = t.math("MAXIMUM", _band(t, z, 4.5, 12.0), t.math("MAXIMUM", _band(t, z, 21.0, 26.5), _band(t, z, 41.0, 47.5)))
    corr = t.math("SINE", t.math("MULTIPLY", circ, 2 * math.pi / 0.9))
    corr = t.math("MULTIPLY", t.math("ABSOLUTE", corr), zones)
    tail = _band(t, z, 4.0, 12.8)                             # fin fairings + tail skirt: deeper corrugation
    corr = t.math("MULTIPLY", corr, t.math("MULTIPLY_ADD", tail, 1.2, 1.0))
    # fairing panel lines every 1.3 m on the tail section
    ft = t.math("ABSOLUTE", t.math("SUBTRACT", t.math("FRACT", t.math("DIVIDE", z, 1.3)), 0.5))
    seam = t.math("MAXIMUM", seam, t.math("MULTIPLY", t.smoothstep(0.47, 0.5, ft), tail))
    # rivet rows above each ring seam
    rv = t.voronoi(t.comb_xyz(circ, z, 0.0), scale=6.0, randomness=0.0)
    rivet = t.math("MULTIPLY", t.smoothstep(0.07, 0.03, rv.outputs["Distance"]), t.smoothstep(0.5, 0.46, d))
    micro = t.noise(P, scale=40.0, detail=3.0)
    height = t.math("MULTIPLY", seam, -1.0)
    height = t.math("MULTIPLY_ADD", vseam, -0.5, height)
    height = t.math("MULTIPLY_ADD", corr, 0.9, height)
    height = t.math("MULTIPLY_ADD", rivet, 0.3, height)
    height = t.math("MULTIPLY_ADD", micro, 0.12, height)
    # roughness: large-scale variation you can see at preview scale
    rough = t.map_range(t.noise(P, scale=0.15, detail=3.0), 0.3, 0.7, 0.25, 0.55)
    rough = t.math("MULTIPLY_ADD", t.noise(P, scale=6.0, detail=2.0), 0.06, rough)
    # grime: streaks running down from every seam, heavier toward the base
    drip = t.smoothstep(0.55, 1.0, fz)
    streak = t.noise(t.vmath("MULTIPLY", P, (5.0, 5.0, 0.15)), scale=1.0, detail=3.0)
    streak = t.map_range(streak, 0.45, 0.75, 0.0, 1.0)
    base_w = t.math("POWER", t.smoothstep(110.0, 0.0, z), 1.5)
    grime = t.math("MULTIPLY", t.math("MULTIPLY", drip, streak), t.math("MULTIPLY_ADD", base_w, 0.8, 0.2))
    grime = t.math("MULTIPLY_ADD", t.math("MULTIPLY", corr, t.math("MULTIPLY", streak, 0.3)), 1.0, grime)
    grime = t.math("MULTIPLY_ADD", t.math("MULTIPLY", tail, streak), 0.6, grime)
    return height, rough, grime


def _frost(t, P, base_col, base_rough, height):
    """Frost band on the S-IC LOX tank, strength keyed via the 'frost' Value."""
    x, y, z = t.sep_xyz(P)
    strength = t.value(0.0, "frost")
    band = t.math("MULTIPLY", t.smoothstep(20.0, 23.0, z), t.smoothstep(39.5, 36.5, z))
    edge = t.noise(t.vmath("MULTIPLY", P, (1.0, 1.0, 0.35)), scale=0.6, detail=4.0)
    edge = t.map_range(edge, 0.35, 0.7, 0.0, 1.0)
    mask = t.math("MULTIPLY", t.math("MULTIPLY", band, edge), strength, clamp=True)
    # runoff streaks below the band
    run = t.math("MULTIPLY", t.smoothstep(12.0, 20.0, z), t.smoothstep(24.0, 20.5, z))
    run_n = t.noise(t.vmath("MULTIPLY", P, (6.0, 6.0, 0.12)), scale=1.0, detail=2.0)
    run = t.math("MULTIPLY", run, t.map_range(run_n, 0.55, 0.75, 0.0, 0.6))
    run = t.math("MULTIPLY", run, strength, clamp=True)
    mask = t.math("MAXIMUM", mask, run)
    crystal = t.noise(P, scale=25.0, detail=4.0)
    col = t.mix_rgb(mask, base_col, (0.93, 0.96, 1.0))
    rough = t.mix_f(mask, base_rough, t.math("MULTIPLY_ADD", crystal, 0.2, 0.72))
    h = t.math("MULTIPLY_ADD", t.math("MULTIPLY", crystal, mask), 0.5, height)
    sheen = t.math("MULTIPLY", mask, 0.7)
    return col, rough, h, sheen


def _paint_base(t, P, dark):
    height, rough, grime = _hull_detail(t, P)
    if dark:
        # matte black paint: base ≤ 0.006 linear, no coat, rough 0.55 (+ a little noise), slight cool specular tint
        base = t.rgb(0.005, 0.005, 0.0055)
        base = t.mix_rgb(t.math("MULTIPLY", grime, 0.5), base, (0.012, 0.011, 0.010))
        rough = t.math("MULTIPLY_ADD", t.noise(P, scale=6.0, detail=2.0), 0.08, 0.58)
        coat = 0.0
    else:
        base = t.rgb(0.86, 0.80, 0.70)      # warm ivory under xenon (S72-54814)
        base = t.mix_rgb(t.math("MULTIPLY", grime, 0.55, clamp=True), base, (0.40, 0.37, 0.33))
        coat = 0.2
    return base, rough, height, coat


DECAL_DIR = "/Users/erisdothard/Syntra-Website/render/assets/tex/decals/"
# image, surface radius (m), width (m), z0, z1 (m above the F-1 exit plane), azimuth (0..1, 0 = +Y, increasing toward +X)
DECALS = (
    # 45° clear gap between the model's raised black quarters (0.875-1.0); S-II text above the aft black ring (z 48-52)
    ("usa_flag.png", 5.09, 3.6, 13.6, 19.0, 0.9375),
    ("united_states.png", 5.09, 1.8, 53.0, 63.8, 0.9375),
)


def _decals(t, P, base):
    """Cylindrically projected decals in VEHICLE space, two copies 180° apart."""
    x, y, z = t.sep_xyz(P)
    ang = t.math("FRACT", t.math("ADD", t.math("DIVIDE", t.math("ARCTAN2", x, y), 2 * math.pi), 0.5))
    for fn, r, w, z0, z1, a0 in DECALS:
        for a in (a0, a0 + 0.5):
            du = t.math("SUBTRACT", t.math("FRACT", t.math("ADD", t.math("SUBTRACT", ang, a), 0.5)), 0.5)
            u = t.math("MULTIPLY_ADD", du, -2 * math.pi * r / w, 0.5)   # viewed from outside, ang runs right→left
            v = t.math("DIVIDE", t.math("SUBTRACT", z, z0), z1 - z0)
            tex = t.image(DECAL_DIR + fn, t.comb_xyz(u, v, 0.0), "sRGB")
            tex.extension = "CLIP"
            base = t.mix_rgb(tex.outputs["Alpha"], base, tex.outputs["Color"])
    return base


def sf_hull(vehicle_obj, palette_img):
    """Sketchfab stack: the meshes pick colours from a palette atlas by UV, so one
    material routes white → paint preset (+decals, frost), grey → engine metal,
    orange → tank interiors."""
    mat, t = new_material("SF_hull")
    P = t.texcoord(vehicle_obj).outputs["Object"]
    pal = t.image(palette_img, colorspace="sRGB", interpolation="Closest")   # atlas cells with dark grid lines: never blend
    r, g, b = t.sep_rgb(pal.outputs["Color"])
    lum = t.math("DIVIDE", t.math("ADD", t.math("ADD", r, g), b), 3.0)
    sat = t.math("SUBTRACT", t.math("MAXIMUM", r, t.math("MAXIMUM", g, b)), t.math("MINIMUM", r, t.math("MINIMUM", g, b)))
    # the author's roll-pattern "black" is a linear 0.271 grey cell; engines are other greys
    # palette cells (linear): roll pattern 0.271, IU trim 0.337 | engines 0.40-0.60 | hull whites 0.67-0.93
    unsat = t.smoothstep(0.15, 0.08, sat)
    black = t.math("MULTIPLY", t.smoothstep(0.37, 0.33, lum), unsat)
    grey = t.math("MULTIPLY", t.math("MULTIPLY", t.smoothstep(0.645, 0.625, lum), unsat), t.math("SUBTRACT", 1.0, black))
    orange = t.smoothstep(0.12, 0.25, sat)
    dbase, drough, dheight, dcoat = _paint_base(t, P, dark=True)
    dark = t.principled(**{
        "Base Color": dbase, "Roughness": drough, "Coat Weight": dcoat, "Coat Roughness": 0.3,
        "Specular IOR Level": 0.15, "Specular Tint": (0.85, 0.88, 0.95, 1.0),
        "Normal": t.bump(dheight, strength=1.0, distance=0.08),
    })
    base, rough, height, coat = _paint_base(t, P, dark=False)
    base = _decals(t, P, base)
    col, rough, height, sheen = _frost(t, P, base, rough, height)
    nrm = t.bump(height, strength=1.0, distance=0.08)
    paint = t.principled(**{
        "Base Color": col, "Roughness": rough, "Coat Weight": coat, "Coat Roughness": 0.3,
        "Normal": nrm, "Sheen Weight": sheen, "Sheen Roughness": 0.6,
    })
    mnoise = t.noise(P, scale=3.0, detail=3.0)
    metal = t.principled(**{
        "Base Color": t.vmath("SCALE", pal.outputs["Color"], scale=0.8),
        "Roughness": t.math("MULTIPLY_ADD", mnoise, 0.2, 0.38), "Metallic": 0.85,
        "Normal": t.bump(t.noise(P, scale=25.0, detail=2.0), strength=0.3, distance=0.01),
    })
    interior = t.principled(**{"Base Color": pal.outputs["Color"], "Roughness": 0.75, "Metallic": 0.0})
    shader = t.mix_shader(black, paint.outputs[0], dark.outputs[0])
    shader = t.mix_shader(grey, shader, metal.outputs[0])
    shader = t.mix_shader(orange, shader, interior.outputs[0])
    t.out(shader)
    return mat


def vehicle_paint(vehicle_obj, dark=False):
    name = "SV_dark" if dark else "SV_paint"
    mat, t = new_material(name)
    P = t.texcoord(vehicle_obj).outputs["Object"]
    base, rough, height, coat = _paint_base(t, P, dark)
    col, rough, height, sheen = _frost(t, P, base, rough, height)
    nrm = t.bump(height, strength=1.0, distance=0.08)
    kw = {
        "Base Color": col, "Roughness": rough, "Metallic": 0.0,
        "Coat Weight": coat, "Coat Roughness": 0.3, "Normal": nrm,
        "Sheen Weight": sheen, "Sheen Roughness": 0.6,
    }
    if dark:
        kw.update({"Specular IOR Level": 0.15, "Specular Tint": (0.85, 0.88, 0.95, 1.0)})
    bsdf = t.principled(**kw)
    t.out(bsdf.outputs[0])
    return mat


def vehicle_decal(vehicle_obj, src_mat):
    """Decal = hull paint × ink.  The flag sheet (SATURNVT) has a solid navy fill
    around the flags, which the original Maya shader keyed out; do the same."""
    color, img = _src_info(src_mat)
    mat, t = new_material("SV_decal_" + src_mat.name)
    P = t.texcoord(vehicle_obj).outputs["Object"]
    base, rough, height, coat = _paint_base(t, P, dark=False)
    if img:
        tex = t.image(img, colorspace="sRGB")
        r, g, b = t.sep_rgb(tex.outputs["Color"])
        # image node outputs LINEAR: navy fill ≈ (0.0001, 0.0000, 0.16), flag canton ≈ (0.04, 0.04, 0.16)
        navy = t.math("MULTIPLY", t.math("LESS_THAN", r, 0.012), t.math("LESS_THAN", g, 0.012))
        navy = t.math("MULTIPLY", navy, t.math("GREATER_THAN", b, 0.06))
        ink = t.mix_rgb(navy, tex.outputs["Color"], (1.0, 1.0, 1.0))
        # the sheet's red is pink; pull anything red-dominant to true insignia red (#B8112A)
        redness = t.math("SUBTRACT", r, t.math("MAXIMUM", g, b))
        red_mask = t.smoothstep(0.08, 0.3, redness)
        ink = t.mix_rgb(red_mask, ink, (0.48, 0.005, 0.022))
        base = t.vmath("MULTIPLY", base, ink)
    col, rough, height, sheen = _frost(t, P, base, rough, height)
    nrm = t.bump(height, strength=1.0, distance=0.08)
    bsdf = t.principled(**{
        "Base Color": col, "Roughness": rough, "Coat Weight": coat, "Coat Roughness": 0.3,
        "Normal": nrm, "Sheen Weight": sheen, "Sheen Roughness": 0.6,
    })
    t.out(bsdf.outputs[0])
    return mat


def _metal_tex_set(t, vec, prefix, scale):
    """Box-projected PBR set (Diffuse / Rough / Displacement [/ Metal])."""
    m = t.mapping(vec, scale=(scale, scale, scale))
    dif = t.tex(f"{prefix}_Diffuse_2k.jpg", m, "sRGB", "BOX")
    rough = t.tex(f"{prefix}_Rough_2k.jpg", m, "Non-Color", "BOX")
    disp = t.tex(f"{prefix}_Displacement_2k.jpg", m, "Non-Color", "BOX")
    ao = t.tex(f"{prefix}_AO_2k.jpg", m, "Non-Color", "BOX")
    return dif.outputs["Color"], rough.outputs["Color"], disp.outputs["Color"], ao.outputs["Color"]


def vehicle_metal(vehicle_obj, src_mat):
    color, _ = _src_info(src_mat)
    mat, t = new_material("SV_metal_" + src_mat.name)
    P = t.texcoord(vehicle_obj).outputs["Object"]
    rusty = src_mat.name.startswith("blinn4")
    prefix = "rusty_metal_02" if rusty else "metal_plate"
    dif, rough, disp, ao = _metal_tex_set(t, P, prefix, 0.45)
    tint = tuple(c * 0.75 for c in color[:3])
    col = t.mix_rgb(1.0, dif, dif)
    col = t.vmath("MULTIPLY", col, tint)
    col = t.vmath("MULTIPLY", col, ao)
    nrm = t.bump(disp, strength=0.5, distance=0.01)
    bsdf = t.principled(**{
        "Base Color": col, "Roughness": t.math("MULTIPLY_ADD", rough, 0.7, 0.2),
        "Metallic": 0.6 if rusty else 0.85, "Normal": nrm,
    })
    t.out(bsdf.outputs[0])
    return mat


def vehicle_nozzle(vehicle_obj):
    """F-1 bells: dark Inconel tube wall with burnished banding; blackbody glow
    keyed to ignition (zero until frame 87)."""
    mat, t = new_material("SV_nozzle")
    P = t.texcoord(vehicle_obj).outputs["Object"]
    x, y, z = t.sep_xyz(P)
    tubes = t.noise(t.vmath("MULTIPLY", P, (1.0, 1.0, 0.04)), scale=60.0, detail=1.0)
    bands = t.math("MULTIPLY_ADD", t.math("SINE", t.math("MULTIPLY", z, 9.0)), 0.5, 0.5)
    tint = t.noise(P, scale=3.0, detail=2.0)
    # neutral grey-black (#232323..#2C2C2C), no warm hue; banding lives in roughness only
    col = t.mix_rgb(t.math("MULTIPLY", tint, 0.6), (0.0168, 0.0168, 0.0168), (0.0262, 0.0262, 0.0262))
    nrm = t.bump(t.math("MULTIPLY", tubes, 0.7), strength=0.6, distance=0.01)
    rough = t.math("MULTIPLY_ADD", bands, 0.10, 0.45)
    ig = t.value(0.0, "ignition")
    heat = t.math("MULTIPLY", ig, t.smoothstep(4.5, 0.5, z))
    temp = t.math("MULTIPLY_ADD", heat, 400.0, 900.0)
    bsdf = t.principled(**{
        "Base Color": col, "Roughness": rough, "Metallic": 0.9, "Normal": nrm, "Anisotropic": 0.6,
        "Emission Color": t.blackbody(temp), "Emission Strength": t.math("MULTIPLY", heat, 2.0),
    })
    t.out(bsdf.outputs[0])
    return mat


def build_vehicle_materials(objects, vehicle_obj):
    """Replace every imported Saturn V material in place; returns kind counts."""
    cache = {}
    counts = {}
    paint = vehicle_paint(vehicle_obj, dark=False)
    dark = vehicle_paint(vehicle_obj, dark=True)
    nozzle = vehicle_nozzle(vehicle_obj)
    for ob in objects:
        if ob.type != "MESH":
            continue
        for slot in ob.material_slots:
            src = slot.material
            if src is None or src.name.startswith("SV_"):
                continue
            if src not in cache:
                color, _ = _src_info(src)
                kind = classify(src.name, color)
                if src.name.startswith("blinn10SG"):
                    kind = "paint"      # S-II "UNITED STATES" sheet: model UVs scramble it; plain paint instead
                counts[kind] = counts.get(kind, 0) + 1
                if kind == "paint":
                    cache[src] = paint
                elif kind == "dark":
                    cache[src] = dark
                elif kind == "nozzle":
                    cache[src] = nozzle
                elif kind == "metal":
                    cache[src] = vehicle_metal(vehicle_obj, src)
                else:
                    cache[src] = vehicle_decal(vehicle_obj, src)
            slot.material = cache[src]
    return counts


# ---------------------------------------------------------------- mobile launcher

def build_ml_materials(ml_obj):
    for slot in ml_obj.material_slots:
        src = slot.material
        if src is None:
            continue
        railings = "railing" in src.name.lower()
        _, img = _src_info(src)
        mat, t = new_material("ML_railings" if railings else "ML_steel")
        tex = t.image(img, colorspace="sRGB") if img else None
        base = tex.outputs["Color"] if tex else (0.5, 0.5, 0.5)
        tint = (0.58, 0.60, 0.64) if railings else (0.50, 0.52, 0.56)
        col = t.vmath("MULTIPLY", base, tint)
        W = t.node("ShaderNodeNewGeometry").outputs["Position"]          # world metres (ML never moves)
        wx, wy, wz = t.sep_xyz(W)
        tower = t.math("MULTIPLY", t.smoothstep(14.0, 17.0, wz), t.smoothstep(15.0, 20.0, wx))
        lum = t.math("MULTIPLY_ADD", t.sep_rgb(base)[0], 0.8, 0.5)     # keep the texture's shading
        oxide = t.vmath("SCALE", t.rgb(0.19, 0.045, 0.022), scale=lum)  # #8C2E1E red-orange primer
        col = t.mix_rgb(tower, col, oxide)
        P = t.texcoord().outputs["Object"]
        grime = t.noise(t.vmath("MULTIPLY", P, (1.0, 1.0, 0.25)), scale=3.0, detail=3.0)
        col = t.mix_rgb(t.map_range(grime, 0.5, 0.8, 0.0, 0.5), col, (0.16, 0.13, 0.11))
        rough = t.math("MULTIPLY_ADD", t.noise(P, scale=8.0), 0.25, 0.45)
        rough = t.mix_f(tower, rough, t.math("MULTIPLY_ADD", t.noise(P, scale=8.0), 0.15, 0.55))
        kw = {"Base Color": col, "Roughness": rough, "Metallic": t.mix_f(tower, 0.55, 0.1)}
        if railings and tex:
            kw["Alpha"] = tex.outputs["Alpha"]
        bsdf = t.principled(**kw)
        t.out(bsdf.outputs[0])
        mat.use_backface_culling = False
        slot.material = mat


# ---------------------------------------------------------------- ground / site

def concrete(name="Concrete_pad", tile=24.0, scorch=True, dark=0.0):
    """Pad concrete: pale, low-contrast, tiled at `tile` m.  Bump is weak and fades
    with camera depth so a 60 MW plume does not turn the apron into gravel."""
    mat, t = new_material(name)
    uv = t.texcoord().outputs["UV"]
    m = t.mapping(uv, scale=(12.0 / tile,) * 3)          # UVs were laid out at 12 m per tile
    dif = t.tex("concrete_floor_worn_02_Diffuse_2k.jpg", m, "sRGB")
    rough = t.tex("concrete_floor_worn_02_Rough_2k.jpg", m, "Non-Color")
    nor = t.tex("concrete_floor_worn_02_nor_gl_2k.jpg", m, "Non-Color")
    disp = t.tex("concrete_floor_worn_02_Displacement_2k.jpg", m, "Non-Color")
    P = t.texcoord().outputs["Object"]
    flat = (0.55 - dark, 0.52 - dark, 0.48 - dark)
    depth = t.node("ShaderNodeCameraData").outputs["View Z Depth"]
    fade = t.smoothstep(220.0, 40.0, depth)
    # texture only tints the flat tone, and even less with distance (grazing plume light otherwise
    # turns the roughness/albedo variation into gravel speckle)
    col = t.mix_rgb(t.math("MULTIPLY_ADD", fade, -0.3, 0.9), dif.outputs["Color"], flat)
    big = t.noise(P, scale=0.012, detail=3.0)
    col = t.mix_rgb(t.map_range(big, 0.4, 0.7, 0.0, 0.25), col, (0.30, 0.29, 0.27))
    if scorch:
        r = t.vmath("LENGTH", t.vmath("MULTIPLY", P, (1.0, 0.65, 0.0)))
        soot = t.smoothstep(75.0, 22.0, r)
        col = t.mix_rgb(t.math("MULTIPLY", soot, 0.45), col, (0.12, 0.11, 0.10))
    nrm = t.normal_map(nor.outputs["Color"], 1.0)
    # NormalMap strength is a socket: scale it by the depth fade
    nm_node = nrm.node
    t.feed(nm_node.inputs["Strength"], t.math("MULTIPLY", fade, 0.5))
    bump = t.node("ShaderNodeBump")
    t.feed(bump.inputs["Strength"], t.math("MULTIPLY", fade, 0.12))
    bump.inputs["Distance"].default_value = 0.05
    t.feed(bump.inputs["Height"], disp.outputs["Color"])
    t.l.new(nrm, bump.inputs["Normal"])
    bsdf = t.principled(**{
        "Base Color": col,
        "Roughness": t.mix_f(fade, 0.72, t.math("MULTIPLY_ADD", rough.outputs["Color"], 0.25, 0.55)),
        "Normal": bump.outputs[0],
    })
    t.out(bsdf.outputs[0])
    return mat


def simple(name, color, rough=0.8, metallic=0.0, emit=None, emit_strength=0.0):
    mat, t = new_material(name)
    kw = {"Base Color": (*color, 1.0), "Roughness": rough, "Metallic": metallic}
    if emit:
        kw["Emission Color"] = (*emit, 1.0)
        kw["Emission Strength"] = emit_strength
    bsdf = t.principled(**kw)
    t.out(bsdf.outputs[0])
    return mat


def water():
    mat, t = new_material("Water")
    P = t.texcoord().outputs["Object"]
    rip = t.noise(t.vmath("MULTIPLY", P, (1.0, 0.3, 1.0)), scale=0.15, detail=5.0, roughness=0.6)
    nrm = t.bump(rip, strength=0.08, distance=0.5)
    bsdf = t.principled(**{
        "Base Color": (0.004, 0.007, 0.01, 1.0), "Roughness": 0.06, "Metallic": 0.0,
        "Specular IOR Level": 0.6, "Normal": nrm,
    })
    t.out(bsdf.outputs[0])
    return mat


def fog_volume():
    """Height-falloff scatter for aerial perspective; density keyed by altitude."""
    mat, t = new_material("Fog")
    P = t.texcoord().outputs["Object"]
    x, y, z = t.sep_xyz(P)
    dens0 = t.value(0.00008, "fog")
    fall = t.math("EXPONENT", t.math("MULTIPLY", z, -1.0 / 110.0))
    wisps = t.noise(t.vmath("MULTIPLY", P, (1.0, 1.0, 3.0)), scale=0.004, detail=2.0)
    wisps = t.map_range(wisps, 0.3, 0.7, 0.55, 1.3)
    dens = t.math("MULTIPLY", t.math("MULTIPLY", dens0, fall), wisps)
    vol = t.node("ShaderNodeVolumeScatter")
    t.feed(vol.inputs["Density"], dens)
    vol.inputs["Anisotropy"].default_value = 0.15
    vol.inputs["Color"].default_value = (0.85, 0.88, 0.95, 1.0)
    t.out(None, volume=vol.outputs[0])
    return mat


# ---------------------------------------------------------------- world + limb

def _stars(t, d, scale, gate, gain):
    v = t.voronoi(d, scale=scale, randomness=1.0)
    r, g, b = t.sep_rgb(v.outputs["Color"])
    disc = t.smoothstep(0.11, 0.03, v.outputs["Distance"])
    mag = t.math("POWER", t.map_range(r, gate, 1.0, 0.0, 1.0), 3.0)
    tint = t.mix_rgb(g, (0.72, 0.80, 1.0), (1.0, 0.90, 0.74))
    lum = t.math("MULTIPLY", t.math("MULTIPLY", disc, mag), gain)
    return t.vmath("MULTIPLY", tint, t.comb_xyz(lum, lum, lum))


def world(hdri_path, rot_z, hdri_strength):
    w = bpy.data.worlds.get("LaunchWorld") or bpy.data.worlds.new("LaunchWorld")
    try:
        w.use_nodes = True
    except Exception:
        pass
    w.node_tree.nodes.clear()
    t = NT(w.node_tree)
    d = t.texcoord().outputs["Generated"]
    m = t.mapping(d, rot=(0.0, 0.0, rot_z))
    env = t.node("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(hdri_path, check_existing=True)
    t.feed(env.inputs["Vector"], m)
    alt = t.value(0.0, "altitude")
    ig = t.value(0.0, "ignition")
    sky = t.vmath("SCALE", env.outputs["Color"], scale=hdri_strength)
    # ignition tints the low sky ember (site Sky.tsx)
    x, y, z = t.sep_xyz(d)
    low = t.smoothstep(0.35, 0.0, z)
    ember = t.vmath("SCALE", t.rgb(1.0, 0.42, 0.12), scale=t.math("MULTIPLY", t.math("MULTIPLY", ig, low), 0.02))
    sky = t.vmath("ADD", sky, ember)
    stars = t.vmath("ADD", _stars(t, d, 260.0, 0.93, 3.5), _stars(t, d, 700.0, 0.96, 1.0))
    stars = t.vmath("SCALE", stars, scale=t.math("MULTIPLY_ADD", alt, 0.75, 0.25))
    stars = t.vmath("MULTIPLY", stars, t.comb_xyz(*(t.smoothstep(-0.02, 0.08, z),) * 3))
    space = t.vmath("SCALE", sky, scale=t.math("SUBTRACT", 1.0, alt))
    col = t.vmath("ADD", space, stars)
    bg = t.node("ShaderNodeBackground")
    t.feed(bg.inputs["Color"], col)
    bg.inputs["Strength"].default_value = 1.0
    outn = t.node("ShaderNodeOutputWorld")
    t.l.new(bg.outputs[0], outn.inputs["Surface"])
    return w


def limb():
    """Earth limb backdrop (Sky.tsx port): emissive below the limb line, airglow
    band on it, transparent above.  Object-space z of the backdrop plane is in
    metres; 'limb_z' and 'altitude' are keyed."""
    mat, t = new_material("EarthLimb")
    P = t.texcoord().outputs["Object"]
    x, y, z = t.sep_xyz(P)
    alt = t.value(0.0, "altitude")
    limb_z = t.value(0.0, "limb_z")
    curve = t.math("MULTIPLY", t.math("POWER", t.math("DIVIDE", x, 1932.0), 2.0), 239.0)
    hz = t.math("SUBTRACT", limb_z, curve)
    arc = t.math("DIVIDE", t.math("SUBTRACT", z, hz), 1380.0)
    earth = t.math("SUBTRACT", 1.0, t.smoothstep(-0.003, 0.003, arc))
    a = t.math("MAXIMUM", arc, 0.0)
    glow = t.math("EXPONENT", t.math("MULTIPLY", a, -150.0))
    glow = t.math("MULTIPLY_ADD", t.math("EXPONENT", t.math("MULTIPLY", a, -30.0)), 0.35, glow)
    haze = t.math("MULTIPLY", t.math("EXPONENT", t.math("MULTIPLY", a, -8.0)), 0.30)
    band = t.math("MULTIPLY_ADD", glow, 0.85, haze)
    limb_col = t.vmath("SCALE", t.rgb(0.30, 0.58, 1.0), scale=t.math("MULTIPLY", band, 4.0))
    earth_col = t.rgb(0.006, 0.010, 0.019)
    col = t.mix_rgb(earth, limb_col, earth_col)
    vis = t.smoothstep(0.5, 0.72, alt)
    alpha = t.math("MULTIPLY", t.math("MINIMUM", t.math("ADD", earth, band), 1.0), vis)
    emis = t.emission(col, strength=1.0)
    trans = t.node("ShaderNodeBsdfTransparent").outputs[0]
    t.out(t.mix_shader(alpha, trans, emis))
    return mat
