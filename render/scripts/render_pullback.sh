#!/usr/bin/env bash
# Act-2 pull-back density: the camera moves 15-20 diff-units per full step through
# source frames 75-80 and 12-15 per half step through 80-96 (push-in is ~7.5 after
# quarter-stepping). Add half steps for 75:79 and quarter steps for 75:95, all at
# shutter 0.2 like the rest of the sequence. ~47 frames, ~50 min.
#   bash render/scripts/render_pullback.sh
set -uo pipefail
cd "$(dirname "$0")/../.."
BLEND=render/cache/launch_final.blend; OUT=render/out/final; LOG=render/out/final/render_all.log
RUN="python3 render/scripts/run_blender.py --timeout 7200 --blend $BLEND render/scripts/render.py --"
COMMON="--samples 64 --scale 100 --vstep 2 --adaptive 0.05 --shutter 0.2 --skip 1 --out $OUT"
echo "== render_pullback start $(date)" | tee -a "$LOG"
echo "== chunk pullback-half 75:79 $(date)" | tee -a "$LOG"
$RUN --frames 75:79 $COMMON --sub 0.5 2>&1 | grep -E "\[render\]|exit=|Error|Traceback|TIMEOUT" | tee -a "$LOG"
for sub in 0.25 0.75; do
  echo "== chunk pullback-quarter-$sub 75:95 $(date)" | tee -a "$LOG"
  $RUN --frames 75:95 $COMMON --sub $sub 2>&1 | grep -E "\[render\]|exit=|Error|Traceback|TIMEOUT" | tee -a "$LOG"
done
echo "== render_pullback done $(date)" | tee -a "$LOG"
