import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { ORDER_INTEGRATIONS } from "@/lib/order-config";
import { formatHkd } from "@/lib/order-utils";

const stripePromise = ORDER_INTEGRATIONS.stripePublishableKey
  ? loadStripe(ORDER_INTEGRATIONS.stripePublishableKey)
  : null;

function PaymentForm({
  totalHkd,
  onSuccess,
}: {
  totalHkd: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order?confirmed=1`,
      },
      redirect: "if_required",
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Payment failed");
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="order-payment-form">
      <PaymentElement options={{ layout: "tabs" }} />
      {error ? <p className="order-field-error">{error}</p> : null}
      <button type="submit" className="order-btn order-btn--primary" disabled={!stripe || submitting}>
        {submitting ? "Processing…" : `Pay ${formatHkd(totalHkd)}`}
      </button>
    </form>
  );
}

type Props = {
  totalHkd: number;
  onSuccess: () => void;
};

export function OrderPaymentSection({ totalHkd, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripePromise || totalHkd <= 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/order/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountHkd: totalHkd }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { clientSecret?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
        if (!cancelled) setClientSecret(data.clientSecret ?? null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [totalHkd]);

  if (!ORDER_INTEGRATIONS.stripePublishableKey) {
    return (
      <div className="order-payment-placeholder">
        <p className="order-payment-placeholder__title">Payment (draft)</p>
        <p className="order-payment-placeholder__copy">
          Add <code>STRIPE_SECRET_KEY</code> and{" "}
          <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to enable Stripe checkout.
        </p>
        <button type="button" className="order-btn order-btn--primary" onClick={onSuccess}>
          Place draft order · {formatHkd(totalHkd)}
        </button>
      </div>
    );
  }

  if (loading) {
    return <p className="order-muted">Preparing secure checkout…</p>;
  }

  if (error) {
    return <p className="order-field-error">{error}</p>;
  }

  if (!clientSecret || !stripePromise) {
    return <p className="order-muted">Checkout unavailable.</p>;
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#121212",
        borderRadius: "12px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm totalHkd={totalHkd} onSuccess={onSuccess} />
    </Elements>
  );
}
