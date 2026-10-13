// RORUBARU · UI layer: panels, quick tabs, music, deep links (#menu, #visit …).
// No 3D in here, so the panels still work if the room can't render.
import TX from './i18n-dict.js?v=ln1';
const tr = (s) => ((TX[document.documentElement.dataset.lang] || {})[s] || s);
const panel = document.getElementById('panel');
const body = document.getElementById('panelBody');
const hint = document.getElementById('hint');
const music = document.getElementById('music');
const soundBtn = document.getElementById('soundBtn');
const KEYS = ['menu', 'build', 'dj', 'drinks', 'walkin', 'visit', 'lunch', 'central', 'events', 'delivery', 'more', 'about', 'reserve', 'social', 'inquire'];
let current = null;
let lastFocus = null;

function syncTabs() {
  const MORE = ['more', 'events', 'reserve', 'visit', 'dj', 'walkin', 'build', 'central', 'social', 'inquire'];
  document.querySelectorAll('.tabs [data-open]').forEach((b) => b.setAttribute('aria-current', (b.dataset.open === current || (b.dataset.open === 'more' && MORE.includes(current))) ? 'true' : 'false'));
}
function open(key, from) {
  if (!KEYS.includes(key)) return;
  const tpl = document.getElementById('tpl-' + key);
  if (!tpl) return;
  if (current === key && !panel.hidden) return;
  if (!current) lastFocus = document.activeElement;
  current = key;
  stopStoryVideo();
  body.replaceChildren(tpl.content.cloneNode(true));
  document.body.classList.toggle('about-open', key === 'about');
  body.scrollTop = 0;
  panel.hidden = false;
  panel.dataset.key = key;
  requestAnimationFrame(() => panel.classList.add('in'));
  document.body.classList.add('panel-open');
  hint.classList.add('gone');
  try { localStorage.setItem('roru-explored', '1'); } catch (e) {}
  syncTabs();
  syncMusic();
  if (history.replaceState) history.replaceState(null, '', '#' + key);
  window.dispatchEvent(new CustomEvent('roru:panel', { detail: { key, from } }));
  syncLang();
  if (PRICED && ['menu', 'lunch', 'drinks'].includes(key)) renderPriced(key);
  if (key === 'delivery') armDelivery();
  if (key === 'about') armStory();
  requestAnimationFrame(swipeHints); setTimeout(swipeHints, 500); setTimeout(swipeHints, 1500);
  if (key === 'build') import('./roll-viewer.js').then((m) => m.mount(body)).catch(() => { const l = body.querySelector('#rollLoading'); if (l) l.textContent = 'The 3D roll needs WebGL.'; });
  const h = body.querySelector('h2'); if (h && from !== 'hash') { h.tabIndex = -1; h.focus({ preventScroll: true }); }
}
// delivery: the team boxes up an order (CSS animation, ~3.3 s; the order buttons are live from the first frame).
// Tap the scene while it plays to skip to the packed box; tap again afterwards to replay.
// tap while it plays = skip to the packed box; tap after = play it again
function armDelivery() {}
body.addEventListener('click', (e) => {
  const st = e.target.closest('.dv-stage'); if (!st) return;
  const playing = st.getAnimations ? st.getAnimations({ subtree: true }).some((a) => a.playState === 'running') : false;
  st.classList.remove('run');
  if (playing) return;
  void st.offsetWidth; st.classList.add('run');
});
function close() {
  if (!current) return;
  current = null;
  stopStoryVideo();
  document.body.classList.remove('about-open');
  panel.classList.remove('in');
  document.body.classList.remove('panel-open');
  setTimeout(() => { if (!current) { panel.hidden = true; body.replaceChildren(); } }, 260);
  syncTabs();
  if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  window.dispatchEvent(new CustomEvent('roru:panel', { detail: { key: null } }));
  window.dispatchEvent(new CustomEvent('roru:closed'));
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

// music (default muted; only plays after a tap)
let playing = false;
// playlist: plays in order, advances on 'ended', loops back to the first track
const TRACKS = [
  { src: 'audio/dj-night.mp3?v=drop', title: 'Friday Counter' },
  { src: 'audio/dj-night-2.mp3?v=pl1', title: 'Last Order' },
  { src: 'audio/dj-night-3.mp3?v=pl1', title: 'Warm Rice' },
  { src: 'audio/dj-night-4.mp3?v=pl1', title: 'Neon Wan Chai' },
  { src: 'audio/dj-night-5.mp3?v=pl1', title: 'Crisp Nori' },
];
let track = 0;
music.loop = false;
music.removeAttribute('loop');
// the next track is fetched whole while the current one plays and handed over as a blob,
// so the switch needs no network and does not depend on the host answering byte-range requests
const blobUrl = {}, fetching = {};
function prefetch(i) {
  i = (i + TRACKS.length) % TRACKS.length;
  if (blobUrl[i] || fetching[i] || !window.fetch || !window.URL || !URL.createObjectURL) return;
  fetching[i] = fetch(TRACKS[i].src)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
    .then((b) => { blobUrl[i] = URL.createObjectURL(b.type ? b : new Blob([b], { type: 'audio/mpeg' })); })
    .catch(() => {})
    .then(() => { delete fetching[i]; });
}
function loadTrack(i, direct) {
  track = (i + TRACKS.length) % TRACKS.length;
  music.src = (!direct && blobUrl[track]) || TRACKS[track].src;
  music.dataset.track = String(track);
  music.dataset.title = TRACKS[track].title;
}
let retried = false, failsInRow = 0;
function playCurrent() {
  const p = music.play();
  if (p && p.catch) p.catch((e) => { if (e && e.name === 'NotAllowedError') { playing = false; syncMusic(); } });
}
music.addEventListener('ended', () => { retried = false; loadTrack(track + 1); if (playing) playCurrent(); });
music.addEventListener('playing', () => { failsInRow = 0; prefetch(track + 1); });
// a track that fails is retried once straight from its file, then skipped; after a full lap of failures the player stops
music.addEventListener('error', () => {
  if (!playing) return;
  if (!retried) { retried = true; delete blobUrl[track]; setTimeout(() => { if (!playing) return; loadTrack(track, true); playCurrent(); }, 800); return; }
  retried = false;
  if (++failsInRow >= TRACKS.length) { playing = false; syncMusic(); return; }
  loadTrack(track + 1); playCurrent();
});
function setMusic(on) {
  playing = on;
  if (on) { music.volume = 0.7; const p = music.play(); if (p && p.catch) p.catch(() => { playing = false; syncMusic(); }); }
  else music.pause();
  syncMusic();
}
function syncMusic() {
  document.querySelectorAll('[data-music]').forEach((b) => {
    b.setAttribute('aria-pressed', String(playing));
    b.classList.toggle('on', playing);
    const t = b.querySelector('.music-t'); if (t) t.textContent = playing ? 'Pause music' : 'Play a taste';
  });
  soundBtn.hidden = !playing;
  soundBtn.setAttribute('aria-label', playing ? 'Music on, tap to stop' : 'Music off');
  document.body.classList.toggle('music-on', playing);
}
soundBtn.addEventListener('click', () => setMusic(false));

document.addEventListener('click', (e) => {
  const lg = e.target.closest('.langs [data-lang]');
  if (lg) { const g = lg.closest('.langs'); if (!(g && g.dataset.swiped)) setLang(lg.dataset.lang); return; }
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); open(o.dataset.open, o.closest('.tabs') ? 'tab' : 'button'); return; }
  if (e.target.closest('[data-home]')) { e.preventDefault(); close(); return; }
  if (e.target.closest('[data-music]')) { setMusic(!playing); return; }
});
document.getElementById('panelClose').addEventListener('click', close);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

