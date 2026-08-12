/**
 * Shared GA4 helpers.
 *
 * The measurement ID is public by design. An environment variable can override
 * it for a separate preview or staging stream without changing application code.
 */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-PV4YYPNG46";

/**
 * These domains share one GA4 property. The Google tag uses this list to add
 * its `_gl` linker parameter to the hand-off from RORUBARU to Tock.
 */
export const GA_CROSS_DOMAIN_HOSTS = [
  "rorubaru.com",
  "www.rorubaru.com",
  "exploretock.com",
  "www.exploretock.com",
] as const;

type AnalyticsParameters = Record<string, unknown>;

type AnalyticsWindow = Window & {
  gtag?: (
    command: "event",
    eventName: string,
    parameters?: AnalyticsParameters,
  ) => void;
  __roruAnalyticsReady?: boolean;
};

export type ReservationExperience = "lunch" | "dinner";

export type ReservationCheckoutSource =
  | "reservation_widget"
  | "desktop_navigation"
  | "event_card"
  | "event_detail";

export type TockAttribution = {
  campaign: string;
  content?: string;
};

const CAMPAIGN_PARAMETER_NAMES = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
] as const;

function getAnalyticsWindow(): AnalyticsWindow | null {
  if (typeof window === "undefined") return null;
  return window as AnalyticsWindow;
}

/**
 * Keeps an incoming campaign intact when a guest moves to Tock. For direct or
 * untagged visits, adds a stable default so completed bookings also appear in
 * Tock's Referral Source report as website-originated reservations.
 */
export function buildTockTrackingUrl(
  href: string,
  { campaign, content }: TockAttribution,
): string {
  const url = new URL(href);
  const currentSearch =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search);

  for (const parameter of CAMPAIGN_PARAMETER_NAMES) {
    const value = currentSearch?.get(parameter);
    if (value && !url.searchParams.has(parameter)) {
      url.searchParams.set(parameter, value);
    }
  }

  if (!url.searchParams.has("utm_source")) {
    url.searchParams.set("utm_source", "rorubaru");
  }
  if (!url.searchParams.has("utm_medium")) {
    url.searchParams.set("utm_medium", "website");
  }
  if (!url.searchParams.has("utm_campaign")) {
    url.searchParams.set("utm_campaign", campaign);
  }
  if (content && !url.searchParams.has("utm_content")) {
    url.searchParams.set("utm_content", content);
  }

  return url.toString();
}

/**
 * Analytics should never delay or break a guest-facing interaction. Ad blockers,
 * privacy settings, and offline use simply make this a no-op.
 */
export function trackAnalyticsEvent(
  eventName: string,
  parameters?: AnalyticsParameters,
): void {
  const analyticsWindow = getAnalyticsWindow();
  if (
    !GA_MEASUREMENT_ID ||
    !analyticsWindow?.__roruAnalyticsReady ||
    typeof analyticsWindow.gtag !== "function"
  ) {
    return;
  }

  try {
    analyticsWindow.gtag("event", eventName, parameters);
  } catch {
    // Never make analytics a dependency of the site experience.
  }
}

export function trackTockReservationCheckout({
  source,
  experience,
  partySize,
  eventName,
}: {
  source: ReservationCheckoutSource;
  experience?: ReservationExperience;
  partySize?: number;
  eventName?: string;
}): void {
  const experienceName =
    experience === "lunch"
      ? "Lunch chef's counter"
      : experience === "dinner"
        ? "Dinner chef's counter"
        : eventName ?? "RORUBARU reservation";

  trackAnalyticsEvent("begin_checkout", {
    booking_surface: source,
    reservation_type: experience ?? (eventName ? "event" : "unspecified"),
    ...(typeof partySize === "number" ? { party_size: partySize } : {}),
    items: [
      {
        item_id: experience
          ? `chefs-counter-${experience}`
          : eventName
            ? `event-${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
            : "rorubaru-reservation",
        item_name: experienceName,
        item_category: experience ? "reservation" : "event",
        quantity: 1,
      },
    ],
  });
}

export function trackReservationExperienceSelection(
  experience: ReservationExperience,
): void {
  const experienceName =
    experience === "lunch" ? "Lunch chef's counter" : "Dinner chef's counter";

  trackAnalyticsEvent("select_item", {
    item_list_id: "reservation_experiences",
    item_list_name: "RORUBARU reservations",
    items: [
      {
        item_id: `chefs-counter-${experience}`,
        item_name: experienceName,
        item_category: "reservation",
        quantity: 1,
      },
    ],
  });
}

export function trackLeadCapture(
  leadType: "inquiry" | "delivery_waitlist",
): void {
  trackAnalyticsEvent("generate_lead", { lead_type: leadType });
}
