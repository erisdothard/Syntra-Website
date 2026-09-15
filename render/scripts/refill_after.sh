#!/usr/bin/env bash
# Wait for the running render_all.sh to exit, then rerun it (it skips existing
# frames) until all 240 PNGs exist or three attempts are used.
cd "$(dirname "$0")/../.."
while pgrep -f "bash render/scripts/render_all.sh" >/dev/null; do sleep 60; done
for attempt in 1 2 3; do
  n=$(ls render/out/final/*.png 2>/dev/null | wc -l | tr -d ' ')
  echo "== refill attempt $attempt: $n/240 present $(date)" >> render/out/final/render_all.log
  [ "$n" -ge 240 ] && break
  bash render/scripts/render_all.sh 64 2 0.05
done
echo "== refill finished: $(ls render/out/final/*.png | wc -l | tr -d ' ')/240 $(date)" >> render/out/final/render_all.log