// swipe the sheet down to close (phones)
{
  let y0 = null, dy = 0;
  const grab = panel.querySelector('.grab');
  const startOk = (e) => e.target === grab || (body.scrollTop <= 0 && e.target.closest('.panel'));
  panel.addEventListener('touchstart', (e) => { if (innerWidth >= 760 || !startOk(e)) return; y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
  panel.addEventListener('touchmove', (e) => { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy > 0 && body.scrollTop <= 0) panel.style.transform = `translateY(${dy}px)`; }, { passive: true });
  panel.addEventListener('touchend', () => { if (y0 === null) return; panel.style.transform = ''; if (dy > 90) close(); y0 = null; }, { passive: true });
}

// Inquire: same fields as rorubaru.com's form. Their form posts to their own server (same-origin only, no CORS),
// so here it opens a prefilled email to hello@rorubaru.com. Nothing is sent or stored by this page.
document.addEventListener('submit', (e) => {
  const f = e.target.closest('#inqForm'); if (!f) return;
  e.preventDefault();
  const err = f.querySelector('#inqErr'), done = f.querySelector('#inqDone');
  const v = (n) => (f.elements[n] ? f.elements[n].value : '').trim();
  const name = v('name'), email = v('email'), phone = v('phone'), msg = v('message');
  let bad = null;
  if (!name) bad = 'name'; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad = 'email'; else if (msg.length < 8) bad = 'message';
  if (bad) {
    err.textContent = tr(bad === 'name' ? 'Please add your name.' : bad === 'email' ? 'Please add a valid email.' : 'Please write a message (8 characters or more).');
    err.hidden = false; f.elements[bad].focus(); return;
  }
  err.hidden = true;
  const subject = 'Inquiry from rorubaru.com: ' + name;
  const lines = ['Name: ' + name, 'Email: ' + email];
  if (phone) lines.push('Phone: ' + phone);
  lines.push('', msg);
  const href = 'mailto:hello@rorubaru.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  window.RORU_LAST_MAILTO = href;
  done.hidden = false;
  location.href = href;
});

// Our story (v23): the About tab IS the story, a full-screen black-and-white scroll (lines only from rorubaru.com/about).
// The video slot at the top plays only on a tap, inline. v3 has a soundtrack: the opening tap tries sound on (a user gesture),
// falls back to muted if play() is refused; the 🔇/🔊 button follows v.muted via volumechange. Hidden while STORY_VIDEO is false.
const STORY_VIDEO = true;
const portrait = () => !window.matchMedia || window.matchMedia('(orientation: portrait)').matches;
// The host answers byte-range requests with the whole file (200, no 206), and iPhone Safari will not play a
// <video> src served that way, so the file is fetched once and played from a blob URL (muted + playsinline,
// so play() is allowed after the fetch). Warmed when Our story opens, so a tap usually plays at once.
const storyBlobs = {};
function storyFile(v) {
  const nc = navigator.connection || {};
  const small = (window.innerWidth || 0) * (window.devicePixelRatio || 1) < 800 || nc.saveData || /(^|-)(2g|3g)$/.test(nc.effectiveType || '');
  return portrait() ? ((small && v.dataset.v916s) || v.dataset.v916) : v.dataset.v169;
}
function storyBlob(f) {
  if (!storyBlobs[f]) storyBlobs[f] = fetch(f).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then((b) => URL.createObjectURL(b.type ? b : new Blob([b], { type: 'video/mp4' }))).catch(() => f);
  return storyBlobs[f];
}
const MUTE_L = { en: ['Sound on', 'Sound off'], zh: ['開啟聲音', '關閉聲音'], ja: ['音声をオン', '音声をオフ'] };
function syncStoryMute(v) {
  const mb = body.querySelector('[data-story-mute]'); if (!mb || !v) return;
  const L = MUTE_L[curLang()] || MUTE_L.en;
  mb.setAttribute('aria-pressed', String(!v.muted)); mb.setAttribute('aria-label', v.muted ? L[0] : L[1]);
  if (!v.muted && playing) setMusic(false);
}
// play with sound if asked (and allowed); a refused unmuted play() falls back to muted so the video still runs.
// the sound button sits inside the video frame's bottom-right corner (object-fit: contain leaves bars),
// lifted above the bottom tab bar when the bar covers the frame.
function placeStoryMute() {
  const pl = body.querySelector('.os-player'), m = pl && pl.querySelector('.os-mute'), v = pl && pl.querySelector('video'); if (!m || pl.hidden) return;
  const r = pl.getBoundingClientRect(); const vw = v.videoWidth || (portrait() ? 9 : 16), vh = v.videoHeight || (portrait() ? 16 : 9);
  const sc = Math.min(r.width / vw, r.height / vh), gapB = (r.height - vh * sc) / 2, gapR = (r.width - vw * sc) / 2;
  const nav = document.querySelector('nav.tabs'); let cover = 0;
  if (nav && getComputedStyle(nav).display !== 'none') { const n = nav.getBoundingClientRect(); if (n.height && n.top < r.bottom) cover = r.bottom - n.top; }
  m.style.bottom = Math.round(Math.max(gapB, cover) + 12) + 'px'; m.style.right = Math.round(Math.max(gapR, 0) + 12) + 'px';
}
window.addEventListener('resize', placeStoryMute);
function storyPlay(v, sound) {
  v.muted = !sound; syncStoryMute(v);
  const p = v.play();
  if (p && p.catch) p.catch(() => { if (!v.muted) { v.muted = true; syncStoryMute(v); const q = v.play(); if (q && q.catch) q.catch(() => {}); } });
}
function stopStoryVideo() {
  const pl = body.querySelector('.os-player'); if (!pl) return;
  const v = pl.querySelector('video'); if (v) v.pause();
  pl.hidden = true; pl.classList.remove('paused'); document.documentElement.classList.remove('story-vid');
  const h = body.querySelector('.os-hero'); if (h) h.classList.remove('playing');
}
function armStory() {
  const os = body.querySelector('.os'); if (!os) return;
  const slot = os.querySelector('.os-vid');
  if (slot && STORY_VIDEO) {
    slot.dataset.on = '1';
    const im = slot.querySelector('.os-poster'); if (im) im.src = portrait() ? im.dataset.p916 : im.dataset.p169;
    const v = os.querySelector('.os-player video'); const nc = navigator.connection || {}; if (v && !nc.saveData) storyBlob(storyFile(v));
  }
  // progress dots follow the frame that fills most of the screen
  const dots = [...os.querySelectorAll('.os-prog i')], secs = [...os.querySelectorAll('.os-sec')];
  let cur = -1;
  const sync = () => {
    if (!body.contains(os)) return;
    const mid = body.scrollTop + body.clientHeight * 0.45;
    let i = 0; secs.forEach((s, j) => { if (s.offsetTop <= mid) i = j; });
    if (i !== cur) { cur = i; dots.forEach((d, j) => d.classList.toggle('on', j === i)); }
  };
  sync();
  body.addEventListener('scroll', sync, { passive: true });
}
body.addEventListener('click', (e) => {
  if (e.target.closest('[data-story-stop]')) { e.preventDefault(); stopStoryVideo(); return; }
  const tv = e.target.closest('.os-player video');
  if (tv) { e.preventDefault(); if (tv.paused) storyPlay(tv, !tv.muted); else tv.pause(); return; }
  const mb = e.target.closest('[data-story-mute]');
  if (mb) { e.preventDefault(); e.stopPropagation(); const v = body.querySelector('.os-player video'); if (!v) return; v.muted = !v.muted; if (!v.muted && v.paused && !v.ended) storyPlay(v, true); syncStoryMute(v); return; }
  if (!e.target.closest('[data-story-play]') || !STORY_VIDEO) return;
  e.preventDefault();
  const pl = body.querySelector('.os-player'), v = pl && pl.querySelector('video'); if (!v) return;
  if (!v.dataset.file) { const f = storyFile(v); v.dataset.file = f; const im = body.querySelector('.os-poster'); if (im && im.src) v.poster = im.src; storyBlob(f).then((u) => { if (v.dataset.file !== f) return; v.src = u; if (!pl.hidden) storyPlay(v, v.dataset.sound === '1'); }); }
  pl.hidden = false; body.querySelector('.os-hero').classList.add('playing'); document.documentElement.classList.add('story-vid');
  v.dataset.sound = '1'; placeStoryMute();
  if (!v.dataset.armed) { v.dataset.armed = '1'; v.addEventListener('ended', stopStoryVideo); v.addEventListener('pause', () => { if (!pl.hidden && !v.ended) pl.classList.add('paused'); }); v.addEventListener('play', () => pl.classList.remove('paused')); v.addEventListener('volumechange', () => syncStoryMute(v)); v.addEventListener('loadedmetadata', placeStoryMute); }
  if (v.getAttribute('src')) storyPlay(v, true); else { v.muted = true; syncStoryMute(v); }
});
window.RORU_STORY = { video: STORY_VIDEO, stop: stopStoryVideo };

// a small "swipe →" over any horizontal photo strip that actually overflows; it fades after the first swipe
function swipeHints() {
  body.querySelectorAll('.ev-strip, .ab-strip').forEach((s) => {
    if (s.dataset.sw || !s.clientWidth || s.scrollWidth <= s.clientWidth + 8) return;
    s.dataset.sw = '1';
    const h = document.createElement('p'); h.className = 'sw-hint'; h.setAttribute('aria-hidden', 'true');
    h.innerHTML = '<span class="l-en">swipe</span><span class="l-zh" lang="zh-Hant">滑動</span><span class="l-ja" lang="ja">スワイプ</span> <b>→</b>';
    s.before(h);
    const off = () => { if (s.scrollLeft > 12) { h.classList.add('gone'); s.removeEventListener('scroll', off); } };
    s.addEventListener('scroll', off, { passive: true });
  });
}

try { if (localStorage.getItem('roru-explored')) hint.classList.add('soft'); } catch (e) {}
window.RORU_UI = { open, close, get current() { return current; } };

// deep link: rorubaru…/#menu opens straight into the menu
function fromHash() { const k = location.hash.slice(1); if (k === 'story') { open('about', 'hash'); return; } if (KEYS.includes(k)) open(k, 'hash'); }
window.addEventListener('hashchange', fromHash);
// wait one frame so the room is listening before the first camera move
window.addEventListener('load', () => setTimeout(fromHash, 60));

// past-events lightbox: swipe, arrows, keys; photos load only when opened
import('./events-data.js').then(({ default: EVENTS }) => {
  const lb = document.getElementById('lightbox'), img = document.getElementById('lbImg'), cap = document.getElementById('lbCap');
  let ev = 0, ix = 0, back = null;
  // ev === -1: the About photos (read from the open panel, same order as on rorubaru.com/about)
  let about = [];
  const imgsOf = () => (ev === -1 ? about.map((a) => a.src) : EVENTS[ev].images);
  const show = () => {
    const list = imgsOf(); img.src = list[ix];
    if (ev === -1) { img.alt = about[ix].alt; cap.textContent = `${ix + 1} / ${list.length}`; }
    else { const e = EVENTS[ev]; img.alt = `${e.title}, ${e.date}, photo ${ix + 1} of ${list.length}`; cap.textContent = `${tr(e.title)} · ${tr(e.date)} · ${ix + 1}/${list.length}`; }
    const n = new Image(); n.src = list[(ix + 1) % list.length];
  };
  const openLb = (e, i) => { ev = e; ix = i; back = document.activeElement; lb.classList.toggle('lb-bw', e === -1); lb.hidden = false; document.body.classList.add('lb-open'); show(); document.getElementById('lbClose').focus({ preventScroll: true }); };
  const closeLb = () => { lb.hidden = true; document.body.classList.remove('lb-open'); img.removeAttribute('src'); if (back) back.focus({ preventScroll: true }); };
  const step = (d) => { const n = imgsOf().length; ix = (ix + d + n) % n; show(); };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-photo]'); if (b) { const [a, c] = b.dataset.photo.split(':').map(Number); openLb(a, c); } });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-about]'); if (!b) return;
    about = [...document.querySelectorAll('#panelBody [data-about] img')].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt }));
    if (about.length) openLb(-1, Number(b.dataset.about) || 0);
  });
  document.getElementById('lbClose').addEventListener('click', closeLb);
  document.getElementById('lbPrev').addEventListener('click', () => step(-1));
  document.getElementById('lbNext').addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', (e) => { if (lb.hidden) return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'Escape') { e.stopImmediatePropagation(); closeLb(); } }, true);
  let x0 = null; lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); x0 = null; }, { passive: true });
  window.RORU_GALLERY = { open: openLb, close: closeLb };
});


