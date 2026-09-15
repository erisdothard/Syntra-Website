"""Scene assembly: model import + real-metre placement, site geometry, lights,
camera rig and per-frame keyframes, fluid hooks.  Everything in metres, Z up.
"""
import math
import bmesh
import bpy
from mathutils import Vector
import lib_materials as M
from lib_nodes import set_linear
from lib_timeline import SITE_UNIT, ENGINE_PLANE_Z, frame_state, FRAME_COUNT, smoothstep, lerp

ROOT = "/Users/erisdothard/Syntra-Website/render/"
MODELS = ROOT + "assets/models/"
SV_HEIGHT = 110.6
ML_SCALE = 10.6 * SITE_UNIT          # 48.76 file-units → metres
TRENCH_W, TRENCH_D, TRENCH_DEPTH = 9 * SITE_UNIT, 15 * SITE_UNIT, 14.0   # 41.4 × 69 × 14 m
GROUND_HALF = 400.0
ML_Z = -1.0
LIMB_Y = 1500.0


# ------------------------------------------------------------------ utilities

def collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def move_to(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def world_bbox(objs):
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in objs:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


def empty(name, loc=(0, 0, 0), col=None, display="PLAIN_AXES", size=1.0):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = display
    e.empty_display_size = size
    e.location = loc
    (col or bpy.context.scene.collection).objects.link(e)
    return e


def mesh_obj(name, bm, col, mat=None, uv_scale=None):
    me = bpy.data.meshes.new(name)
    if uv_scale:
        uv = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            n = f.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            for l in f.loops:
                co = l.vert.co
                if ax == 2:
                    l[uv].uv = (co.x / uv_scale, co.y / uv_scale)
                elif ax == 1:
                    l[uv].uv = (co.x / uv_scale, co.z / uv_scale)
                else:
                    l[uv].uv = (co.y / uv_scale, co.z / uv_scale)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    if mat:
        me.materials.append(mat)
    return ob


def box_bm(sx, sy, sz, cz=0.0, open_top=False):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz + cz))
    if open_top:
        top = [f for f in bm.faces if f.normal.z > 0.5]
        bmesh.ops.delete(bm, geom=top, context="FACES")
    bm.normal_update()
    return bm


# ------------------------------------------------------------------ models

def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before]
    # the importer keys node transforms; a later frame_set would snap scale/loc back to file values
    for o in objs:
        if o.animation_data:
            o.animation_data_clear()
    return objs


def build_vehicle(col):
    objs = import_glb(MODELS + "saturn-v.src.glb")
    bpy.context.view_layer.update()
    lo, hi = world_bbox(objs)
    print(f"[vehicle] raw bbox lo={fmt(lo)} hi={fmt(hi)} size={fmt(hi - lo)}")
    scale = SV_HEIGHT / (hi.z - lo.z)
    cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
    root = empty("VEHICLE", (0, 0, ENGINE_PLANE_Z), col, "ARROWS", 10.0)
    model = empty("VEHICLE_MODEL", (-cx * scale, -cy * scale, -lo.z * scale), col)
    model.scale = (scale,) * 3
    model.parent = root
    for o in objs:
        move_to(o, col)
        if o.parent is None:
            o.parent = model
    bpy.context.view_layer.update()
    lo2, hi2 = world_bbox(objs)
    print(f"[vehicle] scale={scale:.4f} placed bbox lo={fmt(lo2)} hi={fmt(hi2)} "
          f"height={hi2.z - lo2.z:.2f} m, engine plane z={lo2.z:.2f}, axis x={(lo2.x + hi2.x) / 2:.2f} "
          f"y={(lo2.y + hi2.y) / 2:.2f}")
    body = [o for o in objs if o.name.startswith("pCylinder1")]
    if body:
        blo, bhi = world_bbox(body)
        print(f"[vehicle] S-IC body diameter ≈ {bhi.x - blo.x:.2f} m (real 10.06)")
    bells = [o for o in objs if o.name.startswith("polySurfa")]
    blo, bhi = world_bbox(bells)
    print(f"[vehicle] F-1 bells z {blo.z:.2f}..{bhi.z:.2f}, cluster x {blo.x:.1f}..{bhi.x:.1f} y {blo.y:.1f}..{bhi.y:.1f}")
    counts = M.build_vehicle_materials(objs, root)
    print(f"[vehicle] material kinds: {counts}")
    for o in objs:
        if o.type == "MESH":
            for p in o.data.polygons:
                p.use_smooth = True
    plume = empty("PLUME_ORIGIN", (0, 0, 0), col, "SPHERE", 3.0)
    plume.parent = root
    return root, objs


