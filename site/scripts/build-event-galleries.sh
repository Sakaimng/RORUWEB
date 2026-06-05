#!/usr/bin/env bash
# Copy + resize event photos into URL-safe public/event-galleries/ for Git + Vercel.
set -euo pipefail
cd "$(dirname "$0")/.."
PUBLIC="public"
OUT="$PUBLIC/event-galleries"

optimize() {
  local src="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  sips -Z 2000 -s format jpeg -s formatOptions 78 "$src" --out "$dest" >/dev/null
}

build_event() {
  local slug="$1"
  local src_dir="$2"
  local cover_desktop_src="$3"
  local cover_mobile_src="$4"
  local dest="$OUT/$slug"
  local src="$PUBLIC/$src_dir"

  if [[ ! -d "$src" ]]; then
    echo "skip $slug (missing $src)" >&2
    return 1
  fi

  rm -rf "$dest"
  mkdir -p "$dest"

  optimize "$src/$cover_desktop_src" "$dest/cover-desktop.jpg"
  optimize "$src/$cover_mobile_src" "$dest/cover-mobile.jpg"

  local count=0
  while IFS= read -r -d '' file; do
    local base
    base="$(basename "$file")"
    case "$base" in
      Gallery\ *|*Thumbnail*) continue ;;
    esac
    optimize "$file" "$dest/$base"
    count=$((count + 1))
  done < <(find "$src" -maxdepth 1 -name '*.jpg' -print0)

  echo "$slug: $count gallery images + covers"
}

build_event "invite-only-opening" "20260314 Invite only opening" \
  "Invite Only Opening Event Desktop Thumbnail.jpg" \
  "Invite Only Opening Event Mobile Thumbnail.jpg"

build_event "grand-opening" "20260321 Six pack chef" \
  "Six Pack Event Desktop Thumbnail.jpg" \
  "Six Pack Event Mobile Thumbnail.jpg"

build_event "delia-x-rorubaru" "20260425 DELIA x RORUBARU" \
  "RORU x Delia Event Desktop Thumbnail.jpg" \
  "RORU x Delia Event Mobile Thumbnail.jpg"

node --input-type=module <<'NODE'
import fs from "fs";
import path from "path";

const outRoot = "public/event-galleries";
const slugs = ["invite-only-opening", "grand-opening", "delia-x-rorubaru"];
const galleries = {};

for (const slug of slugs) {
  const dir = path.join(outRoot, slug);
  if (!fs.existsSync(dir)) continue;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jpg") && !f.startsWith("cover-"))
    .sort();
  galleries[slug] = {
    id: slug,
    coverDesktop: `/event-galleries/${slug}/cover-desktop.jpg`,
    coverMobile: `/event-galleries/${slug}/cover-mobile.jpg`,
    images: files.map((f) => `/event-galleries/${slug}/${f}`),
  };
}

const manifestPath = "lib/event-galleries.manifest.json";
fs.writeFileSync(
  manifestPath,
  JSON.stringify({ galleries }, null, 2) + "\n"
);
console.log("wrote", manifestPath);
NODE

du -sh "$OUT"
