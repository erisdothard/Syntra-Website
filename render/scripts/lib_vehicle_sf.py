"""Sketchfab "Apollo | Saturn V Launch Vehicle" (devPilot, CC-BY-4.0) as the hero
vehicle.  The file is an exploded view (stages lifted 1/2/3 m, three parts pushed
to y = +20) with no animation, and it stops at the Instrument Unit; the SLA / SM /
CM / LES are grafted from the NASA model above the IU.  Native units are metres
(S-IC tank radius 5.05 m), F-1 exit plane at z = 0.
"""
import bmesh
import bpy
from mathutils import Vector
import lib_materials as M
from lib_scene import MODELS, SV_HEIGHT, import_glb, world_bbox, empty, move_to, fmt
from lib_timeline import ENGINE_PLANE_Z

SF_GLB = MODELS + "saturn-v-sketchfab.glb"
NASA_GLB = MODELS + "saturn-v.src.glb"
SLA_CUT_RAW = 10.20                # NASA raw z just below the SLA base ring (10.25); the cone strip must survive
NASA_KEEP = ("pCylinder1", "group10 pC", "group11 pC", "pCylinder4", "pCylinder5")
STACK = ("S-IC", "Interstage", "S-II", "S-II_Top", "S-IVB", "Instrument_Unit")


def _part_of(mesh_name):
    """'S-II_Top_Metal_0' → 'S-II_Top', 'F1.001_RollingShuttle_0' → 'F1.001'."""
    i = mesh_name.rfind("_", 0, mesh_name.rfind("_"))
    return mesh_name[:i]


def _body_meshes(objs, part):
    return [o for o in objs if o.type == "MESH" and _part_of(o.name) == part]


def _bbox(objs, part):
    return world_bbox(_body_meshes(objs, part))


def _shift(emp, dx, dy, dz):
    emp.matrix_world.translation = emp.matrix_world.translation + Vector((dx, dy, dz))
    bpy.context.view_layer.update()


def stack_parts(objs):
    """Close the explode gaps: each part's bottom onto the part below, all on the axis."""
    P = {p: bpy.data.objects[p] for p in STACK}
    def yc(p):
        lo, hi = _bbox(objs, p)
        return (lo.y + hi.y) / 2
    sic_top = _bbox(objs, "S-IC")[1].z
    d1 = sic_top - _bbox(objs, "Interstage")[0].z
    _shift(P["Interstage"], 0, -yc("Interstage"), d1)
    _shift(P["S-II"], 0, 0, d1)                       # same explode lift as its interstage
    d2 = _bbox(objs, "S-II")[1].z - _bbox(objs, "S-II_Top")[0].z
    _shift(P["S-II_Top"], 0, -yc("S-II_Top"), d2)
    _shift(P["S-IVB"], 0, 0, d2)                      # the S-IVB sits in the adapter as modelled
    d3 = _bbox(objs, "S-IVB")[1].z - _bbox(objs, "Instrument_Unit")[0].z
    _shift(P["Instrument_Unit"], 0, -yc("Instrument_Unit"), d3)
    print(f"[sf] explode gaps closed: interstage/S-II {d1:+.2f} m, adapter/S-IVB {d2:+.2f} m, IU {d3:+.2f} m")
    prev_top = None
    for p in STACK:
        lo, hi = _bbox(objs, p)
        gap = "" if prev_top is None else f" gap below {lo.z - prev_top:+.2f}"
        print(f"[sf] {p:16s} z {lo.z:6.2f}..{hi.z:6.2f} ({hi.z - lo.z:5.2f} m)  r_max {max(hi.x, -lo.x, hi.y, -lo.y):5.2f}  "
              f"axis ({(lo.x + hi.x) / 2:+.2f},{(lo.y + hi.y) / 2:+.2f}){gap}")
        prev_top = hi.z
    return _bbox(objs, "Instrument_Unit")[1].z


def graft_spacecraft(col, iu_top):
    """NASA SLA+SM+CM+LES cut above the S-IVB, placed on the IU. Returns (empty, objs)."""
    objs = import_glb(NASA_GLB)
    lo, hi = world_bbox(objs)
    sn = SV_HEIGHT / (hi.z - lo.z)
    cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
    keep = [o for o in objs if o.name in NASA_KEEP]
    root = [o for o in objs if o.parent is None][0]
    for o in objs:
        if o.type == "MESH" and o not in keep:
            bpy.data.objects.remove(o, do_unlink=True)
    body = bpy.data.objects["pCylinder1"]
    bm = bmesh.new()
    bm.from_mesh(body.data)
    mw = body.matrix_world
    kill = [f for f in bm.faces if min((mw @ v.co).z for v in f.verts) < SLA_CUT_RAW]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(body.data)
    base_raw = min((mw @ v.co).z for v in bm.verts if v.link_faces)
    bm.free()
    sc_empty = empty("SPACECRAFT", (cx * -sn, cy * -sn, iu_top - base_raw * sn), col)
    sc_empty.scale = (sn,) * 3
    root.parent = sc_empty
    for o in keep + [root]:
        move_to(o, col)
    bpy.context.view_layer.update()
    lo2, hi2 = world_bbox(keep)
    print(f"[sf] spacecraft graft (NASA, scale {sn:.3f}): z {lo2.z:.2f}..{hi2.z:.2f} ({hi2.z - lo2.z:.2f} m), "
          f"SLA base r {max(hi2.x, -lo2.x):.2f} on IU top {iu_top:.2f}")
    return sc_empty, keep


