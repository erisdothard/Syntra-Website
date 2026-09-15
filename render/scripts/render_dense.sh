#!/usr/bin/env bash
# Double frame density where the camera moves fastest: re-render the integer
# frames of each range at a short shutter and add the half-step frames.
#   bash render/scripts/render_dense.sh
set -uo pipefail
cd "$(dirname "$0")/../.."
BLEND=render/cache/launch_final.blend; OUT=render/out/final; LOG=render/out/final/render_all.log
RUN="python3 render/scripts/run_blender.py --timeout 7200 --blend $BLEND render/scripts/render.py --"
COMMON="--samples 64 --scale 100 --vstep 2 --adaptive 0.05 --shutter 0.2 --out $OUT"
echo "== render_dense start $(date)" | tee -a "$LOG"
for range in 15:40 80:95 194:236; do
  echo "== chunk dense-int $range $(date)" | tee -a "$LOG"
  $RUN --frames "$range" $COMMON 2>&1 | grep -E "\[render\]|exit=|Error|Traceback" | tee -a "$LOG"
  echo "== chunk dense-sub $range $(date)" | tee -a "$LOG"
  $RUN --frames "$range" $COMMON --sub 0.5 --skip 1 2>&1 | grep -E "\[render\]|exit=|Error|Traceback" | tee -a "$LOG"
done
echo "== render_dense done $(date): $(ls $OUT/*_5.png | wc -l) sub-frames" | tee -a "$LOG"
