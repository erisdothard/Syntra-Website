#!/usr/bin/env bash
# Bring the frames that still come from the overnight pass (shutter 0.5) onto the
# same settings as the dense ranges (shutter 0.2): removes the sharpness and
# smoke-grain seams at old frames 15, 41, 80, 96, 194 and 237. Integer frames
# only; the half-step frames already match. Overwrites in place (--skip 0).
#   bash render/scripts/render_refresh.sh            # all four ranges (~6.5 h)
#   bash render/scripts/render_refresh.sh 96:193     # one range
set -uo pipefail
cd "$(dirname "$0")/../.."
BLEND=render/cache/launch_final.blend; OUT=render/out/final; LOG=render/out/final/render_all.log
RUN="python3 render/scripts/run_blender.py --timeout 14400 --blend $BLEND render/scripts/render.py --"
COMMON="--samples 64 --scale 100 --vstep 2 --adaptive 0.05 --shutter 0.2 --skip 0 --out $OUT"
RANGES=("$@"); [ ${#RANGES[@]} -eq 0 ] && RANGES=(1:14 41:79 237:240 96:193)
echo "== render_refresh start $(date): ${RANGES[*]}" | tee -a "$LOG"
for range in "${RANGES[@]}"; do
  echo "== chunk refresh $range $(date)" | tee -a "$LOG"
  $RUN --frames "$range" $COMMON 2>&1 | grep -E "\[render\]|exit=|Error|Traceback|TIMEOUT" | tee -a "$LOG"
done
echo "== render_refresh done $(date)" | tee -a "$LOG"
