"""Render an arbitrary frame range from render/cache/launch.blend.

    python3 render/scripts/run_blender.py --timeout 3600 render/scripts/render.py -- \
        --frames 1:240 --samples 256 --scale 100 --out render/out [--exposure EV]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_render import render_frames, script_args   # noqa: E402


def main():
    a = script_args()
    opts = {"frames": "1:240", "samples": None, "scale": 100, "out": None, "exposure": None, "vstep": None, "adaptive": None, "skip": "0", "sub": "0", "shutter": None}
    for i in range(0, len(a) - 1, 2):
        opts[a[i].lstrip("-")] = a[i + 1]
    fr = opts["frames"]
    if ":" in fr:
        lo, hi = (int(v) for v in fr.split(":"))
        frames = list(range(lo, hi + 1))
    else:
        frames = [int(v) for v in fr.split(",")]
    render_frames(frames, samples=opts["samples"], scale=int(opts["scale"]), out_dir=opts["out"],
                  exposure=opts["exposure"], vstep=opts["vstep"], adaptive=opts["adaptive"],
                  skip_existing=opts["skip"] == "1", sub=float(opts["sub"]), shutter=opts["shutter"])


if __name__ == "__main__":
    main()
