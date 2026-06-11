import sharp from "sharp";

/** Long edge caps — tuned for 2× retina lightbox (~1180px stage) without shipping 5K originals. */
export const MAX_EDGE = {
  /** Lightbox stage max 1180px → 2× retina. */
  gallery: 2400,
  coverDesktop: 1920,
  coverMobile: 1400,
  homeDesktop: 2800,
  homeMobile: 1600,
  /** About marquee tiles (~22vw desktop, ~68vw mobile). */
  aboutMarquee: 960,
};

export const WEBP_QUALITY = {
  gallery: 90,
  coverDesktop: 90,
  coverMobile: 88,
  about: 88,
  default: 88,
};

export async function toWebp(
  src,
  dest,
  { maxEdge, quality = WEBP_QUALITY.default, effort = 6 } = {}
) {
  await sharp(src)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort, smartSubsample: true })
    .toFile(dest);
}
