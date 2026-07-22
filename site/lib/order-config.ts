import { SITE_ADDRESS_DOCK_LINE } from "@/lib/content";

/** RORUBARU — G/F, 100–102 Queen's Road East, Wan Chai */
export const RESTAURANT = {
  name: "RORUBARU",
  address: SITE_ADDRESS_DOCK_LINE,
  lat: 22.2764,
  lng: 114.173,
} as const;

/** Draft delivery zone — refine with real ops data. */
export const ORDER_LIMITS = {
  maxDeliveryKm: 8,
  minOrderHkd: 120,
} as const;

export const ORDER_FEES = {
  deliveryBaseHkd: 35,
  deliveryPerKmHkd: 8,
} as const;

export const ORDER_TIMING = {
  pickupPrepMinutes: 25,
  deliveryBaseMinutes: 18,
  deliveryMinutesPerKm: 4,
  scheduleLeadMinutes: 45,
} as const;

export const ORDER_INTEGRATIONS = {
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
} as const;

export const DELIVERY_DROP_OFF_OPTIONS = [
  { id: "hand_to_me", label: "Hand to me" },
  { id: "leave_at_door", label: "Leave in front of door" },
  { id: "leave_at_reception", label: "Leave at reception" },
  { id: "meet_outside", label: "Meet outside" },
] as const satisfies ReadonlyArray<{
  id: import("@/lib/order-types").DropOffPreference;
  label: string;
}>;

export const DELIVERY_RING_BELL_OPTIONS = [
  { id: "ring", label: "Ring doorbell" },
  { id: "do_not_ring", label: "Do not ring" },
] as const satisfies ReadonlyArray<{
  id: import("@/lib/order-types").RingBellPreference;
  label: string;
}>;
