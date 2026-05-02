"use client";

import { useEffect, useRef } from "react";
import { getHongKongHour } from "@/lib/content";

export function ThemeClassSync() {
  useEffect(() => {
    function applyAutoTheme() {
      const hour = getHongKongHour();
      const root = document.documentElement;
      root.classList.remove("theme-day", "theme-night");
      if (hour >= 6 && hour < 18) {
        root.classList.add("theme-day");
      } else {
        root.classList.add("theme-night");
      }
    }
    applyAutoTheme();
    const id = window.setInterval(applyAutoTheme, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}

type ClockProps = { className?: string };

export function HongKongClock({ className = "" }: ClockProps) {
  const clockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function tick() {
      const el = clockRef.current;
      if (!el) return;
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Hong_Kong",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(now);

      const h = parts.find((p) => p.type === "hour")?.value ?? "00";
      const m = parts.find((p) => p.type === "minute")?.value ?? "00";
      const sec = parts.find((p) => p.type === "second")?.value ?? "00";
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      el.textContent = `${h}:${m}:${sec}.${ms} HKT`;
    }

    tick();
    const id = window.setInterval(tick, 17);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      ref={clockRef}
      className={`font-mono text-[8px] leading-none tracking-tight sm:text-[9px] text-inherit tabular-nums ${className}`.trim()}
      id="roru-hk-clock"
      aria-label="Hong Kong time"
    >
      00:00:00.000 HKT
    </div>
  );
}
