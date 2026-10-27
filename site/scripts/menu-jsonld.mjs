#!/usr/bin/env node
/**
 * Writes the homepage's Menu JSON-LD (public/rorubaru-3d.html, the 3D room served at /,
 * /menu, /about ...) from public/menu.json, the same file the room's menu panel loads.
 * Same rules as the room and lib/menu.ts: prices only when show_prices is true and every
 * item is priced; private_only items left off; happy hour from menu.json's happy_hour;
 * Dominic's October-sheet price rule via lib/menu-oct-rule.json.
 * Runs before every build (npm "prebuild"); `node scripts/menu-jsonld.mjs` by hand too.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const menu = JSON.parse(fs.readFileSync(path.join(root, "public", "menu.json"), "utf8"));
const rule = JSON.parse(fs.readFileSync(path.join(root, "lib", "menu-oct-rule.json"), "utf8"));
const htmlPath = path.join(root, "public", "rorubaru-3d.html");
const SITE = "https://www.rorubaru.com";
const SERVICE = "Prices in HKD, before the 10% service charge.";
const skip = new Set(rule.notOnOctSheetSections);
const keep = rule.keepExistingMenuPrice || {};

const priced = (it) => it.included ? true : it.variants && it.variants.length
  ? it.variants.every((v) => typeof v.price === "number") : typeof it.price === "number";
const SHOW = menu.show_prices === true && menu.boards.every((b) => b.sections.every((s) => s.items.every(priced)));
const offer = (price, label) => ({ "@type": "Offer", price, priceCurrency: "HKD", ...(label ? { name: label } : {}) });

function menuItem(sectionName, it) {
  const node = { "@type": "MenuItem", name: it.nameZh ? `${it.name} (${it.nameZh})` : it.name };
  if (it.description) node.description = it.description;
  if (!SHOW || it.included) return node;
  const kept = keep[`${sectionName}|${it.name}`];
  if (it.variants && it.variants.length) node.offers = it.variants.map((v) => offer(v.price, v.label));
  else if (typeof kept === "number") node.offers = offer(kept);
  else if (typeof it.price === "number") node.offers = offer(it.price);
  return node;
}
function sections(board) {
  if (!board) return [];
  return board.sections.filter((s) => !skip.has(s.name)).map((s) => ({
    "@type": "MenuSection",
    name: s.name,
    ...(s.note ? { description: s.note } : {}),
    hasMenuItem: s.items.filter((it) => !it.private_only).map((it) => menuItem(s.name, it)),
  })).filter((s) => s.hasMenuItem.length);
}
const byId = (id) => menu.boards.find((b) => b.id === id);
const boards = [
  { "@type": "MenuSection", name: "À la carte", description: SERVICE, hasMenuSection: [...sections(byId("a-la-carte")), ...sections(byId("lunch"))] },
  { "@type": "MenuSection", name: "Drinks", description: SERVICE, hasMenuSection: sections(byId("drinks")) },
];
const hh = menu.happy_hour;
const hhItems = (hh && hh.items || []).filter((it) => !it.private_only);
if (SHOW && hhItems.length && hhItems.every((it) => typeof it.price === "number")) {
  const when = [hh.days, hh.hours].filter(Boolean).join(", ").replace(/\s*–\s*/g, "–");
  boards.push({ "@type": "MenuSection", name: "Happy Hour", description: `Selected drinks, ${when}. ${SERVICE}`,
    hasMenuSection: [{ "@type": "MenuSection", name: `Happy Hour (${when})`,
      hasMenuItem: hhItems.map((it) => ({ "@type": "MenuItem", name: it.name, offers: offer(it.price) })) }] });
}
const node = {
  "@context": "https://schema.org", "@type": "Menu", "@id": `${SITE}/#menu`,
  name: "RORUBARU Menu", description: "Hand rolls (temaki), à la carte and drinks at RORUBARU, Wan Chai, Hong Kong. " + SERVICE,
  inLanguage: "en", url: `${SITE}/menu`, isPartOf: { "@id": `${SITE}/#restaurant` },
  hasMenuSection: boards,
};
const block = `<script type="application/ld+json" id="menu-jsonld">${JSON.stringify(node).replace(/</g, "\\u003c")}</script>`;
let html = fs.readFileSync(htmlPath, "utf8");
const re = /<script type="application\/ld\+json" id="menu-jsonld">[\s\S]*?<\/script>/;
if (re.test(html)) html = html.replace(re, block);
else {
  const i = html.indexOf("</script>", html.indexOf('<script type="application/ld+json">'));
  if (i < 0) throw new Error("homepage JSON-LD not found");
  html = html.slice(0, i + 9) + "\n" + block + html.slice(i + 9);
}
fs.writeFileSync(htmlPath, html);
const n = boards.reduce((a, b) => a + b.hasMenuSection.reduce((x, s) => x + s.hasMenuItem.length, 0), 0);
console.log(`menu-jsonld: ${n} items, prices ${SHOW ? "on" : "off"}`);
