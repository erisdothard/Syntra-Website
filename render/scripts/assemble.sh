#!/usr/bin/env bash
# Assemble the final render scene: base scene → baked pad cloud → plume.
#   render/cache/launch.blend        (build_scene.py, deterministic, ~2 s)
#   render/cache/launch_fx.blend     (+ add_fluids.py smoke domains, in place on a copy)
#   render/cache/launch_final.blend  (+ add_plume.py emissive core, lights, glare)
# Re-run after any change to lib_*.py, add_fluids.py or add_plume.py.
set -euo pipefail
cd "$(dirname "$0")/../.."

RUN="python3 render/scripts/run_blender.py"

echo "== 1/4 build_scene (vehicle=${VEHICLE:-sketchfab})"
$RUN --timeout 600 render/scripts/build_scene.py -- --vehicle "${VEHICLE:-sketchfab}"

echo "== 2/4 add_fluids (smoke only)"
cp render/cache/launch.blend render/cache/launch_fx.blend
$RUN --timeout 600 --blend render/cache/launch_fx.blend render/scripts/add_fluids.py

echo "== 3/4 add_plume"
$RUN --timeout 600 render/scripts/add_plume.py -- --blend render/cache/launch_fx.blend --out render/cache/launch_final.blend

echo "== 4/4 post_assemble (smoke domains: no shadow casting)"
$RUN --timeout 300 --blend render/cache/launch_final.blend render/scripts/post_assemble.py

ls -la render/cache/launch_final.blend
echo "assembled render/cache/launch_final.blend"
