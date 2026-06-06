#!/usr/bin/env node
/** Regenerate lib/event-galleries.manifest.json from public/event-galleries/ on disk. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, "public", "event-galleries");
const slugs = ["invite-only-opening", "grand-opening", "delia-x-rorubaru"];
const galleries = {};

for (const slug of slugs) {
  const dir = path.join(outRoot, slug);
  if (!fs.existsSync(dir)) {
    console.warn(`skip ${slug} (missing ${dir})`);
    continue;
  }

  const images = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".webp") && !f.startsWith("cover-"))
    .sort()
    .map((f) => `/event-galleries/${slug}/${f}`);

  galleries[slug] = {
    id: slug,
    coverDesktop: `/event-galleries/${slug}/cover-desktop.webp`,
    coverMobile: `/event-galleries/${slug}/cover-mobile.webp`,
    images,
  };

  console.log(`${slug}: ${images.length} images`);
}

const manifestPath = path.join(root, "lib", "event-galleries.manifest.json");
fs.writeFileSync(manifestPath, `${JSON.stringify({ galleries }, null, 2)}\n`);
console.log("wrote", manifestPath);
