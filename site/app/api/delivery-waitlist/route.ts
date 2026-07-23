import { NextResponse } from "next/server";
import { INQUIRY_PUBLIC_EMAIL } from "@/lib/content";

const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistBody = {
  email?: unknown;
  /** Honeypot: must remain empty. */
  company?: unknown;
};

function validEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_EMAIL_LENGTH &&
    EMAIL_RE.test(value.trim())
  );
}

export async function POST(request: Request) {
  let body: WaitlistBody;
  try {
    body = (await request.json()) as WaitlistBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Return success to bots without sending or exposing the honeypot.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  if (!validEmail(body.email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const email = body.email.trim();
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.DELIVERY_WAITLIST_FROM_EMAIL ?? process.env.INQUIRY_FROM_EMAIL;
  const to =
    process.env.DELIVERY_WAITLIST_TO_EMAIL ??
    process.env.INQUIRY_TO_EMAIL ??
    INQUIRY_PUBLIC_EMAIL;

  if (apiKey && from) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: "Delivery waitlist signup",
          reply_to: email,
          text: [
            "New RORUBARU delivery waitlist signup",
            "",
            `Email: ${email}`,
            `Submitted: ${new Date().toISOString()}`,
          ].join("\n"),
        }),
      });

      if (!response.ok) {
        console.error("[delivery-waitlist] Resend request failed", {
          status: response.status,
        });
        return NextResponse.json(
          { error: "We couldn’t add you right now. Please try again." },
          { status: 502 },
        );
      }

      return NextResponse.json({ ok: true, sent: true });
    } catch (error) {
      console.error("[delivery-waitlist] Resend request errored", error);
      return NextResponse.json(
        { error: "We couldn’t add you right now. Please try again." },
        { status: 502 },
      );
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[delivery-waitlist] Signup received in development");
    return NextResponse.json({ ok: true, sent: true, dev: true });
  }

  console.error("[delivery-waitlist] Email delivery is not configured");
  return NextResponse.json({ error: "waitlist_unavailable" }, { status: 503 });
}