def build_launcher(col):
    objs = import_glb(MODELS + "mobile-launcher.src.glb")
    ml = [o for o in objs if o.type == "MESH"][0]
    ml.name = "MOBILE_LAUNCHER"
    move_to(ml, col)
    ml.scale = tuple(s * ML_SCALE for s in ml.scale)
    ml.location = (0.0, 0.0, ML_Z)     # deck top measured at 14.0 m in the file; SPEC wants ≈ 13
    bpy.context.view_layer.update()
    lo, hi = world_bbox([ml])
    print(f"[ML] placed bbox lo={fmt(lo)} hi={fmt(hi)} height={hi.z - lo.z:.1f} m, tower reaches x={hi.x:.1f} (+X)")
    # deck height: densest horizontal vertex band between 5 and 25 m
    hist = {}
    mw = ml.matrix_world
    for v in ml.data.vertices:
        z = (mw @ v.co).z
        if 5 < z < 25:
            hist[round(z * 2) / 2] = hist.get(round(z * 2) / 2, 0) + 1
    top = sorted(hist.items(), key=lambda kv: -kv[1])[:4]
    print(f"[ML] deck vertex bands (z m: count): {top}")
    M.build_ml_materials(ml)
    for p in ml.data.polygons:
        p.use_smooth = False
    return ml


# ------------------------------------------------------------------ site

def build_ground(col):
    con = M.concrete("Concrete_pad", scorch=True)
    G, hx, hy = GROUND_HALF, TRENCH_W / 2, TRENCH_D / 2
    bm = bmesh.new()
    o = [bm.verts.new(v) for v in ((-G, -G, 0), (G, -G, 0), (G, G, 0), (-G, G, 0))]
    i = [bm.verts.new(v) for v in ((-hx, -hy, 0), (hx, -hy, 0), (hx, hy, 0), (-hx, hy, 0))]
    for a, b in ((0, 1), (1, 2), (2, 3), (3, 0)):
        bm.faces.new((o[a], o[b], i[b], i[a]))
    bm.normal_update()
    ground = mesh_obj("GROUND", bm, col, con, uv_scale=12.0)
    # trench: floor + walls, scorched
    tcon = M.concrete("Concrete_trench", scorch=True, dark=0.15)
    bm = box_bm(TRENCH_W, TRENCH_D, TRENCH_DEPTH, cz=-TRENCH_DEPTH / 2, open_top=True)
    for f in bm.faces:
        f.normal_flip()
    mesh_obj("TRENCH_WALLS", bm, col, tcon, uv_scale=12.0)
    # wedge flame deflector, ridge along X, splitting the flow to ±Y
    bm = bmesh.new()
    hw, hd, zb, zt = hx - 0.3, 21.0, -TRENCH_DEPTH, -1.2
    v = [bm.verts.new(c) for c in ((-hw, -hd, zb), (hw, -hd, zb), (hw, hd, zb), (-hw, hd, zb),
                                   (-hw, 0, zt), (hw, 0, zt))]
    bm.faces.new((v[0], v[1], v[5], v[4]))
    bm.faces.new((v[2], v[3], v[4], v[5]))
    bm.faces.new((v[0], v[4], v[3]))
    bm.faces.new((v[1], v[2], v[5]))
    bm.normal_update()
    mesh_obj("FLAME_DEFLECTOR", bm, col, M.simple("Deflector", (0.05, 0.045, 0.04), rough=0.85), uv_scale=12.0)
    # crawlerway: two gravel lanes toward -Y
    gravel = M.simple("Crawlerway", (0.10, 0.095, 0.085), rough=0.97)
    for cx in (-13.5, 13.5):
        bm = box_bm(12.0, 380.0, 0.08, cz=0.04)
        for vv in bm.verts:
            vv.co.x += cx
            vv.co.y -= 235.0
        mesh_obj(f"CRAWLERWAY_{'L' if cx < 0 else 'R'}", bm, col, gravel)
    # scrub ground beyond the concrete, then flat water to the horizon
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=660.0, fill_type="NGON", location=(0, 0, -0.2))
    scrub = bpy.context.active_object
    scrub.name = "SCRUB"
    move_to(scrub, col)
    scrub.data.materials.append(M.simple("Scrub", (0.030, 0.034, 0.020), rough=0.95))
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=6000.0, fill_type="NGON", location=(0, 0, -0.5))
    wat = bpy.context.active_object
    wat.name = "WATER"
    move_to(wat, col)
    wat.data.materials.append(M.water())
    # treeline: two jagged rings
    tree = M.simple("Treeline", (0.008, 0.012, 0.006), rough=0.95)
    import random
    rng = random.Random(7)
    for k, (r, hmin, hmax) in enumerate(((600.0, 7.0, 16.0), (650.0, 9.0, 22.0))):
        bm = bmesh.new()
        n = 360
        base, top = [], []
        for j in range(n):
            a = 2 * math.pi * j / n
            h = rng.uniform(hmin, hmax)
            base.append(bm.verts.new((r * math.cos(a), r * math.sin(a), -0.5)))
            top.append(bm.verts.new((r * math.cos(a), r * math.sin(a), h)))
        for j in range(n):
            k2 = (j + 1) % n
            bm.faces.new((base[j], base[k2], top[k2], top[j]))
        bm.normal_update()
        mesh_obj(f"TREELINE_{k}", bm, col, tree)
    return ground


