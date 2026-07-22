import type { FulfillmentMode } from "@/lib/order-types";

export type PickupTrackingStage = "preparing" | "ready_for_pickup";

export type DeliveryTrackingStage =
  | PickupTrackingStage
  | "driver_approaching"
  | "driver_picked_up"
  | "on_the_way";

export type OrderTrackingStage = PickupTrackingStage | DeliveryTrackingStage;

export type TrackingStep = {
  id: OrderTrackingStage;
  label: string;
};

export const PICKUP_TRACKING_STEPS: TrackingStep[] = [
  { id: "preparing", label: "Preparing your order" },
  { id: "ready_for_pickup", label: "Ready for pickup" },
];

export const DELIVERY_TRACKING_STEPS: TrackingStep[] = [
  { id: "preparing", label: "Preparing your order" },
  { id: "ready_for_pickup", label: "Ready for pickup" },
  { id: "driver_approaching", label: "Driver approaching restaurant" },
  { id: "driver_picked_up", label: "Driver picked up your order" },
  { id: "on_the_way", label: "Driver is on the way" },
];

/** Demo advance interval between tracking stages. */
export const TRACKING_STAGE_DURATION_MS = 6_000;

export function trackingStepsFor(fulfillment: FulfillmentMode): TrackingStep[] {
  return fulfillment === "delivery" ? DELIVERY_TRACKING_STEPS : PICKUP_TRACKING_STEPS;
}
