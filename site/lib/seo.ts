/**
 * Single source of truth for SEO + structured-data (JSON-LD) constants.
 *
 * NAP (Name / Address / Phone) here must stay identical to what is shown in the
 * footer, on Google Business Profile, Tock, OpenRice, etc. — consistent NAP is
 * the strongest local-SEO signal. When the business details change, change them
 * here and in `lib/content.ts` / `lib/i18n.tsx` together.
 */

/** Canonical production origin. No trailing slash. */
export const SITE_URL = "https://www.rorubaru.com";

/** Brand display name (as styled on the site). */
export const SITE_NAME = "RORUBARU";

/** Alternate brand spelling used in press / directories — helps brand recall. */
export const BRAND_ALT_NAME = "Roru Baru";

/** One-line positioning statement reused across metadata + schema. */
export const SITE_TAGLINE = "Hong Kong's Original Hand Roll Bar";

/** Contact. */
export const SITE_EMAIL = "hello@rorubaru.com";
export const SITE_PHONE_DISPLAY = "+852 6317 5675";
/** E.164 form for `tel:` links + structured data. */
export const SITE_PHONE_E164 = "+85263175675";

/** Reservations (Tock). */
export const TOCK_RESERVATION_URL = "https://www.exploretock.com/roru-baru";

/** Postal address (PostalAddress schema fields). */
export const SITE_ADDRESS = {
  streetAddress: "G/F, 100–102 Queen's Road East",
  addressLocality: "Wan Chai",
  addressRegion: "Hong Kong Island",
  postalCode: "",
  addressCountry: "HK",
} as const;

/**
 * Approximate venue coordinates for 100–102 Queen's Road East, Wan Chai.
 * NOTE: confirm against the Google Business Profile map pin for best accuracy.
 */
export const SITE_GEO = {
  latitude: 22.27538,
  longitude: 114.17216,
} as const;

/** Google Maps link (matches lib/content.ts SITE_MAP_URL). */
export const SITE_MAP_URL =
  "https://maps.google.com/?q=100-102+Queen's+Road+East,+Wan+Chai,+Hong+Kong";

/**
 * Opening hours for `openingHoursSpecification`.
 * Sun–Thu 12:00–22:00 (last call 21:30); Fri–Sat 12:00–24:00 (last call 22:30).
 */
export const OPENING_HOURS = [
  {
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    opens: "12:00",
    closes: "22:00",
  },
  {
    days: ["Friday", "Saturday"],
    opens: "12:00",
    closes: "00:00",
  },
] as const;

/** Cuisine descriptors (servesCuisine). */
export const SERVES_CUISINE = [
  "Japanese",
  "Hand Roll",
  "Temaki",
  "Sushi",
  "Sake Bar",
] as const;

/** Price band (1–4 currency symbols). */
export const PRICE_RANGE = "$$$";

/** Profiles + authoritative citations for `sameAs`. */
export const SOCIAL_PROFILES = [
  "https://www.instagram.com/rorubaru/",
  "https://www.facebook.com/profile.php?id=61587043343492",
  "https://www.exploretock.com/roru-baru",
] as const;

/** Default Open Graph share image (served from /public). */
export const OG_IMAGE = {
  url: "/og/rorubaru-og.jpg",
  width: 1200,
  height: 630,
  alt: "RORUBARU — Hong Kong's original hand roll bar in Wan Chai",
} as const;

/**
 * UI languages and their BCP-47 codes for hreflang `alternates.languages`.
 * The site serves all languages from one URL via a client toggle, so every
 * locale points at the same canonical path (see buildLanguageAlternates).
 */
export const LOCALES = {
  en: "en-HK",
  ja: "ja-JP",
  "zh-Hant": "zh-Hant-HK",
} as const;

/** Absolute URL helper. Pass a path beginning with "/". */
export function absoluteUrl(path = "/"): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}

/** hreflang map for a given path (all locales share one URL + x-default). */
export function buildLanguageAlternates(
  path = "/",
): Record<string, string> {
  const url = absoluteUrl(path);
  const entries: Record<string, string> = { "x-default": url };
  for (const tag of Object.values(LOCALES)) entries[tag] = url;
  return entries;
}