def assign_materials(sf_objs, nasa_objs, vehicle):
    """NASA presets for the spacecraft, then the palette-driven hull for the stack."""
    counts = M.build_vehicle_materials(nasa_objs, vehicle)
    paint, dark, nozzle = (bpy.data.materials[n] for n in ("SV_paint", "SV_dark", "SV_nozzle"))
    src = bpy.data.materials["Metal"]
    pal = next(n.image for n in src.node_tree.nodes if n.type == "TEX_IMAGE"
               and n.outputs["Color"].is_linked and n.outputs["Color"].links[0].to_socket.name == "Base Color")
    hull = M.sf_hull(vehicle, pal)
    kinds = {}
    for o in sf_objs:
        if o.type != "MESH":
            continue
        mname = o.data.materials[0].name if o.data.materials else ""
        part = _part_of(o.name)
        if mname.startswith("RollingShuttle1"):
            mat, kind = hull, "hull(palette, roll-pattern liner)"   # full cylinders; black quarters come from the palette
        elif mname.startswith("RollingShuttle"):
            engine = part.startswith("F1") or part.startswith("J2")
            mat, kind = (nozzle, "nozzle") if engine else (paint, "paint(skirt)")
        else:
            mat, kind = hull, "hull(palette)"
        for i in range(len(o.data.materials)):
            o.data.materials[i] = mat
        kinds[kind] = kinds.get(kind, 0) + 1
    print(f"[sf] materials: {kinds}; spacecraft {counts}")


def build_vehicle_sketchfab(col):
    sf_objs = import_glb(SF_GLB)
    for o in sf_objs:
        move_to(o, col)
    bpy.context.view_layer.update()
    lo, hi = world_bbox(sf_objs)
    print(f"[sf] raw exploded bbox lo={fmt(lo)} hi={fmt(hi)} size={fmt(hi - lo)}")
    iu_top = stack_parts(sf_objs)
    sc_empty, nasa_objs = graft_spacecraft(col, iu_top)
    all_meshes = [o for o in sf_objs if o.type == "MESH"] + nasa_objs
    lo, hi = world_bbox(all_meshes)
    scale = SV_HEIGHT / (hi.z - lo.z)
    root = empty("VEHICLE", (0, 0, ENGINE_PLANE_Z), col, "ARROWS", 10.0)
    model = empty("VEHICLE_MODEL", (0, 0, -lo.z * scale), col)
    model.scale = (scale,) * 3
    model.parent = root
    sf_root = [o for o in sf_objs if o.parent is None][0]
    sf_root.parent = model
    sc_empty.parent = model
    bpy.context.view_layer.update()
    lo2, hi2 = world_bbox(all_meshes)
    sic = _bbox(sf_objs, "S-IC")
    print(f"[sf] scale {scale:.4f}: placed bbox lo={fmt(lo2)} hi={fmt(hi2)} height={hi2.z - lo2.z:.2f} m, "
          f"engine plane z={lo2.z:.2f}, S-IC dia {2 * 5.05 * scale:.2f} m, fins span {sic[1].x - sic[0].x:.1f} m")
    for p in STACK:
        plo, phi = _bbox(sf_objs, p)
        print(f"[sf] world {p:16s} z {plo.z:6.2f}..{phi.z:6.2f}")
    assign_materials(sf_objs, nasa_objs, root)
    plume = empty("PLUME_ORIGIN", (0, 0, 0), col, "SPHERE", 3.0)
    plume.parent = root
    for i, name in enumerate(("F1", "F1.001", "F1.002", "F1.003", "F1.004")):
        e = bpy.data.objects[name]
        w = e.matrix_world.translation
        ex = empty(f"PLUME_EXIT_{i}", (0, 0, 0), col, "SPHERE", 1.8)
        ex.parent = root
        ex.matrix_world.translation = Vector((w.x, w.y, ENGINE_PLANE_Z))
        print(f"[sf] PLUME_EXIT_{i} at ({w.x:+.2f}, {w.y:+.2f}, {ENGINE_PLANE_Z:.1f})")
    bells = [o for o in sf_objs if o.type == "MESH" and _part_of(o.name).startswith("F1") and "RollingShuttle" in o.name]
    blo, bhi = world_bbox(bells)
    print(f"[sf] F-1 bells z {blo.z:.2f}..{bhi.z:.2f}, cluster x {blo.x:.1f}..{bhi.x:.1f} y {blo.y:.1f}..{bhi.y:.1f}")
    return root, sf_objs + nasa_objs
