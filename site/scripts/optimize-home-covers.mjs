#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MAX_EDGE, toWebp } from "./lib/sharp-assets.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const outDir = path.join(publicDir, "home-covers");

const COVERS = [
  { name: "Desktop Home Hero BG", maxEdge: MAX_EDGE.homeDesktop, quality: 92 },
  { name: "Mobile Home Hero BG", maxEdge: MAX_EDGE.homeMobile, quality: 90 },
  { name: "About Desktop Home BG", maxEdge: MAX_EDGE.homeDesktop, quality: 90 },
  { name: "About Mobile Home BG", maxEdge: MAX_EDGE.homeMobile, quality: 88 },
  { name: "Event Home Desktop BG", maxEdge: MAX_EDGE.homeDesktop, quality: 90 },
  { name: "Event Home Mobile BG", maxEdge: MAX_EDGE.homeMobile, quality: 88 },
  { name: "Reserve Home Desktop", maxEdge: MAX_EDGE.homeDesktop, quality: 90 },
  { name: "Reserve Home Mobile", maxEdge: MAX_EDGE.homeMobile, quality: 88 },
];

fs.mkdirSync(outDir, { recursive: true });

for (const { name, maxEdge, quality } of COVERS) {
  const src = path.join(publicDir, `${name}.jpg`);
  if (!fs.existsSync(src)) {
    console.warn(`skip (missing): ${src}`);
    continue;
  }
  const dest = path.join(outDir, `${name}.webp`);
  const legacyJpg = path.join(outDir, `${name}.jpg`);
  await toWebp(src, dest, { maxEdge, quality });
  if (fs.existsSync(legacyJpg)) fs.unlinkSync(legacyJpg);
  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`wrote ${dest} (${kb} KB)`);
}
