#!/usr/bin/env bash
# Full 240-frame production render, resumable. Renders in chunks so a crash or
# a stop loses at most one chunk; existing PNGs are skipped on relaunch.
#   bash render/scripts/render_all.sh [samples] [vstep] [adaptive]
set -uo pipefail
cd "$(dirname "$0")/../.."
SAMPLES=${1:-64}; VSTEP=${2:-2}; ADAPT=${3:-0.05}
BLEND=render/cache/launch_final.blend
OUT=render/out/final
LOG=render/out/final/render_all.log
mkdir -p "$OUT"
echo "== render_all start $(date) samples=$SAMPLES vstep=$VSTEP adaptive=$ADAPT" | tee -a "$LOG"
for start in $(seq 1 20 240); do
  end=$((start + 19)); [ $end -gt 240 ] && end=240
  echo "== chunk $start:$end $(date)" | tee -a "$LOG"
  python3 render/scripts/run_blender.py --timeout 7200 --blend "$BLEND" render/scripts/render.py -- \
    --frames "$start:$end" --samples "$SAMPLES" --scale 100 --vstep "$VSTEP" --adaptive "$ADAPT" --skip 1 --out "$OUT" \
    2>&1 | grep -E "\[render\]|exit=|Error|Traceback" | tee -a "$LOG"
done
echo "== render_all done $(date): $(ls "$OUT"/*.png 2>/dev/null | wc -l) frames" | tee -a "$LOG"