def build_structures(col):
    dark = M.simple("DarkSteel", (0.03, 0.03, 0.033), rough=0.7, metallic=0.5)
    beacon = M.simple("Beacon", (0.6, 0.02, 0.02), rough=0.4, emit=(1.0, 0.08, 0.03), emit_strength=40.0)
    # lightning masts (Gantry.tsx positions ×4.6, site z → Blender -y)
    for i, (sx, sz) in enumerate(((22, -30), (-26, -34), (34, -48))):
        x, y = sx * SITE_UNIT, -sz * SITE_UNIT
        h = 38 * SITE_UNIT
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.55 * SITE_UNIT, radius2=0.18 * SITE_UNIT,
                                        depth=h, location=(x, y, h / 2))
        m = bpy.context.active_object
        m.name = f"MAST_{i}"
        move_to(m, col)
        m.data.materials.append(dark)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.9, location=(x, y, h + 1.0))
        b = bpy.context.active_object
        b.name = f"MAST_BEACON_{i}"
        move_to(b, col)
        b.data.materials.append(beacon)
    # tank farm silhouettes
    for i, (sx, sz, r) in enumerate(((-40, -52, 6), (-32, -58, 5), (46, -62, 7))):
        R = r * SITE_UNIT * 0.55
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=R,
                                             location=(sx * SITE_UNIT, -sz * SITE_UNIT, R * 1.1))
        t = bpy.context.active_object
        t.name = f"TANK_{i}"
        move_to(t, col)
        t.data.materials.append(dark)
    # red beacons on the tower cap
    for i, (sx, sz) in enumerate(((3.4, -1.6), (5.6, -1.6), (3.4, 1.6), (5.6, 1.6))):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.6,
                                             location=(sx * SITE_UNIT, -sz * SITE_UNIT, 26.4 * SITE_UNIT))
        b = bpy.context.active_object
        b.name = f"TOWER_BEACON_{i}"
        move_to(b, col)
        b.data.materials.append(beacon)


def build_fog(col):
    bm = box_bm(1800.0, 1800.0, 320.0, cz=160.0)
    fog = mesh_obj("FOG_VOLUME", bm, col, M.fog_volume())
    fog.display_type = "WIRE"
    fog.visible_shadow = False
    return fog


