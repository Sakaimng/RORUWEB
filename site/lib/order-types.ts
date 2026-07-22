export type FulfillmentMode = "delivery" | "pickup";

export type ScheduleMode = "asap" | "scheduled";

export type DropOffPreference =
  | "hand_to_me"
  | "leave_at_door"
  | "leave_at_reception"
  | "meet_outside";

export type RingBellPreference = "ring" | "do_not_ring";

export type DeliveryInstructions = {
  dropOff: DropOffPreference;
  ringBell: RingBellPreference;
  /** Gate code, unit, floor, or other notes for the driver. */
  notes: string;
};

export type DeliveryAddress = {
  formatted: string;
  line1: string;
  line2?: string;
  lat: number;
  lng: number;
};

export type CartLine = {
  catalogId: string;
  quantity: number;
};

export type OrderTiming = {
  mode: ScheduleMode;
  /** ISO local datetime string from `<input type="datetime-local">`. */
  scheduledAt?: string;
};

export type OrderEstimate = {
  minutes: number;
  label: string;
  distanceKm?: number;
};

/** Snapshot captured when an order is placed (draft tracking flow). */
export type PlacedOrderSnapshot = {
  fulfillment: FulfillmentMode;
  address: DeliveryAddress | null;
  totalHkd: number;
  estimateMinutes: number;
  itemCount: number;
};
