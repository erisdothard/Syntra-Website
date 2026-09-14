"""Six review frames (progress 0, .22, .43, .50, .78, .95) at 50 %, 64 spp.

    python3 render/scripts/run_blender.py --timeout 900 render/scripts/preview.py [-- --exposure EV --scale 50 --samples 64]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_render import render_frames, script_args   # noqa: E402

PREVIEW_FRAMES = [1, 54, 104, 121, 187, 228]
OUT = "/Users/erisdothard/Syntra-Website/render/out/preview"


def main():
    a = script_args()
    opts = {"exposure": None, "scale": 50, "samples": 64, "frames": None}
    for i in range(0, len(a) - 1, 2):
        opts[a[i].lstrip("-")] = a[i + 1]
    frames = [int(v) for v in opts["frames"].split(",")] if opts["frames"] else PREVIEW_FRAMES
    render_frames(frames, samples=int(opts["samples"]), scale=int(opts["scale"]), out_dir=OUT,
                  exposure=opts["exposure"])


if __name__ == "__main__":
    main()
