// RORUBARU · upcoming event: a small dismissible banner + the event on top of the Events panel.
// Hong Kong time decides everything (same +8 h clock as script.js hkHour): "Tonight" on the day, "Tomorrow" the day
// before, otherwise the date; gone after 23:59 HKT on the day. Booking = the site's own Book link (read from the header).
import { upcoming } from './events-data.js?v=ev1';

const LS = 'roru-evbar-x';
const hkDay = () => { const d = new Date(Date.now() + 8 * 3600e3); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const dayOf = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const daysTo = (ev) => Math.round((dayOf(ev.date) - hkDay()) / 864e5);
const next = () => upcoming.filter((ev) => daysTo(ev) >= 0).sort((a, b) => dayOf(a.date) - dayOf(b.date))[0] || null;
const rel = (ev) => { const n = daysTo(ev); return n === 0 ? 'Tonight' : n === 1 ? 'Tomorrow' : ev.day; };
const bookHref = () => { const a = document.querySelector('.topbar .book'); return a ? a.href : ''; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- the Events panel: an "Upcoming" card above everything else ----
const tpl = document.getElementById('tpl-events');
function cardHTML(ev) {
  const r = rel(ev), date = r === ev.day ? '' : `<span class="ev-up-sep" aria-hidden="true">·</span><span>${esc(ev.day)}</span>`;
  return `<section class="ev-up" data-ev="${esc(ev.id)}" data-rel="${esc(r)}" aria-label="${esc(ev.title)}">
  <p class="ev-up-label"><span class="ev-up-tag">Upcoming</span></p>
  <div class="ev-up-card">
    ${ev.image ? `<img src="${esc(ev.image)}" alt="${esc(ev.title)}" width="96" height="120" decoding="async">` : ''}
    <div class="ev-up-txt">
      <p class="ev-up-when"><b class="ev-up-rel">${esc(r)}</b>${date}<span class="ev-up-sep" aria-hidden="true">·</span><span>${esc(ev.time)}</span></p>
      <h3 class="ev-up-title">${esc(ev.title)}</h3>
      <p class="ev-up-kind">${esc(ev.kind)}</p>
      <p class="ev-d">${esc(ev.text)}</p>
    </div>
  </div>
  <div class="ev-up-book"><a class="btn" href="${esc(bookHref())}" target="_blank" rel="noopener" data-t="book">Book a seat</a><p class="note">${esc(ev.booking)}</p></div>
</section>`;
}
function syncPanel(ev) {
  if (!tpl) return;
  const c = tpl.content, old = c.querySelector('.ev-up');
  if (old) old.remove();
  if (ev) { const h2 = c.querySelector('h2'); h2.insertAdjacentHTML('afterend', cardHTML(ev)); }
  // the panel is open right now: refresh what is on screen too
  const live = document.querySelector('#panelBody .ev-up');
  if (live && (!ev || live.dataset.rel !== rel(ev))) {
    if (ev) live.outerHTML = cardHTML(ev); else live.remove();
    const b = document.querySelector('#panelBody'); if (b && window.RORU_I18N) window.RORU_I18N.apply(b);
  }
}

// ---- the banner ----
let bar = null;
function buildBar(ev) {
  bar = document.createElement('aside');
  bar.className = 'evbar';
  bar.id = 'evBar';
  bar.dataset.ev = ev.id;
  bar.innerHTML = `<button class="evbar-main" type="button" data-open="events">
    <span class="evbar-when"><span class="evbar-dot" aria-hidden="true"></span><span class="evbar-rel"></span><span class="evbar-sep" aria-hidden="true">·</span><span class="evbar-time">${esc(ev.time)}</span></span>
    <span class="evbar-title">${esc(ev.title)}</span>
  </button><a class="evbar-book" href="${esc(bookHref())}" target="_blank" rel="noopener" data-t="book">Book</a><button class="evbar-x" type="button" aria-label="Close" data-t-aria="close">×</button>`;
  bar.querySelector('.evbar-x').addEventListener('click', () => {
    try { localStorage.setItem(LS, ev.id); } catch (e) {}
    bar.classList.add('gone');
    setTimeout(() => { if (bar) { bar.remove(); bar = null; } }, 260);
  });
  document.getElementById('app').appendChild(bar);
  if (window.RORU_I18N) window.RORU_I18N.apply(bar);
}
function syncBar(ev) {
  let dismissed = null; try { dismissed = localStorage.getItem(LS); } catch (e) {}
  if (!ev || dismissed === ev.id) { if (bar) { bar.remove(); bar = null; } return; }
  if (bar && bar.dataset.ev !== ev.id) { bar.remove(); bar = null; }
  if (!bar) buildBar(ev);
  const r = bar.querySelector('.evbar-rel'), v = rel(ev);
  if (r.dataset.v !== v) { r.dataset.v = v; r.textContent = v; bar.dataset.rel = v === 'Tonight' ? 'tonight' : v === 'Tomorrow' ? 'tomorrow' : 'date'; }
}

function tick() { const ev = next(); syncPanel(ev); syncBar(ev); }
tick();
setInterval(tick, 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
