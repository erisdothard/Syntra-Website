"""Shared render loop: opens the cached blend, applies overrides, renders frames."""
import os
import sys
import time

import bpy

BLEND = "/Users/erisdothard/Syntra-Website/render/cache/launch.blend"


def enable_metal():
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
    except TypeError:
        prefs.compute_device_type = "NONE"
    prefs.refresh_devices()
    names = []
    for d in prefs.devices:
        d.use = d.type == "METAL"
        if d.use:
            names.append(d.name)
    bpy.context.scene.cycles.device = "GPU" if names else "CPU"
    print(f"[render] devices: {names or 'CPU'}")


def render_frames(frames, samples=None, scale=100, out_dir=None, exposure=None, vstep=None, adaptive=None, skip_existing=False,
                  sub=0.0, shutter=None):
    if not bpy.data.filepath:
        bpy.ops.wm.open_mainfile(filepath=BLEND)
    sc = bpy.context.scene
    enable_metal()
    if samples:
        sc.cycles.samples = int(samples)
    sc.render.resolution_percentage = int(scale)
    if exposure is not None:
        sc.view_settings.exposure = float(exposure)
    if vstep is not None:
        # Volume ray-march step multiplier: 1.0 is Cycles' default, 2-4 trades cloud
        # micro-detail for a large speedup on frames dominated by the pad cloud.
        sc.cycles.volume_step_rate = float(vstep)
        sc.cycles.volume_preview_step_rate = float(vstep)
    if adaptive is not None:
        sc.cycles.use_adaptive_sampling = True
        sc.cycles.adaptive_threshold = float(adaptive)
    print(f"[render] samples={sc.cycles.samples} adaptive={sc.cycles.use_adaptive_sampling}/{sc.cycles.adaptive_threshold:.3f} "
          f"vstep={sc.cycles.volume_step_rate} vmax={sc.cycles.volume_max_steps} vbounces={sc.cycles.volume_bounces} denoise={sc.cycles.use_denoising}")
    out_dir = out_dir or "/Users/erisdothard/Syntra-Website/render/out"
    os.makedirs(out_dir, exist_ok=True)
    times = []
    for f in frames:
        # Sub-frames (sub=0.5 → frame f+0.5) are written as NNNN_5.png, quarter
        # steps as NNNN_25.png / NNNN_75.png (the suffix is the fraction's decimal
        # digits) so the encoder can order them between the integer frames; used
        # to raise frame density where the camera moves fastest.
        name = f"{f:04d}.png" if not sub else f"{f:04d}_{repr(float(sub)).split('.')[1]}.png"
        if skip_existing and os.path.exists(os.path.join(out_dir, name)):
            print(f"[render] frame {name} exists, skipped")
            continue
        # RenderSettings are not animatable: short shutter once the camera is pitching fast (star streaks)
        sc.render.motion_blur_shutter = float(shutter) if shutter is not None else (0.15 if f >= 200 else 0.5)
        sc.frame_set(f, subframe=float(sub))
        sc.render.filepath = os.path.join(out_dir, name)
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        dt = time.time() - t0
        times.append(dt)
        print(f"[render] frame {f:04d} → {sc.render.filepath}  {dt:.1f}s "
              f"({sc.render.resolution_x * scale // 100}x{sc.render.resolution_y * scale // 100}, {sc.cycles.samples} spp)")
        sys.stdout.flush()
    print(f"[render] {len(frames)} frames, total {sum(times):.1f}s, mean {sum(times) / max(1, len(times)):.1f}s")
    return times


def script_args():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
