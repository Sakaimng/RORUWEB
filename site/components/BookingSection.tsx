"use client";

import { useMemo, useState } from "react";
import {
  SPECIAL_RULES,
  buildTockUrl,
  computeTimeSlots,
  type BookingType,
} from "@/lib/booking";
import { BOOKING_NOTES } from "@/lib/content";
import {
  daysInMonth,
  hkDateKey,
  hkMinutesSinceMidnight,
  monthStartWeekdayHK,
} from "@/lib/hk-date";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseTodayHKParts(): { y: number; m: number } {
  const key = hkDateKey();
  const [y, m] = key.split("-").map(Number);
  return { y: y!, m: (m ?? 1) - 1 };
}

export function BookingSection() {
  const todayKey = hkDateKey();
  const { y: minY, m: minM } = parseTodayHKParts();

  const [view, setView] = useState(() => ({ y: minY, m: minM }));

  const [booking, setBooking] = useState<BookingType>("lunch");
  const [party, setParty] = useState(2);
  const [dayKey, setDayKey] = useState(todayKey);
  const [slot, setSlot] = useState<string | null>(null);

  const isToday = dayKey === todayKey;
  const slots = computeTimeSlots(dayKey, booking, {
    nowHKMinutes: hkMinutesSinceMidnight(),
    isToday,
  });

  const { year, monthIndex, cells } = useMemo(() => {
    const year = view.y;
    const monthIndex = view.m;
    const startPad = monthStartWeekdayHK(year, monthIndex);
    const total = daysInMonth(year, monthIndex);
    const cells: ({ key: string; label: number } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ key, label: d });
    }
    return { year, monthIndex, cells };
  }, [view]);

  const monthLabel = new Date(Date.UTC(year, monthIndex, 1)).toLocaleString(
    "en-US",
    {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Hong_Kong",
    }
  );

  const viewingIsEarliest =
    view.y === minY && view.m === minM;

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(Date.UTC(v.y, v.m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  const ctaReady = Boolean(dayKey && slot);

  return (
    <section
      className="roru-booking-section homepage-reveal section-surface"
      id="roru-booking-section"
    >
      <div className="roru-booking-grid grid min-h-screen grid-cols-6 gap-[9px] px-[2vw] py-[min(8vh,72px)] text-[var(--text)]">
        <div className="roru-booking-title col-span-6 pt-[4vh] md:col-span-3">
          <h2 className="m-0 text-left text-[clamp(48px,7vw,132px)] font-thin uppercase leading-[0.82] tracking-[0.03em] indent-[-0.5%]">
            Reserve
          </h2>
        </div>

        <div className="roru-booking-options col-span-6 flex flex-col gap-6 self-start pt-[4vh] md:col-span-3 md:pt-[4vh]">
          <button
            type="button"
            className={`roru-booking-option grid cursor-pointer grid-cols-[minmax(110px,0.9fr)_minmax(0,1.4fr)] gap-[18px] border-0 bg-transparent p-0 text-left text-[var(--text)] transition-opacity ${
              booking === "lunch" ? "is-active opacity-100" : "opacity-[0.28]"
            } hover:opacity-100`}
            data-booking="lunch"
            onClick={() => {
              setBooking("lunch");
              setSlot(null);
            }}
          >
            <span className="label text-[clamp(28px,3vw,64px)] font-light leading-[0.92] tracking-[-0.04em]">
              Lunch
            </span>
            <span className="value text-[clamp(28px,3vw,64px)] font-light leading-[0.92] tracking-[-0.04em]">
              Chef&apos;s Counter
            </span>
          </button>
          <button
            type="button"
            className={`roru-booking-option grid cursor-pointer grid-cols-[minmax(110px,0.9fr)_minmax(0,1.4fr)] gap-[18px] border-0 bg-transparent p-0 text-left text-[var(--text)] transition-opacity ${
              booking === "dinner" ? "is-active opacity-100" : "opacity-[0.28]"
            } hover:opacity-100`}
            data-booking="dinner"
            onClick={() => {
              setBooking("dinner");
              setSlot(null);
            }}
          >
            <span className="label text-[clamp(28px,3vw,64px)] font-light leading-[0.92] tracking-[-0.04em]">
              Dinner
            </span>
            <span className="value text-[clamp(28px,3vw,64px)] font-light leading-[0.92] tracking-[-0.04em]">
              Chef&apos;s Counter
            </span>
          </button>
        </div>

        <div className="roru-booking-party col-span-6 max-w-[160px]">
          <label
            htmlFor="roru-party-size"
            className="party-label mb-2.5 block text-[16px] uppercase leading-none tracking-[0.08em] text-[var(--accent)]"
          >
            Party size
          </label>
          <select
            id="roru-party-size"
            className="party-select min-h-11 w-full cursor-pointer border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--text)]"
            value={party}
            onChange={(e) => setParty(Number(e.target.value))}
            aria-label="Party size"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="roru-booking-calendar col-span-6 flex min-h-[420px] flex-col justify-start border-0 border-l border-[color:var(--border)] pl-0 text-[var(--text)] md:col-span-3 md:pl-[18px]">
          <div className="calendar-header mb-[18px] grid grid-cols-[32px_1fr_32px] items-center gap-3">
            <button
              type="button"
              className="calendar-nav prev cursor-pointer border-0 bg-transparent p-0 text-[28px] leading-none text-[var(--text)] disabled:pointer-events-none disabled:opacity-25"
              aria-label="Previous month"
              disabled={viewingIsEarliest}
              onClick={() => {
                if (!viewingIsEarliest) shiftMonth(-1);
              }}
            >
              ‹
            </button>
            <div className="calendar-month text-center text-[clamp(18px,1.4vw,28px)] leading-none">
              {monthLabel}
            </div>
            <button
              type="button"
              className="calendar-nav next cursor-pointer border-0 bg-transparent p-0 text-[28px] leading-none text-[var(--text)]"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              ›
            </button>
          </div>

          <div className="calendar-weekdays mb-2 grid grid-cols-7 gap-2 text-center text-sm leading-none">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="calendar-days grid min-h-[280px] grid-cols-7 content-start gap-2 text-sm">
            {cells.map((cell, idx) =>
              cell ? (
                <CalendarDayButton
                  key={cell.key}
                  cell={cell}
                  dayKey={dayKey}
                  todayKey={todayKey}
                  onSelect={() => {
                    setDayKey(cell.key);
                    setSlot(null);
                  }}
                />
              ) : (
                <span key={`e-${idx}`} className="pointer-events-none opacity-0" />
              )
            )}
          </div>
        </div>

        <div className="roru-booking-slots col-span-6 flex min-h-[420px] flex-col md:col-span-3">
          <h3 className="slots-title mb-[18px] text-base font-normal uppercase leading-none tracking-[0.08em] text-[var(--accent)]">
            Available time slots
          </h3>
          <div className="slots-list grid min-h-[48px] grid-cols-2 gap-[9px] min-[400px]:grid-cols-3">
            {slots.length === 0 ? (
              <div className="no-slots col-span-full text-[var(--text)] opacity-70">
                {SPECIAL_RULES[dayKey]?.all?.disabled
                  ? "No availability"
                  : SPECIAL_RULES[dayKey]?.[booking]?.disabled
                    ? "Not available"
                    : "No availability"}
              </div>
            ) : (
              slots.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`slot-btn min-h-11 cursor-pointer border px-3 py-2.5 text-base leading-none ${
                    slot === t
                      ? "is-selected border-[var(--accent)] bg-[var(--accent)] text-black"
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

          <button
            type="button"
            className="roru-booking-cta mt-6 inline-flex w-fit min-w-[120px] cursor-pointer items-center justify-center border-0 bg-[var(--accent)] px-[18px] py-3.5 text-base uppercase leading-none text-black disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!ctaReady}
            onClick={() => {
              if (!ctaReady || !slot) return;
              window.location.href = buildTockUrl(booking, dayKey, party, slot);
            }}
          >
            Continue
          </button>
        </div>

        <div className="roru-booking-note col-span-6 mt-5 self-end">
          <h3
            id="roru-booking-note-text"
            className="m-0 text-[0.6em] leading-[1.24em] text-[var(--text)] opacity-80"
          >
            {BOOKING_NOTES[booking]}
          </h3>
        </div>
      </div>
    </section>
  );
}

function CalendarDayButton({
  cell,
  dayKey,
  todayKey,
  onSelect,
}: {
  cell: { key: string; label: number };
  dayKey: string;
  todayKey: string;
  onSelect: () => void;
}) {
  const blocked = SPECIAL_RULES[cell.key]?.all?.disabled;
  const isPast = cell.key < todayKey;
  const disabled = isPast || blocked;

  return (
    <button
      type="button"
      className={`flex aspect-square items-center justify-center border leading-none ${
        cell.key === dayKey
          ? "is-selected border-[var(--accent)] bg-[var(--accent)] text-black"
          : "border-[color:var(--border)] bg-transparent text-[var(--text)]"
      } ${cell.key === todayKey ? "ring-1 ring-[var(--accent)]" : ""} ${
        disabled ? "is-disabled cursor-not-allowed opacity-[0.22]" : "cursor-pointer"
      }`}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect();
      }}
    >
      {cell.label}
    </button>
  );
}
