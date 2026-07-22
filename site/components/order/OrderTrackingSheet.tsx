import { useEffect, useState } from "react";
import { OrderTrackingMap } from "@/components/order/OrderTrackingMap";
import { RESTAURANT } from "@/lib/order-config";
import {
  TRACKING_STAGE_DURATION_MS,
  trackingStepsFor,
  type DeliveryTrackingStage,
} from "@/lib/order-tracking";
import type { PlacedOrderSnapshot } from "@/lib/order-types";
import { formatHkd } from "@/lib/order-utils";

type Props = {
  order: PlacedOrderSnapshot;
  onDismiss: () => void;
  onComplete: () => void;
};

export function OrderTrackingSheet({ order, onDismiss, onComplete }: Props) {
  const steps = trackingStepsFor(order.fulfillment);
  const [stageIndex, setStageIndex] = useState(0);
  const currentStep = steps[stageIndex];
  const currentStage = currentStep?.id ?? steps[steps.length - 1].id;
  const isComplete = stageIndex >= steps.length - 1;

  useEffect(() => {
    if (isComplete) return;
    const timer = window.setTimeout(() => {
      setStageIndex((index) => Math.min(index + 1, steps.length - 1));
    }, TRACKING_STAGE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isComplete, stageIndex, steps.length]);

  const showMap =
    order.fulfillment === "delivery" && order.address != null;

  return (
    <div
      className="order-sheet order-sheet--tracking"
      role="dialog"
      aria-modal="true"
      aria-label="Order progress"
    >
      <div className="order-sheet__backdrop" onClick={onDismiss} aria-hidden />
      <div className="order-sheet__panel order-sheet__panel--tracking">
        <header className="order-sheet__header">
          <div>
            <p className="order-tracking__eyebrow">Order confirmed</p>
            <h2 className="order-sheet__title order-tracking__title">{currentStep.label}</h2>
          </div>
          <button
            type="button"
            className="order-icon-btn"
            onClick={onDismiss}
            aria-label="Close order tracking"
          >
            ×
          </button>
        </header>

        <div className="order-sheet__body order-sheet__body--scroll">
          {showMap && order.address ? (
            <OrderTrackingMap
              address={order.address}
              stage={currentStage as DeliveryTrackingStage}
            />
          ) : (
            <div className="order-tracking-pickup-card">
              <p className="order-tracking-pickup-card__label">Pickup at</p>
              <p className="order-tracking-pickup-card__name">{RESTAURANT.name}</p>
              <p className="order-tracking-pickup-card__address">{RESTAURANT.address}</p>
            </div>
          )}

          <ol className="order-tracking-steps" aria-label="Order progress">
            {steps.map((step, index) => {
              const status =
                index < stageIndex ? "done" : index === stageIndex ? "active" : "upcoming";
              return (
                <li
                  key={step.id}
                  className={`order-tracking-step order-tracking-step--${status}`}
                >
                  <span className="order-tracking-step__marker" aria-hidden />
                  <span className="order-tracking-step__label">{step.label}</span>
                </li>
              );
            })}
          </ol>

          <p className="order-tracking__meta">
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
            {formatHkd(order.totalHkd)} · ~{order.estimateMinutes} min
          </p>
          <p className="order-tracking__draft-note">
            Preview tracking — connect kitchen dispatch and a courier API for live updates.
          </p>
        </div>

        <footer className="order-sheet__footer">
          <button
            type="button"
            className="order-btn order-btn--primary"
            onClick={isComplete ? onComplete : onDismiss}
          >
            {isComplete ? "Done" : "Close"}
          </button>
        </footer>
      </div>
    </div>
  );
}
