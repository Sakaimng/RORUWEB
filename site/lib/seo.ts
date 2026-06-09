/**
 * Single source of truth for SEO + structured-data (JSON-LD) constants.
 *
 * NAP (Name / Address / Phone) here must stay identical to what is shown in the
 * footer, on Google Business Profile, Tock, OpenRice, etc. — consistent NAP is
 * the strongest local-SEO signal. When the business details change, change them
 * here and in `lib/content.ts` / `lib/i18n.tsx` together.
 */

import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n";
import { withLocale } from "@/lib/locale-routing";

/** Canonical production origin. No trailing slash. */
export const SITE_URL = "https://www.rorubaru.com";

/** Brand display name (as styled on the site). */
export const SITE_NAME = "RORUBARU";

/**
 * Alternate brand spellings used across press / directories. Virtually all
 * editorial coverage (Time Out, OpenRice, Esquire HK, Japanese press) writes
 * the brand as two words "Roru Baru", so we claim both forms in metadata + schema.
 */
export const BRAND_ALT_NAMES = ["Roru Baru", "Roru Baru Hong Kong"] as const;

/** One-line positioning statement reused across metadata + schema. */
export const SITE_TAGLINE = "Hong Kong's Original Hand Roll Bar";

/** Default site description (home / fallback). Kept ~155 chars for SERP display. */
export const SITE_DESCRIPTION =
  "Hong Kong's original hand roll bar in Wan Chai. Tokyo-style temaki made to order with warm rice, crisp Japanese nori and draught sake. Book your counter seat.";

/**
 * Target keyword set (brand + category + local + multilingual). Surfaced as the
 * `keywords` meta tag — minor ranking weight, but cheap and reinforces relevance.
 */
export const SITE_KEYWORDS = [
  "hand roll bar Hong Kong",
  "temaki Hong Kong",
  "temaki bar Wan Chai",
  "Japanese hand rolls Hong Kong",
  "RORUBARU",
  "Roru Baru",
  "Tokyo-style temaki",
  "sake bar Wan Chai",
  "Japanese restaurant Wan Chai",
  "chef's counter Hong Kong",
  "hand roll bar near me",
  "手卷",
  "手卷吧 灣仔",
  "灣仔 日本菜",
  "手巻き 香港",
];

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
 * Open daily 12:00–22:00 (last call 21:30).
 */
export const OPENING_HOURS = [
  {
    days: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    opens: "12:00",
    closes: "22:00",
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

/** Price band (1–4 currency symbols). "$$" reflects the brand's accessible,
 *  "omakase-quality at an everyday price" positioning. Adjust if needed. */
export const PRICE_RANGE = "$$";

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

/** Absolute URL helper. Pass a path beginning with "/". */
export function absoluteUrl(path = "/"): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}

/** Open Graph locale per language. */
export const OG_LOCALE: Record<Lang, string> = {
  en: "en_HK",
  jp: "ja_JP",
  cn: "zh_HK",
};

/**
 * hreflang map for a given (locale-stripped) path. Each language points at its
 * real locale URL; x-default points at the English root.
 */
export function buildLanguageAlternates(
  path = "/",
): Record<string, string> {
  const en = absoluteUrl(withLocale(path, "en"));
  return {
    "x-default": en,
    "en-HK": en,
    "ja-JP": absoluteUrl(withLocale(path, "jp")),
    "zh-Hant-HK": absoluteUrl(withLocale(path, "cn")),
  };
}

/**
 * Builds a complete, consistent `Metadata` object for a page: canonical URL,
 * hreflang alternates, Open Graph and Twitter cards, all pointing at the right
 * path and the shared OG image. Use in every page's `export const metadata`.
 *
 * `title` is the page-specific phrase; the root layout's title template appends
 * "| RORUBARU" for the document <title>, while OG/Twitter get the brand inline.
 */
export function pageMetadata({
  title,
  description,
  path,
  lang = "en",
  ogImage = OG_IMAGE.url,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  /** Locale-stripped path, e.g. "/menu". The locale prefix is added per lang. */
  path: string;
  lang?: Lang;
  ogImage?: string;
  /** When true the title bypasses the "| RORUBARU" template (use for the home page). */
  absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(withLocale(path, lang));
  const socialTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(path),
    },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[lang],
      type: "website",
      images: [{ url: ogImage, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [ogImage],
    },
  };
}
