import { useCallback, useEffect, useState } from "react";
import { OrderAddressField } from "@/components/order/OrderAddressField";
import { OrderDeliveryInstructions } from "@/components/order/OrderDeliveryInstructions";
import { minScheduleValue, useOrderCart } from "@/components/order/OrderCartProvider";
import { OrderPaymentSection } from "@/components/order/OrderPaymentSection";
import { RESTAURANT, ORDER_LIMITS } from "@/lib/order-config";
import type { DeliveryAddress } from "@/lib/order-types";
import {
  deliveryInstructionsSummary,
  formatHkd,
  timingSummary,
  displayItemName,
  resolveCartLines,
} from "@/lib/order-utils";

type Props = {
  onClose: () => void;
};

export function OrderCheckoutSheet({ onClose }: Props) {
  const {
    lines,
    fulfillment,
    address,
    timing,
    totals,
    setAddress,
    setTiming,
    deliveryInstructions,
    setDeliveryInstructions,
    startOrderTracking,
  } = useOrderCart();
  const [addressInput, setAddressInput] = useState(address?.formatted ?? "");
  const resolved = resolveCartLines(lines);

  useEffect(() => {
    setAddressInput(address?.formatted ?? "");
  }, [address]);

  const handleAddressSelect = useCallback(
    (next: DeliveryAddress) => {
      setAddress(next);
      setAddressInput(next.formatted);
    },
    [setAddress],
  );

  const handleAddressInputChange = useCallback(
    (next: string) => {
      setAddressInput(next);
      if (address && next.trim() !== address.formatted.trim()) {
        setAddress(null);
      }
    },
    [address, setAddress],
  );

  function handlePlaceDraft() {
    startOrderTracking({
      fulfillment,
      address,
      totalHkd: totals.total,
      estimateMinutes: totals.estimate.minutes,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    });
    onClose();
  }

  const canCheckout =
    lines.length > 0 &&
    totals.deliverable &&
    totals.subtotal >= ORDER_LIMITS.minOrderHkd &&
    (fulfillment === "pickup" || address != null);

  return (
    <div className="order-sheet" role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="order-sheet__backdrop" onClick={onClose} aria-hidden />
      <div className="order-sheet__panel order-sheet__panel--tall">
        <header className="order-sheet__header">
          <h2 className="order-sheet__title">Checkout</h2>
          <button type="button" className="order-icon-btn" onClick={onClose} aria-label="Close checkout">
            ×
          </button>
        </header>

        <div className="order-sheet__body order-sheet__body--scroll">
          <section className="order-block">
            <h3 className="order-block__title">Timing</h3>
            <div className="order-segment">
              <button
                type="button"
                className={`order-segment__btn${timing.mode === "asap" ? " is-active" : ""}`}
                onClick={() => setTiming({ mode: "asap" })}
              >
                ASAP
              </button>
              <button
                type="button"
                className={`order-segment__btn${timing.mode === "scheduled" ? " is-active" : ""}`}
                onClick={() =>
                  setTiming({
                    mode: "scheduled",
                    scheduledAt: timing.scheduledAt ?? minScheduleValue(),
                  })
                }
              >
                Schedule
              </button>
            </div>
            <p className="order-block__hint">{timingSummary(timing, totals.estimate.minutes)}</p>
            {timing.mode === "scheduled" ? (
              <input
                type="datetime-local"
                className="order-field"
                min={minScheduleValue()}
                value={timing.scheduledAt ?? minScheduleValue()}
                onChange={(event) =>
                  setTiming({ mode: "scheduled", scheduledAt: event.target.value })
                }
              />
            ) : null}
          </section>

          {fulfillment === "delivery" ? (
            <>
              <section className="order-block">
                <h3 className="order-block__title">Delivery address</h3>
                <OrderAddressField
                  value={addressInput}
                  onChange={handleAddressInputChange}
                  onSelect={handleAddressSelect}
                />
                <p className="order-block__hint order-block__hint--eta">{totals.estimate.label}</p>
              </section>
              <OrderDeliveryInstructions
                value={deliveryInstructions}
                onChange={setDeliveryInstructions}
              />
            </>
          ) : (
            <section className="order-block">
              <h3 className="order-block__title">Pickup location</h3>
              <p className="order-block__copy">{RESTAURANT.address}</p>
              <p className="order-block__hint">{totals.estimate.label}</p>
            </section>
          )}

          <section className="order-block">
            <h3 className="order-block__title">Order summary</h3>
            <ul className="order-checkout-list">
              {resolved.map(({ line, item }) => (
                <li key={line.catalogId} className="order-checkout-list__row">
                  <span>
                    {line.quantity}× {displayItemName(item)}
                  </span>
                  <span>{formatHkd(item.price * line.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="order-summary-line">
              <span>Subtotal</span>
              <span>{formatHkd(totals.subtotal)}</span>
            </div>
            {totals.deliveryFee > 0 ? (
              <div className="order-summary-line">
                <span>Delivery</span>
                <span>{formatHkd(totals.deliveryFee)}</span>
              </div>
            ) : null}
            <div className="order-summary-line order-summary-line--total">
              <span>Total</span>
              <span>{formatHkd(totals.total)}</span>
            </div>
            {totals.subtotal < ORDER_LIMITS.minOrderHkd ? (
              <p className="order-field-error">
                Minimum order {formatHkd(ORDER_LIMITS.minOrderHkd)}
              </p>
            ) : null}
            {!totals.deliverable ? (
              <p className="order-field-error">Address is outside the delivery zone.</p>
            ) : null}
            {fulfillment === "delivery" ? (
              <p className="order-block__hint">
                {deliveryInstructionsSummary(deliveryInstructions)}
              </p>
            ) : null}
          </section>

          <section className="order-block">
            <h3 className="order-block__title">Payment</h3>
            {canCheckout ? (
              <OrderPaymentSection totalHkd={totals.total} onSuccess={handlePlaceDraft} />
            ) : (
              <p className="order-muted">Complete address and minimum order to pay.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
