/** Mirrors Squarespace booking behaviour — Tock experience URLs + special date rules. */

export const BOOKING_CONFIG = {
  lunch: {
    start: "12:00",
    end: "14:30",
    interval: 15,
    url: "https://www.exploretock.com/roru-baru/experience/599213/lunch-chefs-counter",
  },
  dinner: {
    start: "18:00",
    end: "21:00",
    interval: 15,
    url: "https://www.exploretock.com/roru-baru/experience/583185/dinner-chefs-counter",
  },
} as const;

export type BookingType = keyof typeof BOOKING_CONFIG;

type DayRule = {
  all?: { disabled?: boolean };
  lunch?: {
    disabled?: boolean;
    lastBooking?: string;
    allowedTimes?: string[];
  };
  dinner?: {
    disabled?: boolean;
    lastBooking?: string;
    allowedTimes?: string[];
  };
  drinks?: { lastBooking?: string };
};

export const SPECIAL_RULES: Record<string, DayRule> = {
  "2026-03-21": {
    lunch: { disabled: true },
    dinner: { lastBooking: "19:00" },
  },
  "2026-04-02": {
    dinner: {
      allowedTimes: ["18:00", "18:15", "18:30"],
    },
    drinks: {
      lastBooking: "18:30",
    },
  },
  "2026-04-24": {
    all: { disabled: true },
  },
  "2026-04-25": {
    all: { disabled: true },
  },
};

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function generateTimeSlots(
  start: string,
  end: string,
  interval: number
): string[] {
  const result: string[] = [];
  let current = timeToMinutes(start);
  const finish = timeToMinutes(end);
  while (current <= finish) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    result.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
    current += interval;
  }
  return result;
}

/** Weekday for a YYYY-MM-DD string interpreted as Hong Kong calendar date. */
export function weekdayFromDateKey(key: string): number {
  return new Date(`${key}T12:00:00+08:00`).getDay();
}

function getClosingTimeForWeekday(day: number): string | null {
  if (day >= 1 && day <= 4) return "22:00";
  if (day === 5 || day === 6) return "24:00";
  return null;
}

export function computeTimeSlots(
  dateKey: string,
  booking: BookingType,
  options: { nowHKMinutes: number; isToday: boolean }
): string[] {
  const rules = SPECIAL_RULES[dateKey];

  if (rules?.all?.disabled) {
    return [];
  }

  const config = BOOKING_CONFIG[booking];
  let slots = generateTimeSlots(config.start, config.end, config.interval);

  if (rules?.[booking]?.disabled) {
    return [];
  }

  if (rules?.[booking]?.allowedTimes) {
    slots = [...rules[booking].allowedTimes!];
  }

  const day = weekdayFromDateKey(dateKey);

  if ((day === 5 || day === 6) && booking === "dinner") {
    slots = [...slots, "21:15", "21:30"];
  }

  const closing = getClosingTimeForWeekday(day);
  if (closing) {
    const closingMin = timeToMinutes(closing);
    slots = slots.filter((t) => timeToMinutes(t) <= closingMin);
  }

  const lastRule = rules?.[booking];
  if (
    lastRule &&
    "lastBooking" in lastRule &&
    typeof lastRule.lastBooking === "string"
  ) {
    const lastMin = timeToMinutes(lastRule.lastBooking);
    slots = slots.filter((t) => timeToMinutes(t) <= lastMin);
  }

  if (options.isToday) {
    slots = slots.filter((t) => timeToMinutes(t) > options.nowHKMinutes);
  }

  const unique = [...new Set(slots)];
  unique.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  return unique;
}

export function buildTockUrl(
  booking: BookingType,
  dateKey: string,
  partySize: number,
  time: string
): string {
  const config = BOOKING_CONFIG[booking];
  const params = new URLSearchParams({
    date: dateKey,
    size: String(partySize),
    time,
  });
  return `${config.url}?${params.toString()}`;
}
