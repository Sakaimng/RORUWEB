import { useOrderCart } from "@/components/order/OrderCartProvider";
import {
  displayItemName,
  formatHkd,
  resolveCartLines,
} from "@/lib/order-utils";

type Props = {
  onCheckout: () => void;
  onClose: () => void;
};

export function OrderCartSheet({ onCheckout, onClose }: Props) {
  const { lines, addItem, decrementItem, removeItem, totals, itemCount } =
    useOrderCart();
  const resolved = resolveCartLines(lines);

  return (
    <div className="order-sheet" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="order-sheet__backdrop" onClick={onClose} aria-hidden />
      <div className="order-sheet__panel">
        <header className="order-sheet__header">
          <h2 className="order-sheet__title">Your cart</h2>
          <button type="button" className="order-icon-btn" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </header>

        <div className="order-sheet__body">
          {resolved.length === 0 ? (
            <p className="order-muted">Your cart is empty.</p>
          ) : (
            <>
              <ul className="order-cart-list">
                {resolved.map(({ line, item }) => (
                  <li key={line.catalogId} className="order-cart-row">
                    <div className="order-cart-row__main">
                      <p className="order-cart-row__name">{displayItemName(item)}</p>
                      <p className="order-cart-row__meta">{item.sectionName}</p>
                      <p className="order-cart-row__price">{formatHkd(item.price * line.quantity)}</p>
                    </div>
                    <div className="order-qty" aria-label={`Quantity for ${item.name}`}>
                      <button
                        type="button"
                        className="order-qty__btn"
                        onClick={() => decrementItem(line.catalogId)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="order-qty__value">{line.quantity}</span>
                      <button
                        type="button"
                        className="order-qty__btn"
                        onClick={() => addItem(line.catalogId)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="order-cart-row__remove"
                      onClick={() => removeItem(line.catalogId)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="order-cart-more">
                <button
                  type="button"
                  className="order-cart-more__btn"
                  onClick={onClose}
                >
                  Add more items
                </button>
              </div>
            </>
          )}
        </div>

        {itemCount > 0 ? (
          <footer className="order-sheet__footer">
            <div className="order-summary-line">
              <span>Subtotal</span>
              <span>{formatHkd(totals.subtotal)}</span>
            </div>
            {totals.deliveryFee > 0 ? (
              <div className="order-summary-line">
                <span>Delivery fee</span>
                <span>{formatHkd(totals.deliveryFee)}</span>
              </div>
            ) : null}
            <div className="order-summary-line order-summary-line--total">
              <span>Total</span>
              <span>{formatHkd(totals.total)}</span>
            </div>
            <button type="button" className="order-btn order-btn--primary" onClick={onCheckout}>
              Go to checkout
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
