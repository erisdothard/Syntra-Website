"""Build render/cache/launch.blend for the Saturn V night launch.

    python3 render/scripts/run_blender.py --timeout 600 render/scripts/build_scene.py [-- --exposure EV --flood KW]
"""
import math
import os
import sys
import time

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_scene as S                      # noqa: E402
import lib_vehicle_sf as SF                # noqa: E402
import lib_materials as M                  # noqa: E402
from lib_nodes import key_anim             # noqa: E402
from lib_timeline import frame_state, FRAME_COUNT   # noqa: E402

ROOT = "/Users/erisdothard/Syntra-Website/render/"
HDRI = ROOT + "assets/hdri/kloppenheim_02_4k.hdr"
OUT_BLEND = ROOT + "cache/launch.blend"

DEFAULTS = dict(exposure=-0.35, flood=1.3, hdri=0.04, sodium=3.5, vehicle="sketchfab")


def parse_args():
    args = dict(DEFAULTS)
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for i in range(0, len(argv) - 1, 2):
        key = argv[i].lstrip("-")
        if key in args:
            args[key] = argv[i + 1] if isinstance(args[key], str) else float(argv[i + 1])
    return args


def find_moon(path):
    """Brightest patch above 9° elevation → (azimuth rad, elevation deg, value)."""
    img = bpy.data.images.load(path, check_existing=True)
    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    px = buf.reshape(h, w, 4)[:, :, :3]
    lum = px @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    lum = lum.reshape(h // 4, 4, w // 4, 4).mean(axis=(1, 3))   # 4x4 box blur so hot pixels don't win
    lum[: int(lum.shape[0] * 0.55), :] = 0.0                   # ignore below 9° elevation (row 0 = nadir)
    row, colu = np.unravel_index(np.argmax(lum), lum.shape)
    u = (colu + 0.5) / lum.shape[1]
    v = (row + 0.5) / lum.shape[0]
    az = (0.5 - u) * 2 * math.pi
    elev = (v - 0.5) * 180.0
    mean_sky = float(lum[int(lum.shape[0] * 0.55):, :].mean())
    return az, elev, float(lum[row, colu]), mean_sky


def render_settings(sc, exposure):
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "GPU"
    cy.samples = 256
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.01
    cy.adaptive_min_samples = 16
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    if hasattr(cy, "denoising_use_gpu"):
        cy.denoising_use_gpu = True
    cy.max_bounces = 8
    cy.diffuse_bounces = 4
    cy.glossy_bounces = 4
    cy.transmission_bounces = 4
    cy.volume_bounces = 1
    cy.transparent_max_bounces = 12
    cy.sample_clamp_direct = 0.0
    cy.sample_clamp_indirect = 8.0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.volume_step_rate = 1.0
    cy.volume_max_steps = 512
    cy.blur_glossy = 0.5
    if hasattr(cy, "use_light_tree"):
        cy.use_light_tree = True
    sc.render.resolution_x = 1920
    sc.render.resolution_y = 1080
    sc.render.resolution_percentage = 100
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5
    sc.render.film_transparent = False
    sc.render.filter_size = 1.5
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        sc.view_settings.look = "Medium High Contrast"
    sc.view_settings.exposure = exposure
    sc.view_settings.gamma = 1.0
    sc.frame_start = 1
    sc.frame_end = FRAME_COUNT
    sc.render.fps = 24


def main():
    t0 = time.time()
    args = parse_args()
    print(f"[build] args {args}")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.name = "Launch"

    c_vehicle = S.collection("VEHICLE")
    c_pad = S.collection("PAD")
    c_site = S.collection("SITE")
    c_lights = S.collection("LIGHTS")
    c_cam = S.collection("CAMERA")
    S.collection("FLUIDS")

    if args["vehicle"] == "sketchfab":
        vehicle, sv_objs = SF.build_vehicle_sketchfab(c_vehicle)
    else:
        vehicle, sv_objs = S.build_vehicle(c_vehicle)
    ml = S.build_launcher(c_pad)
    S.build_ground(c_site)
    S.build_structures(c_site)
    S.build_fog(c_site)
    S.build_limb(c_site)
    S.build_hooks(c_pad)
    S.build_lights(c_lights, flood_mult=args["flood"], sodium_kw=args["sodium"])

    az, elev, val, mean_sky = find_moon(HDRI)
    target_az = math.radians(-135.0)          # behind camera-left: camera on -Y looks +Y, left = -X
    rot_z = az - target_az
    print(f"[world] HDRI moon at az={math.degrees(az):.1f}° elev={elev:.1f}° value={val:.2f} "
          f"(mean sky {mean_sky:.4f}); mapping rot_z={math.degrees(rot_z):.1f}° → moon az -135°")
    sc.world = M.world(HDRI, rot_z, args["hdri"])
    S.build_moon(c_lights, az_deg=-135.0, elev_deg=elev)

    look = S.empty("LOOK_TARGET", (0, 0, 57.5), c_cam, "SPHERE", 2.0)
    rig, cam = S.build_camera(c_cam, look)

    states = [frame_state(f) for f in range(1, FRAME_COUNT + 1)]
    S.animate(vehicle, rig, cam, look, states)
    S.hide_ground_props(states)
    key_anim(states, {
        "frost": lambda s: s["frost"],
        "ignition": lambda s: s["ignition"],
        "altitude": lambda s: s["altitude"],
        "fog": lambda s: 0.00008 * (1.0 - s["altitude"]) ** 3,
        "limb_z": S.limb_z_for,
    })
    for f in (1, 54, 104, 121, 187, 228):
        s = states[f - 1]
        print(f"[anim] f{f:03d} p={s['progress']:.3f} cam={S.fmt(s['cam'])} look_z={s['look'][2]:.1f} "
              f"veh_z={s['vehicle_z']:.1f} fstop={S.fstop_for(s['progress']):.1f} frost={s['frost']:.2f} "
              f"ig={s['ignition']:.2f} alt={s['altitude']:.2f} limb_z={S.limb_z_for(s):.0f}")
    sc.frame_set(1)
    bpy.context.view_layer.update()
    cz = rig.matrix_world.translation.z
    print(f"[camera] frame 1 rig z={cz:.1f} (must be > 0)")

    render_settings(sc, args["exposure"])
    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print(f"[build] saved {OUT_BLEND} in {time.time() - t0:.1f}s; objects={len(bpy.data.objects)} "
          f"materials={len(bpy.data.materials)}")


if __name__ == "__main__":
    main()
