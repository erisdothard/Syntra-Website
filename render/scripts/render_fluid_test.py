"""Render Cycles test stills of the fluids from a named camera.

    python3 render/scripts/run_blender.py --timeout 1800 --blend render/cache/fluid_proxy.blend \
        render/scripts/render_fluid_test.py -- --frames 60,100,130,200,235 --cam CAM_ACT2 \
        --samples 64 --scale 50 --out render/out/fluid_test --tag r1
"""
import os
import sys
import time

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib_timeline as tl  # noqa: E402


def timeline_camera(scene):
    """Animated 35 mm camera on the launchTimeline.ts path (site -> Blender), for tests."""
    cam = bpy.data.objects.get('CAM_TIMELINE')
    if cam is not None:
        return cam
    cd = bpy.data.cameras.new('CAM_TIMELINE')
    cd.lens, cd.sensor_width, cd.clip_end = 35, 36, 5000
    cam = bpy.data.objects.new('CAM_TIMELINE', cd)
    scene.collection.objects.link(cam)
    cam.rotation_mode = 'QUATERNION'
    for f in range(1, tl.FRAME_COUNT + 1):
        s = tl.frame_state(f)
        pos, look = Vector(s['cam']), Vector(s['look'])
        cam.location = pos
        cam.rotation_quaternion = (look - pos).to_track_quat('-Z', 'Y')
        cam.keyframe_insert('location', frame=f)
        cam.keyframe_insert('rotation_quaternion', frame=f)
    return cam


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--frames', default='100')
    ap.add_argument('--cam', default='')
    ap.add_argument('--samples', type=int, default=64)
    ap.add_argument('--scale', type=int, default=50)
    ap.add_argument('--out', default=os.path.join(HERE, '..', 'out', 'fluid_test'))
    ap.add_argument('--tag', default='')
    ap.add_argument('--exposure', type=float, default=None)
    ap.add_argument('--no-smoke', action='store_true')
    ap.add_argument('--lights-off', action='store_true', help='hide every light: does the core light the scene alone?')
    return ap.parse_args(argv)


def main():
    a = parse_args()
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = a.samples
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = True
    scene.render.resolution_percentage = a.scale
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.film_transparent = False
    if a.exposure is not None:
        scene.view_settings.exposure = a.exposure
    if a.no_smoke:
        for ob in bpy.data.objects:
            if ob.name.startswith('FLUID_DOMAIN_'):
                ob.hide_render = True
    if a.lights_off:
        for ob in bpy.data.objects:
            if ob.type == 'LIGHT':
                ob.hide_render = True
    if a.cam == 'TIMELINE':
        scene.camera = timeline_camera(scene)
    elif a.cam:
        scene.camera = bpy.data.objects[a.cam]
    os.makedirs(a.out, exist_ok=True)
    cam = scene.camera.name if scene.camera else 'nocam'
    for f in [int(x) for x in a.frames.split(',') if x.strip()]:
        scene.frame_set(f)
        name = f'{a.tag + "_" if a.tag else ""}{cam}_f{f:04d}.png'
        scene.render.filepath = os.path.join(os.path.abspath(a.out), name)
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f'RENDERED {name} in {time.time() - t0:.1f}s', flush=True)


if __name__ == '__main__':
    main()
