import { NextResponse } from "next/server";
import { INQUIRY_PUBLIC_EMAIL } from "@/lib/content";

const MAX = {
  name: 200,
  email: 254,
  phone: 40,
  message: 5000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  /** Honeypot: must be empty. */
  company?: unknown;
};

function isNonEmptyString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

export async function POST(req: Request) {
  let json: Body;
  try {
    json = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof json.company === "string" && json.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  if (!isNonEmptyString(json.name, MAX.name)) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!isNonEmptyString(json.email, MAX.email) || !EMAIL_RE.test(json.email.trim())) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (json.phone !== undefined && json.phone !== null && String(json.phone).length > 0) {
    if (typeof json.phone !== "string" || json.phone.length > MAX.phone) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
  }
  if (!isNonEmptyString(json.message, MAX.message) || json.message.trim().length < 8) {
    return NextResponse.json(
      { error: "Message must be at least 8 characters" },
      { status: 400 }
    );
  }

  const name = json.name.trim();
  const email = json.email.trim();
  const phone = typeof json.phone === "string" && json.phone.trim() ? json.phone.trim() : "";
  const message = json.message.trim();

  const to = process.env.INQUIRY_TO_EMAIL || INQUIRY_PUBLIC_EMAIL;
  const from = process.env.INQUIRY_FROM_EMAIL;
  const key = process.env.RESEND_API_KEY;

  if (key && from) {
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : "Phone: —",
      "",
      "Message:",
      message,
    ].join("\n");

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Website inquiry from ${name}`,
        text,
        reply_to: email,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      if (process.env.NODE_ENV === "development") {
        console.error("[inquiry] Resend error:", r.status, err);
      }
      return NextResponse.json(
        { error: "Could not send. Please try again or email us directly." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, sent: true });
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[inquiry] (dev, no Resend) ", { name, email, phone, messageLength: message.length });
    return NextResponse.json({ ok: true, sent: true, dev: true });
  }

  return NextResponse.json(
    { error: "inquiry_unavailable", contact: INQUIRY_PUBLIC_EMAIL },
    { status: 503 }
  );
}
