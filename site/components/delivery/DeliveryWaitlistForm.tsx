"use client";

import { useId, useState, type FormEvent } from "react";
import type { DeliveryWaitlistCopy } from "@/lib/delivery-copy";

type Status = "idle" | "sending" | "success" | "error";

export function DeliveryWaitlistForm({
  copy,
}: {
  copy: DeliveryWaitlistCopy;
}) {
  const emailId = useId();
  const companyId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get("email")?.toString() ?? "";
    const company = data.get("company")?.toString() ?? "";

    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/delivery-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setStatus("error");
        setError(
          typeof body.error === "string" && body.error !== "waitlist_unavailable"
            ? body.error
            : copy.error,
        );
        return;
      }

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
      setError(copy.error);
    }
  }

  if (status === "success") {
    return (
      <div
        className="roru-delivery-waitlist__success"
        role="status"
        aria-live="polite"
      >
        <span className="roru-delivery-waitlist__success-mark" aria-hidden>
          ✓
        </span>
        <p>{copy.success}</p>
      </div>
    );
  }

  return (
    <form className="roru-delivery-waitlist" onSubmit={onSubmit}>
      <label className="roru-delivery-waitlist__label" htmlFor={emailId}>
        {copy.emailLabel}
      </label>
      <div className="roru-delivery-waitlist__controls">
        <input
          id={emailId}
          name="email"
          className="roru-delivery-waitlist__input"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={copy.emailPlaceholder}
          maxLength={254}
          required
        />
        <button
          className="roru-delivery-waitlist__submit"
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? copy.sending : copy.submit}
        </button>
      </div>
      <div className="roru-delivery-waitlist__honeypot" aria-hidden="true">
        <label htmlFor={companyId}>Company</label>
        <input
          id={companyId}
          name="company"
          type="text"
          autoComplete="off"
          tabIndex={-1}
        />
      </div>
      {status === "error" ? (
        <p className="roru-delivery-waitlist__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
