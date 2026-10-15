// RORUBARU · upcoming events: a small dismissible banner for the next one + every upcoming event on top of the Events panel.
// Each event's own clock decides (ev.tz hours ahead of UTC, default 8 = Hong Kong, the same +8 h clock as script.js hkHour):
// "Tonight" on its day(s), "Tomorrow" the day before, otherwise the date; gone after 23:59 local on its last day.
// Booking = the site's own Book link (read from the header), or the event's own link, or none yet (ev.book === false).
import { upcoming } from './events-data.js?v=ev2';

// × hides the banner for this page view only: every load/refresh shows it again.
const LS = 'roru-evbar-x'; // old "dismissed forever" key: cleared, no longer read
try { localStorage.removeItem(LS); } catch (e) {}
let dismissedId = null;
const tzOf = (ev) => (typeof ev.tz === 'number' ? ev.tz : 8);
const today = (tz) => { const d = new Date(Date.now() + tz * 3600e3); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const dayOf = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const daysTo = (ev) => Math.round((dayOf(ev.date) - today(tzOf(ev))) / 864e5);
const daysLeft = (ev) => Math.round((dayOf(ev.end || ev.date) - today(tzOf(ev))) / 864e5);
// start instant (local midnight of the first day) for ordering events in different time zones
const startOf = (ev) => dayOf(ev.date) - tzOf(ev) * 3600e3;
const all = () => upcoming.filter((ev) => daysLeft(ev) >= 0).sort((a, b) => startOf(a) - startOf(b));
const next = () => all()[0] || null;
const rel = (ev) => { const n = daysTo(ev); return n <= 0 ? 'Tonight' : n === 1 ? 'Tomorrow' : ev.day; };
const barRel = (ev) => { const r = rel(ev); return r === ev.day && ev.short ? ev.short : r; };
const bookHref = () => { const a = document.querySelector('.topbar .book'); return a ? a.href : ''; };
const bookOf = (ev) => (ev.book === false ? '' : typeof ev.book === 'string' ? ev.book : bookHref());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- the Events panel: an "Upcoming" card per event, above everything else ----
const tpl = document.getElementById('tpl-events');
function cardHTML(ev) {
  const r = rel(ev), date = r === ev.day ? '' : `<span class="ev-up-sep" aria-hidden="true">·</span><span>${esc(ev.day)}</span>`;
  const href = bookOf(ev);
  const img = ev.image ? `<img src="${esc(ev.image)}" alt="${esc(ev.title)}" width="96" height="120" decoding="async">` : '';
  return `<section class="ev-up" data-ev="${esc(ev.id)}" data-rel="${esc(r)}" aria-label="${esc(ev.title)}">
  <p class="ev-up-label"><span class="ev-up-tag">Upcoming</span></p>
  <div class="ev-up-card">
    ${img && ev.poster ? `<a class="ev-up-poster" href="${esc(ev.poster)}" target="_blank" rel="noopener" aria-label="${esc(ev.title)}">${img}</a>` : img}
    <div class="ev-up-txt">
      <p class="ev-up-when"><b class="ev-up-rel">${esc(r)}</b>${date}<span class="ev-up-sep" aria-hidden="true">·</span><span>${esc(ev.time)}</span></p>
      <h3 class="ev-up-title">${esc(ev.title)}</h3>
      <p class="ev-up-kind">${esc(ev.kind)}</p>
      ${ev.where ? `<p class="ev-up-where" style="margin:0 0 6px;font-size:12px;line-height:1.35;opacity:.8">${ev.map ? `<a href="${esc(ev.map)}" target="_blank" rel="noopener" style="color:inherit">${esc(ev.where)}</a>` : esc(ev.where)}</p>` : ''}
      <p class="ev-d">${esc(ev.text)}</p>
      ${ev.seatings && ev.seatings.length ? `<p class="ev-up-seatings" style="margin:8px 0 0;font-size:12px;line-height:1.45"><span style="opacity:.75">${esc(ev.seatingsLabel || 'Seatings')}</span>${ev.seatings.map((s) => `<br><b style="white-space:nowrap">${esc(s)}</b>`).join('')}</p>` : ''}
    </div>
  </div>
  <div class="ev-up-book">${href ? `<a class="btn" href="${esc(href)}" target="_blank" rel="noopener" data-t="book">Book a seat</a>` : ''}<p class="note">${esc(ev.booking)}</p></div>
</section>`;
}
const sig = (list) => list.map((ev) => ev.id + ':' + rel(ev)).join('|');
function syncPanel(list) {
  if (!tpl) return;
  const c = tpl.content;
  c.querySelectorAll('.ev-up').forEach((n) => n.remove());
  if (list.length) { const h2 = c.querySelector('h2'); h2.insertAdjacentHTML('afterend', list.map(cardHTML).join('')); }
  // the panel is open right now: refresh what is on screen too
  const shown = [...document.querySelectorAll('#panelBody .ev-up')];
  if (!shown.length) return;
  const was = shown.map((n) => n.dataset.ev + ':' + n.dataset.rel).join('|');
  if (was === sig(list)) return;
  shown.slice(1).forEach((n) => n.remove());
  if (list.length) shown[0].outerHTML = list.map(cardHTML).join(''); else shown[0].remove();
  const b = document.querySelector('#panelBody'); if (b && window.RORU_I18N) window.RORU_I18N.apply(b);
}

// ---- the banner (the next event only) ----
let bar = null;
function buildBar(ev) {
  const href = bookOf(ev);
  bar = document.createElement('aside');
  bar.className = 'evbar';
  bar.id = 'evBar';
  bar.dataset.ev = ev.id;
  bar.innerHTML = `<button class="evbar-main" type="button" data-open="events">
    <span class="evbar-when"><span class="evbar-dot" aria-hidden="true"></span><span class="evbar-rel"></span><span class="evbar-sep" aria-hidden="true">·</span><span class="evbar-time">${esc(ev.barTime || ev.time)}</span></span>
    <span class="evbar-title">${esc(ev.barTitle || ev.title)}</span>
  </button>${href ? `<a class="evbar-book" href="${esc(href)}" target="_blank" rel="noopener" data-t="book">Book</a>` : ''}<button class="evbar-x" type="button" aria-label="Close" data-t-aria="close">×</button>`;
  bar.querySelector('.evbar-x').addEventListener('click', () => {
    dismissedId = ev.id;
    bar.classList.add('gone');
    setTimeout(() => { if (bar) { bar.remove(); bar = null; } }, 260);
  });
  document.getElementById('app').appendChild(bar);
  if (window.RORU_I18N) window.RORU_I18N.apply(bar);
}
function syncBar(ev) {
  if (!ev || dismissedId === ev.id) { if (bar) { bar.remove(); bar = null; } return; }
  if (bar && bar.dataset.ev !== ev.id) { bar.remove(); bar = null; }
  if (!bar) buildBar(ev);
  const r = bar.querySelector('.evbar-rel'), v = barRel(ev);
  if (r.dataset.v !== v) {
    r.dataset.v = v; r.textContent = v; bar.dataset.rel = v === 'Tonight' ? 'tonight' : v === 'Tomorrow' ? 'tomorrow' : 'date';
  }
}

function tick() { const list = all(); syncPanel(list); syncBar(list[0] || null); }
tick();
setInterval(tick, 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
