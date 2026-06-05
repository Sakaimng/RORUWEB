#!/usr/bin/env bash
# Regenerate deployable home panel JPEGs from full-res sources in public/.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="public"
OUT="$ROOT/home-covers"
mkdir -p "$OUT"

names=(
  "Desktop Home Hero BG"
  "Mobile Home Hero BG"
  "About Desktop Home BG"
  "About Mobile Home BG"
  "Event Home Desktop BG"
  "Event Home Mobile BG"
  "Reserve Home Desktop"
  "Reserve Home Mobile"
)

for name in "${names[@]}"; do
  src="$ROOT/${name}.jpg"
  if [[ ! -f "$src" ]]; then
    echo "skip (missing): $src" >&2
    continue
  fi
  dest="$OUT/${name}.jpg"
  sips -Z 2400 -s format jpeg -s formatOptions 80 "$src" --out "$dest" >/dev/null
  echo "wrote $dest ($(du -h "$dest" | cut -f1))"
done
