#!/usr/bin/env node
/**
 * Builds wide desktop menu SVGs from the single-column panel exports in
 * `public/menus/`. Mobile uses the panels directly; desktop uses the merged
 * `a-la-carte.svg` and `drinks.svg`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const menusDir = path.join(root, "public", "menus");

const PANEL_W = 420;
const PANEL_H = 745;

function innerSvgMarkup(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!match) throw new Error(`invalid svg: ${filePath}`);
  return match[1].trim();
}

function combinePanels(leftPath, rightPath, outName) {
  const left = innerSvgMarkup(leftPath);
  const right = innerSvgMarkup(rightPath);
  const svg = `<svg width="${PANEL_W * 2}" height="${PANEL_H}" viewBox="0 0 ${PANEL_W * 2} ${PANEL_H}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g transform="translate(0 0)">
${left}
</g>
<g transform="translate(${PANEL_W} 0)">
${right}
</g>
</svg>
`;
  const outPath = path.join(menusDir, outName);
  fs.writeFileSync(outPath, svg);
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`wrote ${outName} (${kb} KB)`);
}

const alaLeft = path.join(menusDir, "A la carte 1.svg");
const alaRight = path.join(menusDir, "A la carte 3.svg");
const drinksLeft = path.join(menusDir, "DRINKS MENU 1.svg");
const drinksRight = path.join(menusDir, "DRINKS MENU 2.svg");

for (const file of [alaLeft, alaRight, drinksLeft, drinksRight]) {
  if (!fs.existsSync(file)) {
    console.error(`missing panel: ${file}`);
    process.exit(1);
  }
}

combinePanels(alaLeft, alaRight, "a-la-carte.svg");
combinePanels(drinksLeft, drinksRight, "drinks.svg");
