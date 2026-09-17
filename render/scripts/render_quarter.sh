#!/usr/bin/env bash
# Quarter-step frames (N+0.25, N+0.75) for ranges whose per-frame camera motion is
# still 3-4x the sequence median after the half-step pass: the act-1 push-in and
# (optionally) the act-2 pull-back. Integer and half-step frames must already exist
# at shutter 0.2; this only adds the quarter steps (--skip 1).
#   bash render/scripts/render_quarter.sh 20:40          # push-in (~45 min)
#   bash render/scripts/render_quarter.sh 20:40 75:98    # + pull-back (~2.3 h)
set -uo pipefail
cd "$(dirname "$0")/../.."
BLEND=render/cache/launch_final.blend; OUT=render/out/final; LOG=render/out/final/render_all.log
RUN="python3 render/scripts/run_blender.py --timeout 14400 --blend $BLEND render/scripts/render.py --"
COMMON="--samples 64 --scale 100 --vstep 2 --adaptive 0.05 --shutter 0.2 --skip 1 --out $OUT"
[ $# -eq 0 ] && { echo "usage: $0 A:B [C:D ...]"; exit 1; }
echo "== render_quarter start $(date): $*" | tee -a "$LOG"
for range in "$@"; do
  for sub in 0.25 0.75; do
    echo "== chunk quarter-$sub $range $(date)" | tee -a "$LOG"
    $RUN --frames "$range" $COMMON --sub $sub 2>&1 | grep -E "\[render\]|exit=|Error|Traceback|TIMEOUT" | tee -a "$LOG"
  done
done
echo "== render_quarter done $(date)" | tee -a "$LOG"
