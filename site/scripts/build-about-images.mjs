#!/usr/bin/env node
/**
 * Resize about page WebPs for marquee/story display sizes.
 * Run: npm run assets:about-images
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MAX_EDGE, WEBP_QUALITY, toWebp } from "./lib/sharp-assets.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "aboutPageImages");

async function main() {
  if (!fs.existsSync(dir)) {
    console.warn("missing", dir);
    return;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webp"));
  for (const file of files) {
    const src = path.join(dir, file);
    const tmp = path.join(dir, `.${file}.tmp`);
    await toWebp(src, tmp, {
      maxEdge: MAX_EDGE.aboutMarquee,
      quality: WEBP_QUALITY.about,
    });
    fs.renameSync(tmp, src);
    console.log("optimized", file);
  }

  const { execSync } = await import("child_process");
  execSync(`du -sh "${dir}"`, { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
