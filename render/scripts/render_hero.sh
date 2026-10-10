#!/usr/bin/env bash
# Hero → act-1 density: source frames 1-14 are full steps (~15 px of scroll and up
# to 8 diff-units of motion each) and 15-19 half steps (6-8 units), while the push-in
# after them is quarter-stepped at ~5.5 and reads smooth. Add half steps for 6:14
# (frames 1-5 move < 4.2 units already) and quarter steps for 15:19, shutter 0.2
# like the rest of the sequence. 19 frames.
#   bash render/scripts/render_hero.sh
set -uo pipefail
cd "$(dirname "$0")/../.."
BLEND=render/cache/launch_final.blend; OUT=render/out/final; LOG=render/out/final/render_all.log
RUN="python3 render/scripts/run_blender.py --timeout 7200 --blend $BLEND render/scripts/render.py --"
COMMON="--samples 64 --scale 100 --vstep 2 --adaptive 0.05 --shutter 0.2 --skip 1 --out $OUT"
echo "== render_hero start $(date)" | tee -a "$LOG"
echo "== chunk hero-half 6:14 $(date)" | tee -a "$LOG"
$RUN --frames 6:14 $COMMON --sub 0.5 2>&1 | grep -E "\[render\]|exit=|Error|Traceback|TIMEOUT" | tee -a "$LOG"
for sub in 0.25 0.75; do
  echo "== chunk hero-quarter-$sub 15:19 $(date)" | tee -a "$LOG"
  $RUN --frames 15:19 $COMMON --sub $sub 2>&1 | grep -E "\[render\]|exit=|Error|Traceback|TIMEOUT" | tee -a "$LOG"
done
echo "== render_hero done $(date)" | tee -a "$LOG"
