#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MAX_EDGE, toWebp } from "./lib/sharp-assets.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const outRoot = path.join(publicDir, "event-galleries");

const EVENTS = [
  {
    slug: "invite-only-opening",
    srcDir: "20260314 Invite only opening",
    coverDesktop: "Invite Only Opening Event Desktop Thumbnail.jpg",
    coverMobile: "Invite Only Opening Event Mobile Thumbnail.jpg",
  },
  {
    slug: "grand-opening",
    srcDir: "20260321 Six pack chef",
    coverDesktop: "Six Pack Event Desktop Thumbnail.jpg",
    coverMobile: "Six Pack Event Mobile Thumbnail.jpg",
  },
  {
    slug: "delia-x-rorubaru",
    srcDir: "20260425 DELIA x RORUBARU",
    coverDesktop: "RORU x Delia Event Desktop Thumbnail.jpg",
    coverMobile: "RORU x Delia Event Mobile Thumbnail.jpg",
  },
];

function shouldSkipGalleryFile(name) {
  return name.startsWith("Gallery ") || name.includes("Thumbnail");
}

async function buildEvent({ slug, srcDir, coverDesktop, coverMobile }) {
  const src = path.join(publicDir, srcDir);
  const dest = path.join(outRoot, slug);

  if (!fs.existsSync(src)) {
    console.warn(`skip ${slug} (missing ${src})`);
    return null;
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  await toWebp(path.join(src, coverDesktop), path.join(dest, "cover-desktop.webp"), {
    maxEdge: MAX_EDGE.coverDesktop,
    quality: 90,
  });
  await toWebp(path.join(src, coverMobile), path.join(dest, "cover-mobile.webp"), {
    maxEdge: MAX_EDGE.coverMobile,
    quality: 88,
  });

  const files = fs
    .readdirSync(src)
    .filter((f) => f.endsWith(".jpg") && !shouldSkipGalleryFile(f))
    .sort();

  for (const file of files) {
    const base = file.replace(/\.jpg$/i, ".webp");
    await toWebp(path.join(src, file), path.join(dest, base), {
      maxEdge: MAX_EDGE.gallery,
      quality: 88,
    });
  }

  console.log(`${slug}: ${files.length} gallery images + covers`);
  return slug;
}

async function main() {
  const galleries = {};

  for (const event of EVENTS) {
    const slug = await buildEvent(event);
    if (!slug) continue;

    const dir = path.join(outRoot, slug);
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
  }

  const manifestPath = path.join(root, "lib", "event-galleries.manifest.json");
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ galleries }, null, 2)}\n`
  );
  console.log("wrote", manifestPath);

  const { execSync } = await import("child_process");
  execSync(`du -sh "${outRoot}"`, { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