def build_limb(col):
    bm = bmesh.new()
    v = [bm.verts.new(c) for c in ((-5000, 0, -800), (5000, 0, -800), (5000, 0, 3000), (-5000, 0, 3000))]
    bm.faces.new(v)
    bm.normal_update()
    limb = mesh_obj("EARTH_LIMB", bm, col, M.limb())
    limb.location = (0, LIMB_Y, 0)
    for attr in ("visible_shadow", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
        setattr(limb, attr, False)
    return limb


# ------------------------------------------------------------------ lights

def _kelvin(light, k):
    if hasattr(light, "use_temperature"):
        light.use_temperature = True
        light.temperature = k
        return
    # crude fallback
    t = k / 100.0
    r = 1.0 if t <= 66 else min(1.0, 1.292936 * (t - 60) ** -0.1332)
    g = min(1.0, 0.390082 * math.log(t) - 0.631841) if t <= 66 else min(1.0, 1.129891 * (t - 60) ** -0.0755)
    b = 1.0 if t >= 66 else (0.0 if t <= 19 else min(1.0, 0.543207 * math.log(t - 10) - 1.196254))
    light.color = (r, g, b)


def add_light(name, kind, loc, col, energy, kelvin=None, color=None, size=None, spread=None, radius=None):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    if kelvin:
        _kelvin(ld, kelvin)
    if color:
        ld.color = color
    if kind == "AREA":
        ld.shape = "SQUARE"
        ld.size = size or 1.0
        if spread is not None:
            ld.spread = math.radians(spread)
    if kind == "POINT" and radius is not None:
        ld.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    col.objects.link(ob)
    return ob


def track(ob, target):
    c = ob.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    return c


FLOODS = (
    # name, azimuth°, radius, height, aim z, spread°, kW, kelvin   (camera lives at az ≈ -98°)
    ("key_L", -132, 320, 12, 55, 26, 120.0, 5600),
    ("fill_R", -52, 280, 10, 50, 30, 50.0, 4300),
    ("key_W", 176, 300, 14, 60, 26, 85.0, 5600),
    ("back_X", 22, 360, 9, 70, 22, 35.0, 3800),
    ("rim_NE", 66, 380, 15, 75, 24, 65.0, 5600),
    ("rim_NW", 121, 340, 12, 65, 24, 55.0, 4300),
)


def build_lights(col, flood_mult=1.0, sodium_kw=3.0):
    pole_mat = M.simple("Pole", (0.06, 0.06, 0.065), rough=0.6, metallic=0.6)
    floods = []
    for i, (tag, az, r, h, aim_z, spread, kw, kelvin) in enumerate(FLOODS):
        x, y = r * math.cos(math.radians(az)), r * math.sin(math.radians(az))
        aim = empty(f"FLOOD_AIM_{i}", (0, 0, aim_z), col)
        L = add_light(f"FLOOD_{i}_{tag}", "AREA", (x, y, h), col, kw * 1000.0 * flood_mult,
                      kelvin=kelvin, size=1.2, spread=spread)
        track(L, aim)
        floods.append(L)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.45, depth=h - 1.0, location=(x, y, (h - 1.0) / 2))
        p = bpy.context.active_object
        p.name = f"FLOOD_POLE_{i}"
        move_to(p, col)
        p.data.materials.append(pole_mat)
    # warm sodium lights: ML deck corners, apron poles, and two inside the tower truss
    for i, (loc, kw) in enumerate((((-13.0, -19.5, 15.0), 0.5), ((-13.0, 19.5, 15.0), 0.5), ((19.0, -19.5, 15.0), 0.5),
                                   ((-62.0, -58.0, 9.0), 1.0), ((58.0, -74.0, 9.0), 1.0), ((-70.0, 40.0, 9.0), 1.0),
                                   ((27.0, 0.0, 40.0), 0.7), ((27.0, 0.0, 85.0), 0.7))):
        warm = (1.0, 0.72, 0.45) if i < 3 else (1.0, 0.52, 0.16)      # deck lights ≈ 3200 K, apron stays sodium
        add_light(f"SODIUM_{i}", "POINT", loc, col, sodium_kw * 1000.0 * kw, color=warm, radius=0.25)
    return floods


def build_moon(col, az_deg=-135.0, elev_deg=17.0, strength=0.06):
    """Weak cool sun matching the HDRI moon so the shadow side and the vehicle at
    altitude keep a rim; the HDRI itself is too dim at pad exposure to do it."""
    ld = bpy.data.lights.new("MOON", "SUN")
    ld.energy = strength
    ld.color = (0.72, 0.80, 1.0)
    ld.angle = math.radians(0.6)
    ob = bpy.data.objects.new("MOON", ld)
    col.objects.link(ob)
    az, el = math.radians(az_deg), math.radians(elev_deg)
    ob.location = (300 * math.cos(az) * math.cos(el), 300 * math.sin(az) * math.cos(el), 300 * math.sin(el))
    track(ob, bpy.data.objects.get("FLOOD_AIM_1") or empty("MOON_AIM", (0, 0, 40), col))
    return ob


