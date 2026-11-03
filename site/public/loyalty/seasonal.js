/* RORUBARU seasonal themes v1 (classic script, no modules).
   Picks a theme by Hong Kong date, adds body.season-<key>, themes buttons, adds a small
   hanging decoration, an optional light particle layer and a favicon swap.
   Preview any theme: ?season=halloween|christmas|cny|easter|diwali|thanksgiving|newyear|setsubun|
   valentines|whiteday|sakura|sevens|kodomo|tuenng|tanabata|natsu|midautumn  ·  ?season=none = normal look
   Simulate a date: ?seasondate=2027-02-06   ·   effects off: ?seasonfx=0 (or tap the round season button)
   Buttons themed: data-season-buttons="css selector" on this script tag (default below). */
(function () {
  'use strict';
  var d = document, w = window;
  var me = d.currentScript || (function () { var s = d.getElementsByTagName('script'); for (var i = s.length - 1; i >= 0; i--) { if ((s[i].src || '').indexOf('seasonal.js') > -1) return s[i]; } return null; })();
  var BTN_SEL = (me && me.getAttribute('data-season-buttons')) || '.book, .btn:not(.ghost):not(.music), .dock .walk-btn, .ssn-btn';
  var FULL_SEL = (me && me.getAttribute('data-season-full')) || '.book, .dock .walk-btn, .ssn-btn';

  /* ---------- config: date windows (Hong Kong dates, inclusive) ----------
     md = every year (MM-DD .. MM-DD, may wrap the new year); d = exact dates (lunar / moving).
     p = priority when windows overlap (higher wins). */
  var WINDOWS = [
    { t: 'halloween',    md: ['10-24', '11-01'], p: 50 },
    { t: 'diwali',       d: ['2026-11-06', '2026-11-10'], p: 40 },
    { t: 'diwali',       d: ['2027-10-26', '2027-10-30'], p: 40 },      /* inside Halloween 2027: Halloween wins */
    { t: 'thanksgiving', d: ['2026-11-24', '2026-11-29'], p: 30 },
    { t: 'thanksgiving', d: ['2027-11-23', '2027-11-28'], p: 30 },
    { t: 'christmas',    md: ['12-01', '12-26'], p: 50 },
    { t: 'newyear',      md: ['12-27', '01-07'], p: 45 },
    { t: 'setsubun',     md: ['01-30', '02-03'], p: 42 },
    { t: 'cny',          d: ['2027-02-04', '2027-02-20'], p: 48 },      /* CNY Sat 6 Feb 2027 · Lantern 20 Feb */
    { t: 'cny',          d: ['2028-01-20', '2028-02-09'], p: 48 },      /* CNY Wed 26 Jan 2028 · Lantern 9 Feb */
    { t: 'valentines',   md: ['02-13', '02-14'], p: 60 },
    { t: 'whiteday',     md: ['03-12', '03-14'], p: 35 },
    { t: 'sakura',       md: ['03-15', '04-10'], p: 20 },
    { t: 'easter',       d: ['2027-03-22', '2027-03-29'], p: 55 },      /* Good Fri 26 · Easter Sun 28 · Mon 29 Mar */
    { t: 'easter',       d: ['2028-04-10', '2028-04-17'], p: 55 },      /* Easter Sun 16 Apr 2028 */
    { t: 'sevens',       d: ['2027-04-08', '2027-04-11'], p: 25, optional: true },
    { t: 'kodomo',       md: ['05-01', '05-05'], p: 30 },
    { t: 'tuenng',       d: ['2027-06-03', '2027-06-09'], p: 40 },      /* Tuen Ng Wed 9 Jun 2027 */
    { t: 'tanabata',     md: ['07-01', '07-07'], p: 30 },
    { t: 'natsu',        md: ['08-08', '08-16'], p: 25 },
    { t: 'midautumn',    d: ['2027-09-08', '2027-09-16'], p: 40 }       /* Mid-Autumn Wed 15 Sep 2027 */
  ];
  var OPTIONAL_ON = false; /* set true to run optional themes (HK Sevens) */

  /* tier: full = custom button art + decor + particles; light = palette + icon + simple effect */
  var THEMES = {
    halloween:    { full: 1, fx: 'bats',   icon: 'pumpkin', label: 'Halloween · Trick or Temaki, Sat 31 Oct', fav: '#F54500', banner: 'Trick or Temaki \u00b7 Sat 31 Oct', hat: 'witch', corner: 'web', hangs: ['spider'], burst: ['#F54500', '#1b1310', '#8e44ad', '#ffb347'] },
    christmas:    { full: 1, fx: 'snow',   icon: 'bauble',  label: 'Merry Christmas', fav: '#C8102E', banner: 'Merry Christmas from the counter', hat: 'santa', corner: 'lights', hangs: ['bauble', 'bauble2'], burst: ['#C8102E', '#ffffff', '#1f6b45', '#d4af37'] },
    cny:          { full: 1, fx: 'gold',   icon: 'lantern', label: 'Happy Lunar New Year', fav: '#D7141A', banner: '\u65B0\u5E74\u5FEB\u6A02 \u00b7 Happy Lunar New Year', hat: 'seal', corner: 'lanterns', hangs: ['lantern', 'lantern'], burst: ['#D7141A', '#f5c542', '#ffe08a', '#a50e12'] },
    easter:       { full: 1, fx: 'eggs',   icon: 'egg',     label: 'Happy Easter', fav: '#9AD9C0', banner: 'Hoppy Easter', hat: 'ears', corner: 'eggs', hangs: ['egg'], burst: ['#9fdcc4', '#c7a6f2', '#ffd98a', '#f7b6c8'] },
    diwali:       { fx: 'sparks', emoji: '\uD83E\uDE94', label: 'Happy Diwali' },
    thanksgiving: { fx: 'leaves', emoji: '\uD83C\uDF41', label: 'Happy Thanksgiving' },
    newyear:      { fx: 'sparks', emoji: '\uD83C\uDF8D', label: 'Happy New Year \u00b7 \u3042\u3051\u304A\u3081' },
    setsubun:     { fx: '',       emoji: '\uD83D\uDC79', label: 'Setsubun \u00b7 eat your ehomaki facing the lucky way' },
    valentines:   { fx: 'hearts', emoji: '\u2764\uFE0F', label: "Happy Valentine's" },
    whiteday:     { fx: 'snow',   emoji: '\uD83E\uDD0D', label: 'White Day' },
    sakura:       { fx: 'petals', emoji: '\uD83C\uDF38', label: 'Sakura season' },
    sevens:       { fx: '',       emoji: '\uD83C\uDFC9', label: 'Sevens weekend' },
    kodomo:       { fx: '',       emoji: '\uD83C\uDF8F', label: "Children's Day" },
    tuenng:       { fx: '',       emoji: '\uD83D\uDEF6', label: 'Dragon Boat Festival' },
    tanabata:     { fx: 'stars',  emoji: '\uD83C\uDF8B', label: 'Tanabata \u00b7 make a wish' },
    natsu:        { fx: 'sparks', emoji: '\uD83C\uDFEE', label: 'Natsu matsuri' },
    midautumn:    { fx: 'stars',  emoji: '\uD83E\uDD6E', label: 'Happy Mid-Autumn' }
  };

  /* ---------- small helpers ---------- */
  function qp(name) { var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(w.location.search); return m ? decodeURIComponent(m[1]).toLowerCase() : null; }
  function store(k, v) { try { if (v === undefined) return w.sessionStorage.getItem(k); if (v === null) w.sessionStorage.removeItem(k); else w.sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function lstore(k, v) { try { if (v === undefined) return w.localStorage.getItem(k); w.localStorage.setItem(k, v); } catch (e) { return null; } }
  function hkToday() { return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); } /* HK = UTC+8, no DST */
  function inWin(win, day) {
    if (win.d) return day >= win.d[0] && day <= win.d[1];
    var md = day.slice(5), a = win.md[0], b = win.md[1];
    return a <= b ? (md >= a && md <= b) : (md >= a || md <= b);
  }
  function pick(day) {
    var best = null;
    for (var i = 0; i < WINDOWS.length; i++) {
      var x = WINDOWS[i];
      if (x.optional && !OPTIONAL_ON) continue;
      if (inWin(x, day) && (!best || x.p > best.p)) best = x;
    }
    return best ? best.t : null;
  }
  function reduced() { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  /* ---------- choose ---------- */
  var q = qp('season');
  if (q) store('roruSeason', q);           /* keep a preview choice while browsing the site */
  var forced = q || store('roruSeason');
  var day = (qp('seasondate') || '').match(/^\d{4}-\d{2}-\d{2}$/) ? qp('seasondate') : hkToday();
  var key = forced ? (THEMES[forced] ? forced : null) : pick(day);  /* none/off/default/unknown = normal look */
  var api = { theme: key, today: day, windows: WINDOWS, themes: THEMES, pick: pick };
  w.RoruSeason = api;
  if (!key) return;                        /* default: nothing touched at all */
  var T = THEMES[key];

  var fxQ = qp('seasonfx');
  if (fxQ === '0' || fxQ === 'off') lstore('roruSeasonFx', '0');
  if (fxQ === '1' || fxQ === 'on') lstore('roruSeasonFx', '1');
  var fxOn = lstore('roruSeasonFx') !== '0';

  /* ---------- art (inline SVG, no network) ---------- */
  var SVG = {
    pumpkin: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 12c-1-4 1-7 4-8" stroke="#3b5a1e" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="15" cy="28" rx="10" ry="13" fill="#e8590c"/><ellipse cx="33" cy="28" rx="10" ry="13" fill="#e8590c"/><ellipse cx="24" cy="28" rx="10" ry="14" fill="#F54500"/><path d="M15 25l4-4 4 4zM25 25l4-4 4 4z" fill="#1b1310"/><path d="M14 31q10 9 20 0l-3 1-2 2-2-2-2 3-2-3-2 2-2-2z" fill="#1b1310"/></svg>',
    bat: '<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M32 10c2-3 3-4 3-7 1 2 1 4 2 5 6-5 15-6 27-1-6 2-9 6-10 11-3-3-7-3-9 0-2-2-5-2-7 1-1-2-3-4-6-4s-5 2-6 4c-2-3-5-3-7-1-2-3-6-3-9 0C9 13 6 9 0 7c12-5 21-4 27 1 1-1 1-3 2-5 0 3 1 4 3 7z" fill="#15100f"/></svg>',
    bauble: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="20" y="4" width="8" height="6" rx="1.5" fill="#d4af37"/><circle cx="24" cy="28" r="17" fill="#C8102E"/><path d="M9 25q15 7 30 0" stroke="#d4af37" stroke-width="3" fill="none"/><path d="M8 31q16 6 32 0" stroke="#fff" stroke-width="2" fill="none" opacity=".75"/><circle cx="17" cy="20" r="4" fill="#fff" opacity=".45"/></svg>',
    lantern: '<svg viewBox="0 0 48 56" aria-hidden="true"><rect x="18" y="2" width="12" height="5" rx="1" fill="#d4af37"/><ellipse cx="24" cy="26" rx="19" ry="17" fill="#D7141A"/><path d="M24 9v34M14 12q-6 14 0 28M34 12q6 14 0 28" stroke="#a50e12" stroke-width="2" fill="none"/><rect x="17" y="41" width="14" height="5" rx="1" fill="#d4af37"/><path d="M21 46v8M24 46v9M27 46v8" stroke="#d4af37" stroke-width="2"/><text x="24" y="31" font-size="13" text-anchor="middle" fill="#ffd76a" font-weight="900">\u798F</text></svg>',
    egg: '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M24 3C13 3 5 22 5 34c0 11 8 19 19 19s19-8 19-19C43 22 35 3 24 3z" fill="#bfe8d6"/><path d="M6 30l6-5 6 5 6-5 6 5 6-5 6 5" stroke="#c7a6f2" stroke-width="4" fill="none" stroke-linejoin="round"/><path d="M7 40l6-4 6 4 5-4 5 4 6-4 6 4" stroke="#ffd98a" stroke-width="4" fill="none" stroke-linejoin="round"/><circle cx="16" cy="18" r="3" fill="#fff" opacity=".6"/></svg>',
    witch: '<svg viewBox="0 0 48 40" aria-hidden="true"><path d="M22 2c6 6 10 16 13 28H11C15 18 16 8 22 2z" fill="#1b1310"/><path d="M14 2c6-1 9 1 8 1" stroke="#1b1310" stroke-width="3" fill="none"/><ellipse cx="24" cy="31" rx="23" ry="6" fill="#1b1310"/><path d="M12.5 26h22l-.6 4h-21z" fill="#8e44ad"/><rect x="20.5" y="25.2" width="6" height="5.6" rx="1" fill="none" stroke="#F5A623" stroke-width="1.6"/></svg>',
    santa: '<svg viewBox="0 0 48 40" aria-hidden="true"><path d="M8 30C10 14 20 4 34 6c6 1 9 6 10 13-4-4-8-5-12-4 2 5 2 10 1 15z" fill="#C8102E"/><rect x="4" y="27" width="34" height="9" rx="4.5" fill="#fff"/><circle cx="43" cy="21" r="5" fill="#fff"/></svg>',
    seal: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="3" width="34" height="34" rx="5" transform="rotate(8 20 20)" fill="#D7141A" stroke="#f5c542" stroke-width="2.5"/><text x="20" y="27" font-size="20" font-weight="900" text-anchor="middle" fill="#ffe08a" transform="rotate(8 20 20)">\u798F</text></svg>',
    ears: '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="13" cy="18" rx="6" ry="16" transform="rotate(-14 13 18)" fill="#fff"/><ellipse cx="13" cy="19" rx="3" ry="11" transform="rotate(-14 13 19)" fill="#f7b6c8"/><ellipse cx="28" cy="18" rx="6" ry="16" transform="rotate(12 28 18)" fill="#fff"/><ellipse cx="28" cy="19" rx="3" ry="11" transform="rotate(12 28 19)" fill="#f7b6c8"/></svg>',
    web: '<svg viewBox="0 0 120 120" aria-hidden="true" fill="none" stroke="rgba(246,243,231,.55)" stroke-width="1.2"><path d="M0 0L120 18M0 0L104 64M0 0L64 104M0 0L18 120"/><path d="M28 4Q24 14 26 22Q16 22 10 26Q8 16 4 28"/><path d="M58 9Q48 30 50 44Q34 46 24 50Q22 34 9 58"/><path d="M88 13Q74 42 76 64Q52 68 40 76Q36 52 13 88"/><path d="M116 17Q100 54 102 86Q70 90 56 102Q50 70 17 116"/></svg>',
    spider: '<svg viewBox="0 0 40 36" aria-hidden="true"><g stroke="#15100f" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M14 16L4 8M14 19L2 18M15 22L5 30M17 24L11 34M26 16L36 8M26 19L38 18M25 22L35 30M23 24L29 34"/></g><ellipse cx="20" cy="20" rx="7" ry="8" fill="#15100f"/><circle cx="20" cy="10" r="5" fill="#15100f"/><circle cx="18" cy="9.5" r="1.2" fill="#F54500"/><circle cx="22" cy="9.5" r="1.2" fill="#F54500"/></svg>',
    flake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1v22M2.5 6.5l19 11M21.5 6.5l-19 11" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>'
  };
  SVG.bauble2 = SVG.bauble.replace(/#C8102E/g, '#1f6b45');
  function iconHTML() { return T.icon ? SVG[T.icon] : '<span class="ssn-emo">' + T.emoji + '</span>'; }

  /* ---------- apply ---------- */
  var root = d.documentElement, body = d.body;
  root.classList.add('season-on');
  body.classList.add('season-' + key, T.full ? 'season-full' : 'season-light');
  if (!fxOn) body.classList.add('season-fx-off');

  /* buttons */
  function decorate(el, full) {
    /* idempotent: translation scripts may replace a button's text (and our spans) at any time */
    el.classList.add('ssn-b');
    if (!full) return;
    if (el.querySelector('.ssn-drips, .ssn-art')) return;
    el.classList.add('ssn-full');
    if (key === 'halloween') {
      var g = d.createElement('span'); g.className = 'ssn-drips'; g.setAttribute('aria-hidden', 'true');
      var spots = [12, 23, 31, 44, 52, 63, 71, 84, 90];
      for (var i = 0; i < spots.length; i++) {
        var dr = d.createElement('i');
        dr.style.left = spots[i] + '%';
        dr.style.setProperty('--h', (12 + ((i * 37) % 24)) + 'px');
        dr.style.setProperty('--dl', ((i * 53) % 260) + 'ms');
        dr.style.setProperty('--wd', (5 + (i % 3) * 2) + 'px');
        g.appendChild(dr);
      }
      el.appendChild(g);
    } else {
      var a = d.createElement('span'); a.className = 'ssn-art'; a.setAttribute('aria-hidden', 'true'); el.appendChild(a);
      var c = d.createElement('span'); c.className = 'ssn-cap'; c.setAttribute('aria-hidden', 'true'); el.appendChild(c);
    }
    if (el._sxPulse) return;
    var pulse = function () { el.classList.add('ssn-on'); clearTimeout(el._sxT); el._sxT = setTimeout(function () { el.classList.remove('ssn-on'); }, 1700); };
    el.addEventListener('touchstart', pulse, { passive: true });
    el.addEventListener('focus', pulse);
    el._sxPulse = pulse;
  }
  function scan() {
    var full = T.full ? d.querySelectorAll(FULL_SEL) : [];
    var all = d.querySelectorAll(BTN_SEL), i;
    if (obs) obs.disconnect();
    for (i = 0; i < full.length; i++) decorate(full[i], true);
    for (i = 0; i < all.length; i++) decorate(all[i], false);
    if (obs) obs.observe(body, { childList: true, subtree: true });
  }
  var obs = null;
  if (w.MutationObserver) {
    var pend = 0;
    obs = new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; scan(); }, 200); });
  }
  scan();

  /* idle drip so phones (no hover) see it: first button only, every ~9 s, not with reduced motion */
  if (T.full && !reduced()) {
    var tick = function () {
      if (!fxOn || d.hidden) return;
      var b = d.querySelector('.ssn-full'); if (b && b._sxPulse) b._sxPulse();
    };
    setTimeout(tick, 2200); setInterval(tick, 9000);
  }

  /* ---------- v2: make it obvious at first glance ---------- */
  var opt = function (n, dflt) { var v = me && me.getAttribute('data-season-' + n); return v == null ? dflt : v !== 'off'; };
  /* page wash (tint + glow over the room, under the controls) */
  if (!opt('wash', true)) body.classList.add('season-under');
  if (opt('wash', true)) { var wash = d.createElement('div'); wash.className = 'ssn-wash'; wash.setAttribute('aria-hidden', 'true'); body.appendChild(wash); }
  /* announcement banner under the top bar */
  var bannerText = T.banner || T.label;
  if (opt('banner', true) && bannerText) {
    var ban = d.createElement('div'); ban.className = 'ssn-banner'; ban.setAttribute('role', 'note');
    var ico = T.icon ? SVG[T.icon] : '<span class="ssn-emo">' + T.emoji + '</span>';
    ban.innerHTML = '<span class="ssn-bi">' + ico + '</span><span class="ssn-bt">' + bannerText + '</span><span class="ssn-bi">' + ico + '</span>';
    body.appendChild(ban); body.classList.add('season-banner');
    if (opt('pad', false)) { try { body.style.paddingTop = ((parseFloat(w.getComputedStyle(body).paddingTop) || 0) + 30) + 'px'; } catch (e) {} }
  }
  /* logo decoration (hat / seal / ears) */
  var brand = T.hat && d.querySelector(me && me.getAttribute('data-season-logo') || '.topbar .brand');
  if (brand && !brand.querySelector('.ssn-hat')) {
    var hat = d.createElement('span'); hat.className = 'ssn-hat ssn-hat-' + T.hat; hat.setAttribute('aria-hidden', 'true'); hat.innerHTML = SVG[T.hat];
    brand.classList.add('ssn-brand'); brand.appendChild(hat);
  }
  /* corner decor */
  if (T.corner) {
    var cor = d.createElement('div'); cor.className = 'ssn-corner ssn-corner-' + T.corner; cor.setAttribute('aria-hidden', 'true');
    if (T.corner === 'web') cor.innerHTML = SVG.web;
    if (T.corner === 'lights') { var s = ''; for (var li = 0; li < 18; li++) s += '<i></i>'; cor.innerHTML = s; }
    body.appendChild(cor);
  }
  /* hanging decorations under the top bar */
  var hangs = T.hangs || [T.icon ? T.icon : null];
  for (var hi = 0; hi < hangs.length; hi++) {
    var hang = d.createElement('div'); hang.className = 'ssn-hang ssn-hang-' + hi + (hangs[hi] === 'spider' ? ' ssn-spider' : ''); hang.setAttribute('aria-hidden', 'true');
    hang.innerHTML = '<span class="ssn-thread"></span><span class="ssn-ico">' + (hangs[hi] ? SVG[hangs[hi]] : iconHTML()) + '</span>';
    body.appendChild(hang);
  }
  /* first visit this session: a 1.5 s greeting + burst (not with reduced motion) */
  if (opt('splash', true) && !reduced() && fxOn && store('roruSeasonSplash') !== key) {
    store('roruSeasonSplash', key);
    var sp = d.createElement('div'); sp.className = 'ssn-splash'; sp.setAttribute('aria-hidden', 'true');
    var bits = '', cols = T.burst || ['#F54500', '#F6F3E8', '#ffd76a'];
    for (var bi = 0; bi < 28; bi++) {
      var ang = (bi / 28) * Math.PI * 2, dist = 110 + ((bi * 37) % 90);
      bits += '<i style="background:' + cols[bi % cols.length] + ';--dx:' + Math.round(Math.cos(ang) * dist) + 'px;--dy:' + Math.round(Math.sin(ang) * dist) + 'px;--r:' + ((bi * 47) % 360) + 'deg"></i>';
    }
    sp.innerHTML = '<div class="ssn-sp-in"><span class="ssn-sp-ico">' + (T.icon ? SVG[T.icon] : '<span class="ssn-emo">' + T.emoji + '</span>') + '</span><span class="ssn-sp-t">' + bannerText + '</span>' + bits + '</div>';
    body.appendChild(sp);
    setTimeout(function () { sp.classList.add('ssn-sp-out'); }, 1500);
    setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 2200);
  }

  var chip = d.createElement('button');
  chip.type = 'button'; chip.className = 'ssn-chip';
  chip.setAttribute('aria-pressed', fxOn ? 'true' : 'false');
  chip.setAttribute('aria-label', T.label + ' \u2014 effects ' + (fxOn ? 'on' : 'off') + ', tap to switch');
  chip.title = T.label;
  chip.innerHTML = iconHTML() + '<span class="ssn-tip">' + T.label + '</span>';
  var mapctl = d.querySelector('.mapctl');
  if (mapctl) mapctl.appendChild(chip); else { chip.classList.add('ssn-chip-float'); body.appendChild(chip); }
  chip.addEventListener('click', function () {
    fxOn = !fxOn; lstore('roruSeasonFx', fxOn ? '1' : '0');
    body.classList.toggle('season-fx-off', !fxOn);
    chip.setAttribute('aria-pressed', fxOn ? 'true' : 'false');
    chip.setAttribute('aria-label', T.label + ' \u2014 effects ' + (fxOn ? 'on' : 'off') + ', tap to switch');
    if (fxOn) startFx(); else stopFx();
  });

  /* particles: a few DOM sprites with CSS transforms; off with reduced motion or the toggle */
  var layer = null;
  function startFx() {
    if (!T.fx || reduced() || layer) return;
    layer = d.createElement('div'); layer.className = 'ssn-fx ssn-fx-' + T.fx; layer.setAttribute('aria-hidden', 'true');
    var n = T.fx === 'bats' ? 9 : (w.innerWidth < 600 ? 24 : 36);
    for (var i = 0; i < n; i++) {
      var p = d.createElement('i');
      var r1 = ((i * 7919) % 100) / 100, r2 = ((i * 104729) % 97) / 97;
      p.style.left = (r1 * 100).toFixed(1) + '%';
      p.style.animationDelay = (-r2 * 14).toFixed(2) + 's';
      p.style.animationDuration = (T.fx === 'bats' ? 11 + r2 * 7 : 9 + r1 * 9).toFixed(2) + 's';
      p.style.setProperty('--s', (0.8 + r2 * 1.0).toFixed(2));
      p.style.setProperty('--x', ((r1 - 0.5) * 120).toFixed(0) + 'px');
      if (T.fx === 'bats') { p.innerHTML = SVG.bat; p.style.top = (14 + ((i * 23) % 58)) + '%'; p.style.animationDelay = (-i * 1.9).toFixed(1) + 's'; p.style.animationDuration = (14 + (i % 4) * 2.5) + 's'; }
      if (T.fx === 'snow' && i % 3 === 0) p.innerHTML = SVG.flake;
      layer.appendChild(p);
    }
    body.appendChild(layer);
  }
  function stopFx() { if (layer) { layer.parentNode.removeChild(layer); layer = null; } }
  if (fxOn) startFx();
  if (w.matchMedia) { var mq = w.matchMedia('(prefers-reduced-motion: reduce)'); if (mq.addEventListener) mq.addEventListener('change', function () { if (reduced()) stopFx(); else if (fxOn) startFx(); }); }

  /* favicon swap (desktop tabs; iOS mostly ignores favicons) */
  try {
    var favSvg = T.icon ? SVG[T.icon] : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><text x="24" y="38" font-size="36" text-anchor="middle">' + T.emoji + '</text></svg>';
    if (favSvg.indexOf('xmlns') < 0) favSvg = favSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    var links = d.querySelectorAll('link[rel~="icon"]');
    var href = 'data:image/svg+xml,' + encodeURIComponent(favSvg);
    if (!links.length) { var l = d.createElement('link'); l.rel = 'icon'; d.head.appendChild(l); links = [l]; }
    for (var k = 0; k < links.length; k++) { links[k].setAttribute('data-ssn-old', links[k].getAttribute('href') || ''); links[k].type = 'image/svg+xml'; links[k].href = href; }
  } catch (e) {}
})();
