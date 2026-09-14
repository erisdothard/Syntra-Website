"""Diagnostic: render frames with the smoke domains' shadow visibility off.
    python3 render/scripts/run_blender.py --blend BLEND render/scripts/diag_shadow.py -- --frames 104 --out DIR
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from lib_render import render_frames, script_args  # noqa: E402

a = script_args()
opts = {"frames": "104", "out": None, "samples": "64"}
for i in range(0, len(a) - 1, 2):
    opts[a[i].lstrip("-")] = a[i + 1]
n = 0
for o in bpy.data.objects:
    if o.name.startswith("FLUID_") and o.type == "MESH" and any(m.type == "FLUID" and m.fluid_type == "DOMAIN" for m in o.modifiers):
        o.visible_shadow = False
        n += 1
print(f"[diag] shadow visibility off on {n} domains")
render_frames([int(v) for v in opts["frames"].split(",")], samples=opts["samples"], scale=50, out_dir=opts["out"], vstep=2, adaptive=0.05)
