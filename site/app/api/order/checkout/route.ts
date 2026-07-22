import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  let amountHkd = 0;
  try {
    const body = (await request.json()) as { amountHkd?: number };
    amountHkd = Math.round(Number(body.amountHkd) || 0);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (amountHkd < 1) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountHkd * 100),
      currency: "hkd",
      automatic_payment_methods: { enabled: true },
      metadata: { source: "roru-order-draft" },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
