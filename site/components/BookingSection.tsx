"use client";

import { useMemo, useState } from "react";
import {
  SPECIAL_RULES,
  buildTockUrl,
  computeTimeSlots,
  type BookingType,
} from "@/lib/booking";
import {
  buildTockTrackingUrl,
  trackReservationExperienceSelection,
  trackTockReservationCheckout,
} from "@/lib/analytics";
import { BOOKING_DATE_LOCALE, useI18n } from "@/lib/i18n";
import { hkDateKey, hkMinutesSinceMidnight } from "@/lib/hk-date";

const DATE_OPTIONS_AHEAD = 120;

function addDaysToDateKey(baseKey: string, days: number): string {
  const [y, m, d] = baseKey.split("-").map(Number);
  const ms = Date.UTC(y!, m! - 1, d!) + days * 86_400_000;
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function formatDateLabel(key: string, locale: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12)).toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Hong_Kong",
  });
}

function buildAvailableDates(fromKey: string, count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const key = addDaysToDateKey(fromKey, i);
    if (!SPECIAL_RULES[key]?.all?.disabled) {
      dates.push(key);
    }
  }
  return dates;
}

export function BookingSection() {
  const { lang, t } = useI18n();
  const b = t.booking;
  const dateLocale = BOOKING_DATE_LOCALE[lang];
  const todayKey = hkDateKey();
  const availableDates = useMemo(
    () => buildAvailableDates(todayKey, DATE_OPTIONS_AHEAD),
    [todayKey]
  );

  const [booking, setBooking] = useState<BookingType>("lunch");
  const [party, setParty] = useState(2);
  const [dayKey, setDayKey] = useState(todayKey);
  const [slot, setSlot] = useState<string | null>(null);

  const resolvedDayKey = availableDates.includes(dayKey)
    ? dayKey
    : (availableDates[0] ?? todayKey);

  const isToday = resolvedDayKey === todayKey;
  const slots = computeTimeSlots(resolvedDayKey, booking, {
    nowHKMinutes: hkMinutesSinceMidnight(),
    isToday,
  });

  const ctaReady = Boolean(resolvedDayKey && slot);
  const mobileBookingSummary = slot
    ? `${party} · ${formatDateLabel(resolvedDayKey, dateLocale)} · ${slot}`
    : b.availableTimeSlots;
  const tockUrl =
    ctaReady && slot
      ? buildTockTrackingUrl(
          buildTockUrl(booking, resolvedDayKey, party, slot),
          {
            campaign: "booking_widget",
            content: booking,
          },
        )
      : null;

  function trackCheckoutStart() {
    trackTockReservationCheckout({
      source: "reservation_widget",
      experience: booking,
      partySize: party,
    });
  }

  return (
    <section
      className="roru-booking-section section-surface"
      id="roru-booking-section"
    >
      <div className="roru-booking-grid grid grid-cols-6 text-[var(--text)]">
        <div className="roru-booking-title col-span-6 md:col-span-3">
          <h2 className="m-0 text-left font-bold uppercase tracking-[0.03em]">
            {b.pageTitle}
          </h2>
        </div>

        <div className="roru-booking-options col-span-6 flex flex-col self-start md:col-span-3">
          <button
            type="button"
            className={`roru-booking-option grid cursor-pointer grid-cols-[minmax(72px,0.85fr)_minmax(0,1.5fr)] gap-[clamp(10px,1.5vw,18px)] border-0 bg-transparent p-0 text-left uppercase text-[var(--text)] transition-opacity ${
              booking === "lunch" ? "is-active opacity-100" : "opacity-[0.28]"
            }`}
            data-booking="lunch"
            onClick={() => {
              if (booking !== "lunch") {
                trackReservationExperienceSelection("lunch");
              }
              setBooking("lunch");
              setSlot(null);
            }}
          >
            <span className="label font-light uppercase leading-[0.92] tracking-[-0.04em]">
              {b.lunch}
            </span>
            <span className="value font-light uppercase leading-[0.92] tracking-[-0.04em]">
              {b.chefsCounter}
            </span>
          </button>
          <button
            type="button"
            className={`roru-booking-option grid cursor-pointer grid-cols-[minmax(72px,0.85fr)_minmax(0,1.5fr)] gap-[clamp(10px,1.5vw,18px)] border-0 bg-transparent p-0 text-left uppercase text-[var(--text)] transition-opacity ${
              booking === "dinner" ? "is-active opacity-100" : "opacity-[0.28]"
            }`}
            data-booking="dinner"
            onClick={() => {
              if (booking !== "dinner") {
                trackReservationExperienceSelection("dinner");
              }
              setBooking("dinner");
              setSlot(null);
            }}
          >
            <span className="label font-light uppercase leading-[0.92] tracking-[-0.04em]">
              {b.dinner}
            </span>
            <span className="value font-light uppercase leading-[0.92] tracking-[-0.04em]">
              {b.chefsCounter}
            </span>
          </button>
        </div>

        <div className="roru-booking-fields col-span-6 flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="roru-booking-party max-w-[160px] flex-1">
            <label
              htmlFor="roru-party-size"
              className="party-label mb-2.5 block text-[16px] uppercase leading-none tracking-[0.08em] text-[var(--text)]"
            >
              {b.partySize}
            </label>
            <select
              id="roru-party-size"
              className="party-select min-h-11 w-full cursor-pointer rounded-full border-0 bg-[#F1F1F1] px-3 py-2.5 text-base text-[#121212]"
              value={party}
              onChange={(e) => setParty(Number(e.target.value))}
              aria-label={b.partySize}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="roru-booking-date max-w-[320px] flex-1">
            <label
              htmlFor="roru-booking-date"
              className="date-label mb-2.5 block text-[16px] uppercase leading-none tracking-[0.08em] text-[var(--text)]"
            >
              {b.date}
            </label>
            <select
              id="roru-booking-date"
              className="date-select min-h-11 w-full cursor-pointer rounded-full border-0 bg-[#F1F1F1] px-3 py-2.5 text-base text-[#121212]"
              value={resolvedDayKey}
              onChange={(e) => {
                setDayKey(e.target.value);
                setSlot(null);
              }}
              aria-label={b.date}
            >
              {availableDates.map((key) => (
                <option key={key} value={key}>
                  {formatDateLabel(key, dateLocale)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="roru-booking-slots col-span-6 flex flex-col md:col-span-6">
          <h3 className="slots-title mb-[18px] text-base font-normal uppercase leading-none tracking-[0.08em] text-[var(--text)]">
            {b.availableTimeSlots}
          </h3>
          <div className="slots-list grid min-h-[calc(3*2.75rem+18px)] grid-cols-4 gap-[9px]">
            {slots.length === 0 ? (
              <div className="no-slots col-span-full text-[var(--text)] opacity-70">
                {SPECIAL_RULES[resolvedDayKey]?.all?.disabled
                  ? b.noAvailability
                  : SPECIAL_RULES[resolvedDayKey]?.[booking]?.disabled
                    ? b.notAvailable
                    : b.noAvailability}
              </div>
            ) : (
              slots.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`slot-btn min-h-11 cursor-pointer border px-3 py-2.5 text-base leading-none ${
                    slot === t
                      ? "is-selected border-[var(--text)] bg-[var(--text)] text-[var(--surface)]"
                      : "border-[color:var(--border)] bg-transparent text-[var(--text)]"
                  }`}
                  data-time={t}
                  onClick={() => setSlot(t)}
                >
                  {t}
                </button>
              ))
            )}
          </div>

          {tockUrl ? (
            <a
              href={tockUrl}
              className="roru-booking-cta mt-6 inline-flex w-fit min-w-[120px] cursor-pointer items-center justify-center border-0 bg-[var(--text)] px-[18px] py-3.5 text-base uppercase leading-none text-white no-underline"
              onClick={trackCheckoutStart}
            >
              {b.continue}
            </a>
          ) : (
            <button
              type="button"
              className="roru-booking-cta mt-6 inline-flex w-fit min-w-[120px] cursor-pointer items-center justify-center border-0 bg-[var(--text)] px-[18px] py-3.5 text-base uppercase leading-none text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled
            >
              {b.continue}
            </button>
          )}
        </div>

        <div className="roru-booking-note col-span-6 mt-5 self-end">
          <h3
            id="roru-booking-note-text"
            className="m-0 leading-[1.24em] text-[var(--text)] opacity-80"
          >
            {booking === "lunch" ? b.noteLunch : b.noteDinner}
          </h3>
        </div>
      </div>

      <div className="roru-booking-mobile-action">
        <p aria-live="polite" aria-atomic="true" title={mobileBookingSummary}>
          {mobileBookingSummary}
        </p>
        {tockUrl ? (
          <a
            href={tockUrl}
            className="roru-booking-mobile-action__cta inline-flex items-center justify-center no-underline"
            onClick={trackCheckoutStart}
          >
            {b.continue}
          </a>
        ) : (
          <button
            type="button"
            className="roru-booking-mobile-action__cta"
            disabled
          >
            {b.continue}
          </button>
        )}
      </div>
    </section>
  );
}
