export function hkDateKey(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
}

/** First weekday (0=Sun..6=Sat) for HK-local calendar month start */
export function monthStartWeekdayHK(year: number, monthIndex: number): number {
  const d = new Date(Date.UTC(year, monthIndex, 1, 16));
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd as keyof typeof map] ?? 0;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Minutes since midnight in Asia/Hong_Kong (for “today” slot filtering). */
export function hkMinutesSinceMidnight(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return h * 60 + m;
}
