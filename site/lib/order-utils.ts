import {
  ORDER_FEES,
  ORDER_LIMITS,
  ORDER_TIMING,
  RESTAURANT,
} from "@/lib/order-config";
import type { CatalogItem } from "@/lib/order-catalog";
import { ORDER_CATALOG_BY_ID } from "@/lib/order-catalog";
import type {
  CartLine,
  DeliveryAddress,
  DeliveryInstructions,
  FulfillmentMode,
  OrderEstimate,
  OrderTiming,
} from "@/lib/order-types";
import {
  DELIVERY_DROP_OFF_OPTIONS,
  DELIVERY_RING_BELL_OPTIONS,
} from "@/lib/order-config";

const EARTH_RADIUS_KM = 6371;

export function formatHkd(amount: number): string {
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => {
    const item = ORDER_CATALOG_BY_ID[line.catalogId];
    return sum + (item?.price ?? 0) * line.quantity;
  }, 0);
}

export function deliveryFeeKm(distanceKm: number): number {
  if (distanceKm <= 0) return ORDER_FEES.deliveryBaseHkd;
  return Math.round(
    ORDER_FEES.deliveryBaseHkd + distanceKm * ORDER_FEES.deliveryPerKmHkd,
  );
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function resolveCartLines(lines: CartLine[]): Array<{
  line: CartLine;
  item: CatalogItem;
}> {
  return lines
    .map((line) => {
      const item = ORDER_CATALOG_BY_ID[line.catalogId];
      if (!item) return null;
      return { line, item };
    })
    .filter((entry): entry is { line: CartLine; item: CatalogItem } => entry != null);
}

export function estimateOrder(
  mode: FulfillmentMode,
  address: DeliveryAddress | null,
): OrderEstimate {
  if (mode === "pickup") {
    const minutes = ORDER_TIMING.pickupPrepMinutes;
    return {
      minutes,
      label: `Ready in ~${minutes} min`,
    };
  }

  if (!address) {
    return {
      minutes: ORDER_TIMING.deliveryBaseMinutes,
      label: "Add address for delivery ETA",
    };
  }

  const distanceKm = haversineKm(
    RESTAURANT.lat,
    RESTAURANT.lng,
    address.lat,
    address.lng,
  );
  const minutes =
    ORDER_TIMING.deliveryBaseMinutes +
    Math.round(distanceKm * ORDER_TIMING.deliveryMinutesPerKm);

  if (distanceKm > ORDER_LIMITS.maxDeliveryKm) {
    return {
      minutes,
      distanceKm,
      label: `Outside delivery zone (${distanceKm.toFixed(1)} km)`,
    };
  }

  return {
    minutes,
    distanceKm,
    label: `Delivery ~${minutes} min · ${distanceKm.toFixed(1)} km`,
  };
}

export function cartTotals(
  lines: CartLine[],
  mode: FulfillmentMode,
  address: DeliveryAddress | null,
): {
  subtotal: number;
  deliveryFee: number;
  total: number;
  estimate: OrderEstimate;
  deliverable: boolean;
} {
  const subtotal = cartSubtotal(lines);
  const estimate = estimateOrder(mode, address);
  const distanceKm = estimate.distanceKm ?? 0;
  const deliveryFee =
    mode === "delivery" && address && distanceKm <= ORDER_LIMITS.maxDeliveryKm
      ? deliveryFeeKm(distanceKm)
      : 0;
  const deliverable =
    mode === "pickup" ||
    (address != null && distanceKm <= ORDER_LIMITS.maxDeliveryKm);

  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    estimate,
    deliverable,
  };
}

export function displayItemName(item: CatalogItem): string {
  return item.variantLabel ? `${item.name} (${item.variantLabel})` : item.name;
}

export function minScheduleValue(): string {
  const date = new Date(Date.now() + ORDER_TIMING.scheduleLeadMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultDeliveryInstructions(): DeliveryInstructions {
  return {
    dropOff: "hand_to_me",
    ringBell: "ring",
    notes: "",
  };
}

export function deliveryInstructionsSummary(
  instructions: DeliveryInstructions,
): string {
  const dropOff =
    DELIVERY_DROP_OFF_OPTIONS.find((option) => option.id === instructions.dropOff)
      ?.label ?? instructions.dropOff;
  const parts: string[] = [dropOff];
  /* Doorbell preference only applies to "leave at door". */
  if (instructions.dropOff === "leave_at_door") {
    parts.push(
      DELIVERY_RING_BELL_OPTIONS.find((option) => option.id === instructions.ringBell)
        ?.label ?? instructions.ringBell,
    );
  }
  const notes = instructions.notes.trim();
  if (notes) parts.push(notes);
  return parts.join(" · ");
}

export function timingSummary(timing: OrderTiming, estimateMinutes: number): string {
  if (timing.mode === "scheduled" && timing.scheduledAt) {
    const date = new Date(timing.scheduledAt);
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return `ASAP · ~${estimateMinutes} min`;
}
