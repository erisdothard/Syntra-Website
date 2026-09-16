"""Move the pad/site hide keyframe in the cached scene without a full rebuild.

The baked hide (lib_scene.hide_ground_props, altitude > 0.25 → frame 203) cut the
tower while it was still mid-frame, a visible pop in the climb. This re-keys
hide_render/hide_viewport on the same objects to a chosen frame and saves the blend.

  python3 render/scripts/run_blender.py --blend render/cache/launch_final.blend \
      render/scripts/rekey_hide.py -- --frame 213
"""
import sys

import bpy

sys.path.insert(0, "/Users/erisdothard/Syntra-Website/render/scripts")
from lib_render import script_args  # noqa: E402

KEEP = ("EARTH_LIMB",)


def fcurve_collections(action):
    """Legacy actions expose .fcurves; layered actions (Blender 4.4+) keep them in channelbags."""
    if hasattr(action, "fcurves"):
        return [action.fcurves]
    return [cb.fcurves for layer in action.layers for strip in layer.strips for cb in strip.channelbags]


def targets():
    out = []
    for cname in ("PAD", "SITE", "LIGHTS"):
        c = bpy.data.collections.get(cname)
        if not c:
            continue
        for ob in c.all_objects:
            if ob.name in KEEP or ob.type in ("LIGHT", "CAMERA") or ob.name == "TRENCH":
                continue
            out.append(ob)
    return out


def main():
    a = script_args()
    opts = {"frame": None}
    for i in range(0, len(a) - 1, 2):
        opts[a[i].lstrip("-")] = a[i + 1]
    if opts["frame"] is None:
        raise SystemExit("--frame <n> is required")
    first = int(opts["frame"])
    obs = targets()
    for ob in obs:
        ad = ob.animation_data
        if ad and ad.action:
            for coll in fcurve_collections(ad.action):
                for fc in list(coll):
                    if fc.data_path in ("hide_render", "hide_viewport"):
                        coll.remove(fc)
        for prop in ("hide_render", "hide_viewport"):
            setattr(ob, prop, False)
            ob.keyframe_insert(prop, frame=1)
            setattr(ob, prop, True)
            ob.keyframe_insert(prop, frame=first)
            setattr(ob, prop, False)
    bpy.ops.wm.save_mainfile(filepath=bpy.data.filepath)
    print(f"[rekey] {len(obs)} pad/site objects now hidden from frame {first}: {', '.join(ob.name for ob in obs)}")


if __name__ == "__main__":
    main()