// ---------- language: EN / 繁中 / 日本語 ----------
// Every non-English string here is copied word for word from his site's code (lib/i18n.tsx,
// lib/delivery-copy.ts). Anything his site has no translation for stays in English.
const T = {
  zh: { 'nav.menu': '菜單', 'nav.lunch': '午餐', 'nav.delivery': '外賣', 'nav.about': '我哋嘅故事', 'nav.abouttab': '我哋嘅故事', 'nav.events': '活動', 'nav.reserve': '預約',
    book: '預約', past: '過往', hours: '營業時間', address: '地址', phone: '電話', location: '地址', visit: '地址 · 營業時間', close: '關閉',
    fp: '喺 foodpanda 訂購', kt: '喺 Keeta 訂購', 'hs.menu': '菜單', 'hs.events': '活動', 'hs.delivery': '外賣', 'hs.visit': '地址' },
  ja: { 'nav.menu': 'メニュー', 'nav.lunch': 'ランチ', 'nav.delivery': 'デリバリー', 'nav.about': '私たちの物語', 'nav.abouttab': '私たちの物語', 'nav.events': 'イベント', 'nav.reserve': '予約',
    book: '予約', past: '過去', hours: '営業時間', address: '所在地', phone: '電話番号', location: '所在地', visit: '所在地 · 営業時間', close: '閉じる',
    fp: 'foodpanda で注文する', kt: 'Keeta で注文する', 'hs.menu': 'メニュー', 'hs.events': 'イベント', 'hs.delivery': 'デリバリー', 'hs.visit': '所在地' },
};
const HTML_LANG = { en: 'en', zh: 'zh-Hant', ja: 'ja' };
const curLang = () => document.documentElement.dataset.lang || 'en';
function applyLang(root) {
  const l = curLang(), d = T[l] || {}, tx = TX[l] || {};
  root.querySelectorAll('[data-t]').forEach((el) => {
    if (el.dataset.en === undefined) el.dataset.en = el.textContent;
    const v = d[el.dataset.t] || tx[el.dataset.en.replace(/\s+/g, ' ').trim()];
    el.textContent = v || el.dataset.en;
    if (v) el.setAttribute('lang', HTML_LANG[l]); else el.removeAttribute('lang');
  });
  for (const a of ['aria', 'alt']) root.querySelectorAll('[data-t-' + a + ']').forEach((el) => {
    const attr = a === 'aria' ? 'aria-label' : 'alt', k = 'en' + a;
    if (el.dataset[k] === undefined) el.dataset[k] = el.getAttribute(attr) || '';
    el.setAttribute(attr, d[el.dataset['t' + a[0].toUpperCase() + a.slice(1)]] || el.dataset[k]);
  });
  txText(root.body || root, l);
}
// every other English text node: swapped for its zh / ja line (i18n-dict.js), back to English on EN.
// A node remembers its English and what we wrote, so text the page rewrites later is picked up fresh.
const TXN = new WeakMap();
const TX_SKIP = 'script,style,noscript,template,.l-en,.l-zh,.l-ja,[data-t],.langs,#hkClock,[data-no-tx]';
function txNode(n, dict) {
  let m = TXN.get(n);
  if (!m || n.data !== m.out) {
    if (!/[A-Za-z]/.test(n.data)) { if (m) TXN.delete(n); return; }
    m = { en: n.data, out: n.data }; TXN.set(n, m);
  }
  const el = n.parentElement; if (!el || el.closest(TX_SKIP)) return;
  const k = m.en.replace(/\s+/g, ' ').trim(), v = dict && dict[k];
  const want = v ? m.en.match(/^\s*/)[0] + v + m.en.match(/\s*$/)[0] : m.en;
  m.out = want;
  if (n.data !== want) n.data = want;
}
function txText(root, l) {
  if (!root || !root.nodeType) return;
  const dict = TX[l] || null;
  if (root.nodeType === 3) return txNode(root, dict);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) txNode(n, dict);
}
// text the page writes later (panels, counters, the music button) follows the language too, before it paints
new MutationObserver((muts) => {
  const l = curLang(); if (l === 'en') return;
  for (const mu of muts) { if (mu.type === 'characterData') txText(mu.target, l); else mu.addedNodes.forEach((nd) => txText(nd, l)); }
}).observe(document.body, { childList: true, subtree: true, characterData: true });
function setLang(l) { document.documentElement.dataset.lang = T[l] ? l : 'en'; try { localStorage.setItem('roru-lang', document.documentElement.dataset.lang); } catch (e) {} syncLang(); }
function syncLang() {
  const l = curLang();
  document.documentElement.lang = HTML_LANG[l] || 'en';
  document.querySelectorAll('.langs [data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
  applyLang(document);
  slideLangs();
}
/* sliding language pill: one highlight per switch that glides under the active language */
const LANG_ORDER = ['en', 'zh', 'ja'];
function placeThumb(g) {
  const th = g.querySelector('.langs-thumb'), b = g.querySelector('button[aria-pressed="true"]');
  if (!th || !b || !b.offsetWidth) return false;
  th.style.width = b.offsetWidth + 'px';
  th.style.transform = 'translateX(' + b.offsetLeft + 'px)';
  th.style.opacity = '1';
  return true;
}
function slideLangs() {
  document.querySelectorAll('.langs').forEach((g) => {
    if (!g.querySelector('.langs-thumb')) {
      const th = document.createElement('span'); th.className = 'langs-thumb'; th.setAttribute('aria-hidden', 'true');
      g.prepend(th); g.classList.add('has-thumb');
      let x0 = null;
      g.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
      g.addEventListener('pointerup', (e) => {
        if (x0 === null) return; const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) < 24) return;
        const i = LANG_ORDER.indexOf(curLang()), n = Math.max(0, Math.min(LANG_ORDER.length - 1, i + (dx > 0 ? 1 : -1)));
        if (n !== i) { g.dataset.swiped = '1'; setLang(LANG_ORDER[n]); setTimeout(() => { delete g.dataset.swiped; }, 60); }
      });
      g.addEventListener('pointercancel', () => { x0 = null; });
    }
    if (placeThumb(g)) { if (!g.classList.contains('slide-ready')) requestAnimationFrame(() => g.classList.add('slide-ready')); }
    else requestAnimationFrame(() => { if (placeThumb(g)) requestAnimationFrame(() => g.classList.add('slide-ready')); });
  });
}
window.addEventListener('resize', () => document.querySelectorAll('.langs').forEach(placeThumb));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll('.langs').forEach(placeThumb));
try { const l = localStorage.getItem('roru-lang'); if (l && T[l]) document.documentElement.dataset.lang = l; } catch (e) {}
try { const q = new URLSearchParams(location.search).get('lang'); if (q && (T[q] || q === 'en')) document.documentElement.dataset.lang = q; } catch (e) {}
syncLang();
window.RORU_I18N = { apply: applyLang, set: setLang };

