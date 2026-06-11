/** Shared Next/Image tuning — pre-built WebP in /public skips re-encoding. */

export const IMAGE_QUALITY = {
  hero: 92,
  cover: 90,
  galleryThumb: 88,
} as const;

/** Pre-optimized static WebP — serve directly, no second lossy pass. */
export const PREOPTIMIZED_IMAGE = { unoptimized: true as const };

/** Lightbox stage is capped at 1180px wide in CSS. */
export const LIGHTBOX_IMAGE_SIZES = "(max-width: 1180px) 96vw, 1180px";

/** About marquee tile display (matches AboutSequenceMarquee sizes). */
export const ABOUT_MARQUEE_SIZES = "(max-width: 767px) 68vw, (max-width: 991px) 36vw, 22vw";
