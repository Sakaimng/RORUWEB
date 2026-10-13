// Live Hong Kong clock + open / closed status for the header pill.
// Hours: daily 12:00–22:00, last order 21:30. Happy hour Mon – Fri 12:00–19:00.
// Always Hong Kong time (Asia/Hong_Kong), whatever the visitor's own time zone.
export const HOURS = { open: 12 * 60, lastOrder: 21 * 60 + 30, close: 22 * 60, hhStart: 12 * 60, hhEnd: 19 * 60, hhDays: [1, 2, 3, 4, 5] };
const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
let fmt = null;
try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e) { fmt = null; }

// { day 0–6 (Sun=0), h, m } in Hong Kong for a given instant
export function hkParts(date) {
  if (fmt) {
    const p = {}; for (const x of fmt.formatToParts(date)) p[x.type] = x.value;
    if (p.weekday in DAYS) return { day: DAYS[p.weekday], h: Number(p.hour) % 24, m: Number(p.minute) };
  }
  // fallback: Hong Kong is UTC+8 all year (no daylight saving)
  const d = new Date(date.getTime() + 8 * 3600e3);
  return { day: d.getUTCDay(), h: d.getUTCHours(), m: d.getUTCMinutes() };
}

// state: 'open' (before last order), 'closing' (after last order, before close), 'closed'; hh: happy hour now
export function hkStatus(date) {
  const { day, h, m } = hkParts(date), t = h * 60 + m;
  const open = t >= HOURS.open && t < HOURS.close;
  const state = !open ? 'closed' : t < HOURS.lastOrder ? 'open' : 'closing';
  const hh = open && HOURS.hhDays.includes(day) && t >= HOURS.hhStart && t < HOURS.hhEnd;
  const time = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  return { day, time, state, hh };
}

export const LABELS = {
  en: { open: 'Open now', closing: 'Closing soon', closed: 'Closed', lo: 'last order 21:30', shut: 'closes 22:00', opens: 'opens 12:00', hh: 'Happy hour now', tz: 'HKT' },
  zh: { open: '營業中', closing: '即將休息', closed: '休息中', lo: '最後落單 21:30', shut: '22:00 休息', opens: '12:00 開門', hh: '歡樂時光', tz: '香港' },
  ja: { open: '営業中', closing: 'まもなく閉店', closed: '準備中', lo: 'L.O. 21:30', shut: '22:00 閉店', opens: '12:00 開店', hh: 'ハッピーアワー', tz: '香港' },
};

// the pill's words, e.g. ['22:19 HKT', 'Closed', 'opens 12:00']
export function hkLine(date, lang) {
  const L = LABELS[lang] || LABELS.en, s = hkStatus(date);
  const time = lang === 'en' || !LABELS[lang] ? s.time + ' ' + L.tz : L.tz + ' ' + s.time;
  const extra = s.state === 'closed' ? L.opens : s.state === 'closing' ? L.shut : s.hh ? L.hh : L.lo;
  return { status: s, time, label: L[s.state], extra };
}

function mount() {
  const el = document.getElementById('hkClock'); if (!el) return;
  const tEl = el.querySelector('.hk-time'), sEl = el.querySelector('.hk-state'), xEl = el.querySelector('.hk-extra');
  let last = '';
  const draw = () => {
    const lang = document.documentElement.dataset.lang || 'en';
    const r = hkLine(new Date(), lang), key = lang + r.time + r.label + r.extra;
    if (key === last) return; last = key;
    tEl.textContent = r.time; sEl.textContent = r.label; xEl.textContent = r.extra;
    el.dataset.state = r.status.state; el.classList.toggle('hh', r.status.hh && r.status.state === 'open');
    el.setAttribute('aria-label', r.time + ', ' + r.label + ', ' + r.extra);
    el.hidden = false;
  };
  draw();
  setInterval(draw, 1000);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount(); }
