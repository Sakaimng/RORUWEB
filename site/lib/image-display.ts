/** Shared Next/Image tuning — pre-built WebP in /public skips re-encoding. */

export const IMAGE_QUALITY = {
  hero: 92,
  cover: 90,
  galleryThumb: 88,
} as const;

/** Pre-optimized static WebP — serve directly, no second lossy pass. */
export const PREOPTIMIZED_IMAGE = { unoptimized: true as const };
