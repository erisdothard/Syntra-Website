"""Bake every Mantaflow domain in the open .blend (FLUID_DOMAIN_*) to OpenVDB.

    python3 render/scripts/run_blender.py --timeout 3000 --blend render/cache/fluid_proxy.blend \
        render/scripts/bake_fluids.py -- [--res N] [--vent-res N] [--noise N] [--only pad|vent]

Records wall time and cache size per domain in render/cache/fluids/bake_log.json.
"""
import json
import os
import shutil
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, '..', 'cache', 'fluids', 'bake_log.json')


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--res', type=int, default=0)
    ap.add_argument('--vent-res', type=int, default=0)
    ap.add_argument('--noise', type=int, default=-1)
    ap.add_argument('--only', default='')
    return ap.parse_args(argv)


def dir_size(path):
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            total += os.path.getsize(os.path.join(root, f))
    return total


def bake_domain(ob, args):
    ds = ob.modifiers['Fluid'].domain_settings
    is_pad = ob.name.endswith('_PAD')
    if is_pad and args.res:
        ds.resolution_max = args.res
    if (not is_pad) and args.vent_res:
        ds.resolution_max = args.vent_res
    if is_pad and args.noise >= 0:
        ds.use_noise = args.noise > 0
        if args.noise > 0:
            ds.noise_scale = args.noise
    ds.cache_type = 'ALL'
    # Never call fluid.free_all() here: in background mode its file deletion lands
    # after bake_all() and wipes the fresh cache. Clear the directory by hand.
    if os.path.isdir(ds.cache_directory):
        shutil.rmtree(ds.cache_directory)
    os.makedirs(ds.cache_directory, exist_ok=True)
    print(f'BAKE {ob.name}: res={ds.resolution_max} noise={ds.use_noise} frames '
          f'{ds.cache_frame_start}-{ds.cache_frame_end} -> {ds.cache_directory}', flush=True)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    t0 = time.time()
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        res = bpy.ops.fluid.bake_all()
    dt = time.time() - t0
    size = dir_size(ds.cache_directory)
    entry = dict(domain=ob.name, result=str(res), resolution=ds.resolution_max, noise=ds.use_noise,
                 noise_scale=ds.noise_scale, seconds=round(dt, 1), cache_bytes=size,
                 cache_mb=round(size / 1e6, 1), frames=[ds.cache_frame_start, ds.cache_frame_end],
                 cache=ds.cache_directory)
    print('BAKED', json.dumps(entry), flush=True)
    return entry


def main():
    args = parse_args()
    domains = [o for o in bpy.data.objects if o.name.startswith('FLUID_DOMAIN_')]
    if args.only:
        domains = [o for o in domains if o.name.lower().endswith(args.only.lower())]
    log = []
    if os.path.exists(LOG):
        try:
            log = json.load(open(LOG))
        except Exception:
            log = []
    for ob in domains:
        log.append(bake_domain(ob, args))
        json.dump(log, open(LOG, 'w'), indent=1)
    bpy.ops.wm.save_mainfile()
    total = sum(e['seconds'] for e in log[-len(domains):])
    print(f'BAKE TOTAL {total:.0f}s; saved {bpy.data.filepath}')


if __name__ == '__main__':
    main()
