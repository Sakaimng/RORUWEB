import {
  DELIVERY_DROP_OFF_OPTIONS,
  DELIVERY_RING_BELL_OPTIONS,
} from "@/lib/order-config";
import type { DeliveryInstructions, DropOffPreference } from "@/lib/order-types";

type Props = {
  value: DeliveryInstructions;
  onChange: (next: DeliveryInstructions) => void;
};

export function OrderDeliveryInstructions({ value, onChange }: Props) {
  function handleDropOffChange(dropOff: DropOffPreference) {
    onChange({
      ...value,
      dropOff,
      /* Doorbell only applies to "leave at door" — reset when switching away. */
      ringBell: dropOff === "leave_at_door" ? value.ringBell : "ring",
    });
  }

  return (
    <section className="order-block">
      <h3 className="order-block__title">Delivery instructions</h3>

      <div className="order-instruction-group">
        <label className="order-instruction-group__label" htmlFor="order-drop-off">
          Drop-off
        </label>
        <select
          id="order-drop-off"
          className="order-field order-field--select"
          value={value.dropOff}
          onChange={(event) =>
            handleDropOffChange(event.target.value as DropOffPreference)
          }
        >
          {DELIVERY_DROP_OFF_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {value.dropOff === "leave_at_door" ? (
        <fieldset className="order-instruction-group">
          <legend className="order-instruction-group__label">Doorbell</legend>
          <div className="order-segment">
            {DELIVERY_RING_BELL_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`order-segment__btn${value.ringBell === option.id ? " is-active" : ""}`}
                aria-pressed={value.ringBell === option.id}
                onClick={() => onChange({ ...value, ringBell: option.id })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="order-instruction-group__label" htmlFor="order-delivery-notes">
        Notes for driver
      </label>
      <textarea
        id="order-delivery-notes"
        className="order-field order-field--textarea"
        rows={3}
        maxLength={240}
        placeholder="Gate code, unit, floor, buzzer name…"
        value={value.notes}
        onChange={(event) => onChange({ ...value, notes: event.target.value })}
      />
      <p className="order-block__hint order-block__hint--optional">
        Optional
      </p>
    </section>
  );
}
