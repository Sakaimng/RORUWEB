#!/usr/bin/env node
/**
 * Re-encode deployed event gallery WebPs in place (no JPG sources required).
 * Caps long edge at MAX_EDGE.gallery with high-quality WebP — ~40–60% smaller files,
 * visually identical at lightbox size (max 1180px / 2× retina).
 *
 * Run: npm run assets:event-galleries:optimize
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { MAX_EDGE, WEBP_QUALITY } from "./lib/sharp-assets.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, "public", "event-galleries");

async function optimizeFile(filePath) {
  const tmp = path.join(
    os.tmpdir(),
    `roru-gallery-${process.pid}-${path.basename(filePath)}`
  );

  await sharp(filePath)
    .rotate()
    .resize({
      width: MAX_EDGE.gallery,
      height: MAX_EDGE.gallery,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: WEBP_QUALITY.gallery,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(tmp);

  fs.renameSync(tmp, filePath);
}

async function optimizeCover(filePath, maxEdge, quality) {
  const tmp = path.join(
    os.tmpdir(),
    `roru-cover-${process.pid}-${path.basename(filePath)}`
  );

  await sharp(filePath)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(tmp);

  fs.renameSync(tmp, filePath);
}

async function main() {
  if (!fs.existsSync(outRoot)) {
    console.warn("missing", outRoot);
    return;
  }

  let count = 0;

  for (const slug of fs.readdirSync(outRoot)) {
    const dir = path.join(outRoot, slug);
    if (!fs.statSync(dir).isDirectory()) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".webp")) continue;
      const filePath = path.join(dir, file);

      if (file === "cover-desktop.webp") {
        await optimizeCover(filePath, MAX_EDGE.coverDesktop, WEBP_QUALITY.coverDesktop);
      } else if (file === "cover-mobile.webp") {
        await optimizeCover(filePath, MAX_EDGE.coverMobile, WEBP_QUALITY.coverMobile);
      } else if (!file.startsWith("cover-")) {
        await optimizeFile(filePath);
      }

      count += 1;
      if (count % 25 === 0) console.log(`optimized ${count}…`);
    }
  }

  console.log(`optimized ${count} WebP files`);
  const { execSync } = await import("child_process");
  execSync(`du -sh "${outRoot}"`, { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
