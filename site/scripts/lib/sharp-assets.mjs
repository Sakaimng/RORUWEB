import sharp from "sharp";

/** Long edge caps — tuned for 2× retina lightbox (~1180px stage) without shipping 5K originals. */
export const MAX_EDGE = {
  gallery: 3200,
  coverDesktop: 2560,
  coverMobile: 1400,
  homeDesktop: 2800,
  homeMobile: 1600,
};

export async function toWebp(
  src,
  dest,
  { maxEdge, quality = 88, effort = 4 } = {}
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
