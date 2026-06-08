#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MAX_EDGE, toWebp } from "./lib/sharp-assets.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const srcDir = path.join(publicDir, "HOME HERO SLIDES");
const outDir = path.join(publicDir, "home-hero-slides");

if (!fs.existsSync(srcDir)) {
  console.error(`missing source folder: ${srcDir}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const jpgs = fs
  .readdirSync(srcDir)
  .filter((f) => f.endsWith(".jpg"))
  .sort();

for (const file of jpgs) {
  const base = file.replace(/\.jpg$/i, ".webp");
  await toWebp(path.join(srcDir, file), path.join(outDir, base), {
    maxEdge: MAX_EDGE.homeDesktop,
    quality: 88,
  });
  const kb = Math.round(fs.statSync(path.join(outDir, base)).size / 1024);
  console.log(`wrote ${base} (${kb} KB)`);
}

const slides = jpgs.map(
  (f) => `/home-hero-slides/${f.replace(/\.jpg$/i, ".webp")}`
);

const manifestPath = path.join(root, "lib", "home-hero-slides.manifest.json");
fs.writeFileSync(manifestPath, `${JSON.stringify({ slides }, null, 2)}\n`);
console.log("wrote", manifestPath, `(${slides.length} slides)`);

const { execSync } = await import("child_process");
execSync(`du -sh "${outDir}"`, { stdio: "inherit" });