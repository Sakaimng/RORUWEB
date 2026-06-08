// Generates SEO/social assets from the brand logo:
//   public/og/rorubaru-og.jpg        1200x630 Open Graph / Twitter card
//   public/icons/icon-192.png        PWA icon (any)
//   public/icons/icon-512.png        PWA icon (any)
//   public/icons/icon-maskable-512.png  PWA maskable icon (safe-zone padded)
//
// Run: node scripts/seo-assets.mjs
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");

const ORANGE = "#F54500";
const SURFACE = "#f1f1f1";
const INK = "#121212";

await mkdir(join(PUB, "og"), { recursive: true });
await mkdir(join(PUB, "icons"), { recursive: true });

/* ---------- Square PWA icons (orange mark on light surface) ---------- */
const markSrc = join(ROOT, "app", "icon.png"); // orange R mark, transparent bg

async function makeIcon(size, markRatio, out) {
  const markH = Math.round(size * markRatio);
  const mark = await sharp(markSrc)
    .resize({ height: markH, fit: "inside" })
    .toBuffer();
  const meta = await sharp(mark).metadata();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: SURFACE,
    },
  })
    .composite([
      {
        input: mark,
        top: Math.round((size - (meta.height ?? markH)) / 2),
        left: Math.round((size - (meta.width ?? markH)) / 2),
      },
    ])
    .png()
    .toFile(out);
  console.log("wrote", out);
}

await makeIcon(512, 0.62, join(PUB, "icons", "icon-512.png"));
await makeIcon(192, 0.62, join(PUB, "icons", "icon-192.png"));
// Maskable: keep mark within the ~80% safe zone.
await makeIcon(512, 0.5, join(PUB, "icons", "icon-maskable-512.png"));

/* ---------- Open Graph card (1200x630) ---------- */
const W = 1200;
const H = 630;
const logoSvg = await readFile(
  join(PUB, "RORUBARU fill logo one line.svg"),
  "utf8",
);
// Logo native ratio 408:50. Render wide for crisp text.
const logoW = 760;
const logoH = Math.round((logoW * 50) / 408);
const logo = await sharp(Buffer.from(logoSvg))
  .resize({ width: logoW })
  .png()
  .toBuffer();

const bg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${SURFACE}"/>
  <rect x="0" y="0" width="${W}" height="14" fill="${ORANGE}"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="${ORANGE}"/>
  <text x="${W / 2}" y="${H / 2 + 70}" text-anchor="middle"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700"
    font-size="40" letter-spacing="6" fill="${INK}">HONG KONG&#8217;S ORIGINAL HAND ROLL BAR</text>
  <text x="${W / 2}" y="${H / 2 + 132}" text-anchor="middle"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700"
    font-size="26" letter-spacing="10" fill="${ORANGE}">WAN CHAI &#183; HONG KONG ISLAND</text>
</svg>`);

await sharp(bg)
  .composite([{ input: logo, top: Math.round(H / 2 - logoH - 36), left: Math.round((W - logoW) / 2) }])
  .jpeg({ quality: 90 })
  .toFile(join(PUB, "og", "rorubaru-og.jpg"));
console.log("wrote", join(PUB, "og", "rorubaru-og.jpg"));
