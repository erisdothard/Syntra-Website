#!/usr/bin/env bash
# Re-encode finished production frames onto the site every 10 minutes until
# render_all.sh reports done, then one final encode. Safe to kill and restart.
cd "$(dirname "$0")/../.."
LOG=render/out/final/encode_loop.log
while true; do
  node render/scripts/encode.mjs --src render/out/final --out public/frames/desktop --count 240 2>&1 | head -1 | tee -a "$LOG"
  grep -q "== render_all done" render/out/final/render_all.log 2>/dev/null && break
  sleep 600
done
echo "encode_loop finished $(date)" | tee -a "$LOG"
