"use client";

import { useId, useState } from "react";
import { INQUIRY_PUBLIC_EMAIL } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

type Status = "idle" | "sending" | "success" | "error";

export function InquirySection() {
  const { t } = useI18n();
  const formId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name")?.toString() ?? "",
      email: data.get("email")?.toString() ?? "",
      phone: data.get("phone")?.toString() ?? "",
      message: data.get("message")?.toString() ?? "",
      company: data.get("company")?.toString() ?? "",
    };

    setStatus("sending");
    setErrMsg("");

    try {
      const r = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = (await r.json().catch(() => ({}))) as { error?: string; contact?: string };

      if (r.status === 503) {
        setStatus("error");
        setErrMsg(t.inquiry.errUnavailable);
        return;
      }
      if (!r.ok) {
        setStatus("error");
        setErrMsg(
          out.error && typeof out.error === "string"
            ? out.error
            : t.inquiry.errGeneric
        );
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrMsg(t.inquiry.errOffline);
    }
  }

  return (
    <section
      className="roru-inquiry-section section-surface"
      id="inquiry"
      aria-labelledby={`${formId}-heading`}
    >
      <div className="roru-inquiry-grid grid min-h-0 grid-cols-6 gap-[9px] text-[var(--text)]">
        <div className="col-span-6 max-w-3xl" data-roru-reveal="up">
          <h2
            id={`${formId}-heading`}
            className="m-0 text-left text-[clamp(48px,7vw,132px)] font-thin uppercase leading-[0.82] tracking-[0.03em] indent-[-0.3%]"
          >
            {t.inquiry.title}
          </h2>
          <p className="mt-4 max-w-xl text-[clamp(15px,1.1vw,20px)] leading-relaxed text-[var(--text)] opacity-80">
            {t.inquiry.desc}
          </p>
        </div>

        {status === "success" ? (
          <div className="col-span-6 max-w-3xl pt-6" role="status" aria-live="polite">
            <p className="m-0 text-[clamp(16px,1.2vw,22px)] leading-snug text-[var(--text)]">
              {t.inquiry.success}
            </p>
            <button
              type="button"
              className="mt-8 cursor-pointer border-0 bg-transparent p-0 text-sm uppercase leading-none tracking-[0.08em] text-[var(--text)] underline decoration-[color:var(--text)] underline-offset-4"
              onClick={() => {
                setStatus("idle");
                setErrMsg("");
              }}
            >
              {t.inquiry.sendAnother}
            </button>
          </div>
        ) : (
          <form
            className="col-span-6 grid max-w-3xl grid-cols-1 gap-4 pt-8 min-[500px]:grid-cols-2"
            onSubmit={onSubmit}
            noValidate
            data-roru-reveal="up"
            data-roru-reveal-delay="0.05"
          >
            <p className="min-[500px]:col-span-2 m-0">
              <label
                className="mb-2 block text-xs font-normal uppercase leading-none tracking-[0.08em] text-[var(--text)] opacity-80"
                htmlFor={`${formId}-name`}
              >
                {t.inquiry.name}
              </label>
              <input
                className="min-h-11 w-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--text)]"
                type="text"
                id={`${formId}-name`}
                name="name"
                autoComplete="name"
                required
                maxLength={200}
              />
            </p>
            <p className="min-[500px]:col-span-2 m-0">
              <label
                className="mb-2 block text-xs font-normal uppercase leading-none tracking-[0.08em] text-[var(--text)] opacity-80"
                htmlFor={`${formId}-email`}
              >
                {t.inquiry.email}
              </label>
              <input
                className="min-h-11 w-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--text)]"
                type="email"
                id={`${formId}-email`}
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                inputMode="email"
              />
            </p>
            <p className="min-[500px]:col-span-2 m-0">
              <label
                className="mb-2 block text-xs font-normal uppercase leading-none tracking-[0.08em] text-[var(--text)] opacity-80"
                htmlFor={`${formId}-phone`}
              >
                {t.inquiry.phone}{" "}
                <span className="normal-case opacity-60">{t.inquiry.optional}</span>
              </label>
              <input
                className="min-h-11 w-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--text)]"
                type="tel"
                id={`${formId}-phone`}
                name="phone"
                autoComplete="tel"
                maxLength={40}
                inputMode="tel"
              />
            </p>
            <p className="min-[500px]:col-span-2 m-0">
              <label
                className="mb-2 block text-xs font-normal uppercase leading-none tracking-[0.08em] text-[var(--text)] opacity-80"
                htmlFor={`${formId}-message`}
              >
                {t.inquiry.message}
              </label>
              <textarea
                className="min-h-40 w-full resize-y border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--text)]"
                id={`${formId}-message`}
                name="message"
                required
                minLength={8}
                maxLength={5000}
                rows={6}
              />
            </p>
            <p className="m-0 hidden" aria-hidden="true">
              <label htmlFor={`${formId}-company`}>Company</label>
              <input
                type="text"
                id={`${formId}-company`}
                name="company"
                autoComplete="off"
                tabIndex={-1}
                className="h-0 w-0"
              />
            </p>
            {status === "error" && errMsg && (
              <p
                className="min-[500px]:col-span-2 m-0 text-sm text-red-600"
                role="alert"
              >
                {errMsg}{" "}
                <a
                  className="text-[var(--text)] underline"
                  href={`mailto:${INQUIRY_PUBLIC_EMAIL}`}
                >
                  {INQUIRY_PUBLIC_EMAIL}
                </a>
              </p>
            )}
            <div className="min-[500px]:col-span-2">
              <button
                type="submit"
                className="mt-1 inline-flex min-w-[120px] cursor-pointer items-center justify-center border-0 bg-[var(--text)] px-[18px] py-3.5 text-base uppercase leading-none text-[var(--surface)] disabled:cursor-wait disabled:opacity-50"
                disabled={status === "sending"}
              >
                {status === "sending" ? t.inquiry.sending : t.inquiry.send}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