// ---------- prices: all or nothing ----------
// menu.json mirrors the repo's menu structure. Prices appear only when show_prices is true AND every
// item (and every variant) has a number; otherwise the panels stay exactly as written, with no prices.
let PRICED = null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hk = (n) => 'HK$' + n;
function allPriced(m) {
  return m.boards.every((b) => b.sections.every((s) => s.items.every((it) => it.included ? true : it.variants ? it.variants.length && it.variants.every((v) => typeof v.price === 'number') : typeof it.price === 'number')));
}
function itemsHTML(items, hhNames) {
  if (!items.length) return '';
  return '<ul class="items priced">' + items.map((it) => {
    const p = it.included ? '' : it.variants ? it.variants.map((v) => `${esc(v.label)} ${hk(v.price)}`).join(' · ') : hk(it.price);
    const badge = hhNames && hhNames.has(it.name) ? ' <b class="hh-badge" title="On happy hour">HH</b>' : '';
    return `<li><span>${esc(it.name)}${badge}${it.description ? `<small>${esc(it.description)}</small>` : ''}</span><em>${p}</em></li>`;
  }).join('') + '</ul>';
}
function sectionsHTML(secs, hhNames) { return secs.map((s) => `<h3>${esc(s.name)}</h3>${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}${itemsHTML(s.items, hhNames)}`).join(''); }
// happy hour: only the drinks on happy hour, each with its HH price (low to high) and the regular price small
function hhOK(h) { return h && Array.isArray(h.items) && h.items.length && h.items.every((it) => typeof it.price === 'number'); }
function happyHTML(h) {
  const items = [...h.items].sort((a, b) => a.price - b.price);
  return '<div class="hh-block"><h3>Happy hour prices</h3><ul class="items priced hh-items">' + items.map((it) =>
    `<li><span>${esc(it.name)}${typeof it.reg === 'number' ? `<small class="reg">reg <s>${hk(it.reg)}</s></small>` : ''}</span><em>${hk(it.price)}</em></li>`).join('') +
    `</ul>${h.note ? `<p class="note">${esc(h.note)}</p>` : ''}</div>`;
}
function renderPriced(key) {
  const board = (id) => PRICED.boards.find((b) => b.id === id);
  const keep = (sel) => body.querySelector(sel);
  const head = [...body.children].filter((el) => el.matches('.eyebrow, h2, .lede, .callout, .story, .langs'));
  const actions = keep('.actions');
  let html = '';
  if (key === 'menu') {
    const b = board('a-la-carte'); if (!b) return;
    const secs = b.sections.filter((s) => !/chirashi/i.test(s.name));
    const sets = secs.find((s) => /set/i.test(s.name));
    // sets + prices first, as a compact grid; the story paragraphs move below the prices (v20)
    html = (sets ? `<div class="sets-first"><h3>${esc(sets.name)}</h3><ul class="set-grid">${sets.items.map((it) => `<li><span>${esc(it.name)}</span><em>${hk(it.price)}</em></li>`).join('')}</ul></div>` : '') +
      sectionsHTML(secs.filter((s) => s !== sets)) + (b.note ? `<p class="note">${esc(b.note)}</p>` : '');
  }
  // lunch (v21): same treatment as the menu — the lunch sets + prices first as the compact grid
  // (Lunch Handroll Set 4/5 rolls + the Daily Bara Chirashi as the wide tile), the rest of the board and the story below.
  if (key === 'lunch') {
    const b = board('lunch'); if (!b) return;
    const sets = b.sections.find((s) => /set/i.test(s.name));
    const chi = b.sections.find((s) => /chirashi/i.test(s.name));
    const bowl = chi && chi.items.find((it) => !it.included && typeof it.price === 'number' && !/^add\b/i.test(it.name));
    const tiles = [...(sets ? sets.items : []), ...(bowl ? [bowl] : [])];
    const rest = b.sections.filter((s) => s !== sets).map((s) => s === chi && bowl ? { ...s, items: s.items.filter((it) => it !== bowl) } : s);
    html = (tiles.length ? `<div class="sets-first"><h3>Lunch sets</h3><ul class="set-grid">${tiles.map((it) => `<li><span>${esc(it.name)}</span><em>${hk(it.price)}</em></li>`).join('')}</ul>${sets && sets.note ? `<p class="note">${esc(sets.note)}</p>` : ''}</div>` : '') +
      sectionsHTML(rest) + (b.note ? `<p class="note">${esc(b.note)}</p>` : '');
  }
  if (key === 'drinks') {
    const b = board('drinks'); if (!b) return;
    const h = hhOK(PRICED.happy_hour) ? PRICED.happy_hour : null;
    const hhNames = h ? new Set(h.items.map((it) => it.matches).filter(Boolean)) : null;
    html = (h ? happyHTML(h) : '') + sectionsHTML(b.sections, hhNames) + (b.note ? `<p class="note">${esc(b.note)}</p>` : '');
  }
  const story = key === 'menu' || key === 'lunch' ? head.filter((el) => el.matches('.lede, .story')) : [];
  body.replaceChildren(...head.filter((el) => !story.includes(el)));
  body.insertAdjacentHTML('beforeend', html);
  story.forEach((el) => body.appendChild(el));
  if (actions) body.appendChild(actions);
}
fetch('menu.json', { cache: 'no-cache' }).then((r) => r.ok ? r.json() : null).then((m) => {
  if (m && m.show_prices === true && Array.isArray(m.boards) && allPriced(m)) {
    PRICED = m; document.documentElement.dataset.prices = 'on';
    if (current && ['menu', 'lunch', 'drinks'].includes(current)) renderPriced(current);
  }
}).catch(() => {});
