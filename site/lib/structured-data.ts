/**
 * JSON-LD (schema.org) builders for RORUBARU.
 *
 * Design notes (grounded in Google's 2025-2026 Search Gallery rules):
 *  - The Restaurant node is the canonical entity (a subtype of LocalBusiness /
 *    Organization) and carries logo + sameAs so it also drives the site-name and
 *    logo features — no separate competing Organization node.
 *  - NO self-referential aggregateRating / review: Google does not show stars for
 *    a business reviewing itself, and it risks looking manipulative. Star ratings
 *    come from the Google Business Profile, off-site.
 *  - NO SearchAction / Sitelinks Search Box: that rich result was retired in 2024.
 *  - Event is a live rich-result type and is well-suited to the guest-chef events.
 */
import {
  SITE_URL,
  SITE_NAME,
  BRAND_ALT_NAMES,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_EMAIL,
  SITE_PHONE_E164,
  SITE_ADDRESS,
  SITE_GEO,
  SITE_MAP_URL,
  OPENING_HOURS,
  SERVES_CUISINE,
  PRICE_RANGE,
  SOCIAL_PROFILES,
  TOCK_RESERVATION_URL,
  OG_IMAGE,
  absoluteUrl,
} from "@/lib/seo";
import type { SiteEvent } from "@/lib/content";
import { MENU_BOARDS, PRICE_CURRENCY, type MenuItem } from "@/lib/menu";
import { withLocale } from "@/lib/locale-routing";
import type { Lang } from "@/lib/i18n";

export type JsonLdNode = Record<string, unknown>;

const RESTAURANT_ID = `${SITE_URL}/#restaurant`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const postalAddress: JsonLdNode = {
  "@type": "PostalAddress",
  streetAddress: SITE_ADDRESS.streetAddress,
  addressLocality: SITE_ADDRESS.addressLocality,
  addressRegion: SITE_ADDRESS.addressRegion,
  addressCountry: SITE_ADDRESS.addressCountry,
};

/** The anchor LocalBusiness/Restaurant entity. */
export function restaurantNode(): JsonLdNode {
  return {
    "@type": "Restaurant",
    "@id": RESTAURANT_ID,
    name: SITE_NAME,
    alternateName: [...BRAND_ALT_NAMES],
    description: SITE_DESCRIPTION,
    slogan: SITE_TAGLINE,
    url: SITE_URL,
    logo: absoluteUrl("/icons/icon-512.png"),
    image: [
      absoluteUrl(OG_IMAGE.url),
      absoluteUrl("/aboutPageImages/DSC07910.webp"),
      absoluteUrl("/aboutPageImages/L1053624.webp"),
    ],
    telephone: SITE_PHONE_E164,
    email: SITE_EMAIL,
    address: postalAddress,
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE_GEO.latitude,
      longitude: SITE_GEO.longitude,
    },
    hasMap: SITE_MAP_URL,
    servesCuisine: [...SERVES_CUISINE],
    priceRange: PRICE_RANGE,
    currenciesAccepted: "HKD",
    paymentAccepted: "Credit Card, Debit Card, Electronic Payment",
    areaServed: { "@type": "City", name: "Hong Kong" },
    acceptsReservations: true,
    menu: absoluteUrl("/menu"),
    hasMenu: {
      "@type": "Menu",
      name: "À la carte & Drinks",
      url: absoluteUrl("/menu"),
      inLanguage: "en",
    },
    employee: {
      "@type": "Person",
      name: "Joey Chan",
      jobTitle: "Head Chef",
    },
    openingHoursSpecification: OPENING_HOURS.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    sameAs: [...SOCIAL_PROFILES],
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: TOCK_RESERVATION_URL,
        inLanguage: "en",
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: {
        "@type": "Reservation",
        name: `Reserve a table at ${SITE_NAME}`,
      },
    },
  };
}

/** WebSite node (feeds the site-name feature; no retired SearchAction). */
export function websiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: [...BRAND_ALT_NAMES],
    inLanguage: ["en", "ja", "zh-Hant"],
    publisher: { "@id": RESTAURANT_ID },
  };
}

/** Combined site-wide graph for the root layout. */
export function siteGraph(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [restaurantNode(), websiteNode()],
  };
}

/** BreadcrumbList for an inner page. Pass the trail from home to current page. */
export function breadcrumbList(
  items: { name: string; path: string }[],
  lang: Lang = "en",
): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(withLocale(item.path, lang)),
    })),
  };
}

/** Splits an eventDate field ("2026-03-06" or "2026-04-24, 2026-04-25"). */
function parseEventDates(eventDate: string): { start: string; end?: string } {
  const parts = eventDate
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1
    ? { start: parts[0]!, end: parts[parts.length - 1]! }
    : { start: parts[0] ?? eventDate };
}

/** Event node for a single event (live rich-result type). */
export function eventNode(event: SiteEvent): JsonLdNode {
  const { start, end } = parseEventDates(event.eventDate);
  const node: JsonLdNode = {
    "@type": "Event",
    name: `${event.title} — ${SITE_NAME}`,
    startDate: start,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: event.description,
    image: [absoluteUrl(event.image)],
    location: {
      "@type": "Place",
      name: SITE_NAME,
      address: postalAddress,
    },
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      url: event.link,
      availability: "https://schema.org/InStock",
      priceCurrency: "HKD",
    },
  };
  if (end) node.endDate = end;
  return node;
}

/** Wraps one or more Event nodes in a @graph for the events page. */
export function eventsGraph(events: SiteEvent[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": events.map(eventNode),
  };
}

/** Builds the `offers` value for a menu item (single price or variants). */
function menuItemOffers(item: MenuItem): JsonLdNode | JsonLdNode[] | undefined {
  if (item.variants?.length) {
    return item.variants.map((v) => ({
      "@type": "Offer",
      name: v.label,
      price: v.price,
      priceCurrency: PRICE_CURRENCY,
    }));
  }
  if (typeof item.price === "number") {
    return {
      "@type": "Offer",
      price: item.price,
      priceCurrency: PRICE_CURRENCY,
    };
  }
  return undefined;
}

/** Full Menu node (Restaurant -> Menu -> MenuSection -> MenuItem -> Offer). */
export function menuSchema(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${absoluteUrl("/menu")}#menu`,
    name: `${SITE_NAME} Menu`,
    inLanguage: "en",
    url: absoluteUrl("/menu"),
    isPartOf: { "@id": RESTAURANT_ID },
    hasMenuSection: MENU_BOARDS.map((board) => ({
      "@type": "MenuSection",
      name: board.name,
      ...(board.note ? { description: board.note } : {}),
      hasMenuSection: board.sections.map((section) => ({
        "@type": "MenuSection",
        name: section.name,
        ...(section.note ? { description: section.note } : {}),
        hasMenuItem: section.items.map((item) => {
          const offers = menuItemOffers(item);
          return {
            "@type": "MenuItem",
            name: item.nameZh ? `${item.name} (${item.nameZh})` : item.name,
            ...(item.description ? { description: item.description } : {}),
            ...(offers ? { offers } : {}),
          };
        }),
      })),
    })),
  };
}