# ------------------------------------------------------------------ camera + animation

def build_camera(col, look):
    rig = empty("CAM_RIG", (0, -200, 50), col, "ARROWS", 5.0)
    track(rig, look)
    cd = bpy.data.cameras.new("LaunchCam")
    cd.sensor_fit = "HORIZONTAL"
    cd.sensor_width = 36.0
    cd.sensor_height = 24.0
    cd.lens = 35.0
    cd.clip_start = 0.5
    cd.clip_end = 20000.0
    cd.dof.use_dof = True
    cd.dof.focus_object = look
    cd.dof.aperture_fstop = 11.0
    cd.dof.aperture_blades = 7
    cam = bpy.data.objects.new("CAMERA", cd)
    cam.parent = rig
    col.objects.link(cam)
    bpy.context.scene.camera = cam
    return rig, cam


def _linear(ob):
    set_linear(ob)


def fstop_for(p):
    act1 = smoothstep(0.03, 0.12, p) * (1 - smoothstep(0.30, 0.40, p))
    return lerp(11.0, 4.0, act1)


def limb_z_for(s):
    cx, cy, cz = s["cam"]
    veh_bottom = s["vehicle_z"]
    dist = math.hypot(cx, cy)
    elev = math.degrees(math.atan2(veh_bottom - cz, dist)) - 14.0
    elev = max(-1.0, min(30.0, elev))
    return cz + (LIMB_Y - cy) * math.tan(math.radians(elev))


def animate(vehicle, rig, cam, look, states):
    for s in states:
        f = s["frame"]
        a = (s["ignition"] * 0.05 + s["pressure"] * 0.012) * (1 - s["altitude"] * 0.6) * SITE_UNIT * 0.5
        jx = math.sin(f * 2.17) * a + math.sin(f * 3.71) * a * 0.5
        jy = math.sin(f * 1.93 + 1.0) * a
        vehicle.location = (jx, jy, s["vehicle_z"])
        vehicle.rotation_euler = (0.0, s["lift"] * 0.09, 0.0)
        vehicle.keyframe_insert("location", frame=f)
        vehicle.keyframe_insert("rotation_euler", frame=f)
        rig.location = s["cam"]
        rig.keyframe_insert("location", frame=f)
        look.location = s["look"]
        look.keyframe_insert("location", frame=f)
        cam.rotation_euler = (0.0, 0.0, s["roll"])
        cam.keyframe_insert("rotation_euler", frame=f)
        cam.data.dof.aperture_fstop = fstop_for(s["progress"])
        cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
    for ob in (vehicle, rig, look, cam, cam.data):
        _linear(ob)


def hide_ground_props(states, threshold=0.25, keep=("EARTH_LIMB",)):
    """Once the sky/limb cheat starts (altitude > threshold) the far ground props and
    the pad would stand against the Earth limb: key hide_render/hide_viewport on
    everything in PAD, SITE and the light poles from that frame on."""
    first = next(s["frame"] for s in states if s["altitude"] > threshold)
    targets = []
    for cname in ("PAD", "SITE", "LIGHTS"):
        c = bpy.data.collections.get(cname)
        if not c:
            continue
        for ob in c.all_objects:
            if ob.name in keep or ob.type in ("LIGHT", "CAMERA") or ob.name == "TRENCH":
                continue
            targets.append(ob)
    for ob in targets:
        for prop in ("hide_render", "hide_viewport"):
            setattr(ob, prop, False)
            ob.keyframe_insert(prop, frame=1)
            setattr(ob, prop, True)
            ob.keyframe_insert(prop, frame=first)
            setattr(ob, prop, False)
    print(f"[hide] {len(targets)} ground/pad objects hidden from frame {first} "
          f"(altitude {states[first - 1]['altitude']:.3f} > {threshold}; f{first - 1} = {states[first - 2]['altitude']:.3f})")
    return first


def build_hooks(col):
    tr = empty("TRENCH", (0, 0, -TRENCH_DEPTH / 2), col, "CUBE", 1.0)
    tr.scale = (TRENCH_W / 2, TRENCH_D / 2, TRENCH_DEPTH / 2)   # half-extents: the cube display IS the trench
    tr["note"] = "scale = half extents (m); location = trench centre; deck opening above at z 0..13"
    return tr
