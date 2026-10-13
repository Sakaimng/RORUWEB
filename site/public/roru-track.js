/* RORUBARU · behaviour + performance tracking for GA4 (v29, Oct 2026).
   Rides the gtag already on the page (G-PV4YYPNG46); no new IDs, no cookies of its own.
   Loaded deferred at the end of the page, so it never blocks the room. Every call is
   wrapped: if gtag is missing (ad blocker, the sites.tab.bot copies) nothing happens. */
(function () {
  'use strict';
  if (window.__roruTrackOn) return; window.__roruTrackOn = true;
  var W = window, D = document, log = W.__roruTrack = [];
  var html = D.documentElement;
  var siteLang = function () { return html.dataset.lang || (html.lang || 'en').slice(0, 2); };
  function send(name, p) {
    p = p || {}; p.site_lang = p.site_lang || siteLang();
    log.push([name, p]);
    try { if (typeof W.gtag === 'function') W.gtag('event', name, p); } catch (e) {}
  }
  W.roruTrack = send;
  var coarse = W.matchMedia && W.matchMedia('(pointer:coarse)').matches;
  var shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  var device = coarse ? (shortSide < 600 ? 'phone' : 'tablet') : 'desktop';
  var panelEl = D.getElementById('panel'), panelBody = D.getElementById('panelBody');
  var is3d = !!(panelEl && D.getElementById('hotspots'));
  var curPanel = function () { return (W.RORU_UI && W.RORU_UI.current) || (panelEl && !panelEl.hidden && panelEl.dataset.key) || ''; };
  var txt = function (el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90) : ''; };

  // ---------- where a click happened ----------
  function area(el) {
    if (el.closest('.hs')) return 'pin';
    if (el.closest('.tabs')) return 'tab_bar';
    if (el.closest('.topbar')) return 'top_bar';
    if (panelEl && panelEl.contains(el)) return 'panel_' + (curPanel() || 'unknown');
    if (el.closest('footer')) return 'footer';
    if (el.closest('nav, header')) return 'nav';
    return is3d ? 'room' : 'page';
  }

  // ---------- outbound links (both the 3D home and the Next.js pages) ----------
  function linkEvent(a) {
    var href = a.getAttribute('href') || ''; var u;
    try { u = new URL(a.href, location.href); } catch (e) { return null; }
    var h = u.hostname.replace(/^www\./, ''), proto = u.protocol;
    if (proto === 'tel:') return ['phone_click', {}];
    if (proto === 'mailto:') return ['email_click', {}];
    if (/(^|\.)wa\.me$|whatsapp\.com$/.test(h)) return ['whatsapp_click', {}];
    if (/exploretock\.com$/.test(h)) return ['book_click', { platform: 'tock' }];
    if (/foodpanda\./.test(h)) return ['delivery_click', { platform: 'foodpanda' }];
    if (/keeta|mykeeta/.test(h)) return ['delivery_click', { platform: 'keeta' }];
    if (/(^|\.)instagram\.com$/.test(h)) return ['instagram_click', {}];
    if (/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(h)) return ['facebook_click', {}];
    if (/google\.[a-z.]+$/.test(h) && /\/maps/.test(u.pathname) || /maps\.app\.goo\.gl$|maps\.apple\.com$/.test(h)) return ['directions_click', {}];
    if (/^https?:$/.test(proto) && h !== location.hostname.replace(/^www\./, '') && !/rorubaru\.com$/.test(h)) return ['outbound_click', { link_domain: h }];
    return null;
  }
  D.addEventListener('click', function (e) {
    try {
      var t = e.target; if (!t || !t.closest) return;
      var a = t.closest('a[href]');
      if (a) {
        var ev = linkEvent(a);
        if (ev) { ev[1].link_url = a.href.slice(0, 200); ev[1].click_area = area(a); ev[1].link_text = txt(a).slice(0, 60); ev[1].transport_type = 'beacon'; send(ev[0], ev[1]); }
      }
      if (!is3d) return;
      var pin = t.closest('.hs');
      if (pin) send('pin_click', { pin: pin.dataset.open || (pin.classList.contains('hs-link') ? 'instagram' : txt(pin)) });
      var tab = t.closest('.tabs [data-open], .tabs a, .tabs button');
      if (tab) send('tab_click', { tab: tab.dataset.open || txt(tab) });
      var more = !pin && !tab && t.closest('#panel [data-open]');
      if (more) send('panel_link_click', { from_panel: curPanel(), target: more.dataset.open });
      var lg = t.closest('.langs [data-lang]'); if (lg) langVia = lg.closest('.top-langs') ? 'top_bar' : 'panel';
      if (t.closest('[data-music], #soundBtn')) setTimeout(function () { var m = D.getElementById('music'); send('music_toggle', { state: m && !m.paused ? 'on' : 'off', click_area: area(t) }); }, 350);
      var card = t.closest('#panel .ev-up, #panel section.ev');
      if (card && !t.closest('[data-photo], .lb')) {
        var ttl = card.querySelector('.ev-up-title, h3');
        var name = ttl ? (ttl.firstChild && ttl.firstChild.nodeType === 3 ? ttl.firstChild.textContent : txt(ttl)).trim().slice(0, 80) : '';
        send('event_card_click', { event_title: name, event_state: card.classList.contains('ev-up') ? 'upcoming' : 'past' });
      }
      if (t.closest('[data-story-play]')) storyOpen();
      if (t.closest('[data-story-stop]')) storyClose('button');
    } catch (err) {}
  }, true);

  if (!is3d) return;   // everything below is the 3D room only

  // ---------- panels = virtual pages ----------
  var TITLES = { menu: 'Menu', build: 'Build a roll', dj: 'DJ night', drinks: 'Drinks & happy hour', walkin: 'Walk-ins', visit: 'Visit', lunch: 'Lunch',
    central: 'Central', events: 'Events', delivery: 'Delivery', more: 'More', about: 'Our story', reserve: 'Book a seat', social: 'Social', inquire: 'Inquire' };
  var openKey = '', openAt = 0, depth = 0;
  W.addEventListener('roru:panel', function (e) {
    try {
      var k = e.detail && e.detail.key, from = (e.detail && e.detail.from) || 'button';
      if (openKey && openKey !== k) {
        if (story.on) storyClose('panel_closed');
        send('panel_close', { panel: openKey, seconds_open: Math.round((Date.now() - openAt) / 1000), max_scroll: depth });
      }
      if (!k) { openKey = ''; return; }
      if (k === openKey) return;
      openKey = k; openAt = Date.now(); depth = 0;
      var title = (TITLES[k] || k) + ' — RORUBARU';
      send('page_view', { page_location: location.origin + '/panel/' + k, page_path: '/#' + k, page_title: title, panel: k, open_from: from, page_referrer: location.origin + '/' });
      send('panel_open', { panel: k, open_from: from });
    } catch (err) {}
  });
  if (panelBody) panelBody.addEventListener('scroll', function () {
    if (!openKey) return;
    var max = panelBody.scrollHeight - panelBody.clientHeight; if (max < 40) return;
    var pct = Math.round(panelBody.scrollTop / max * 100);
    [25, 50, 75, 90].forEach(function (s) { if (pct >= s && depth < s) { depth = s; send('panel_scroll', { panel: openKey, percent: s }); } });
  }, { passive: true });

  // ---------- language ----------
  var langNow = siteLang(), langVia = 'swipe';
  try { new MutationObserver(function () { var l = siteLang(); if (l !== langNow) { send('language_change', { lang: l, from_lang: langNow, change_via: langVia }); langNow = l; langVia = 'swipe'; } })
    .observe(html, { attributes: true, attributeFilter: ['data-lang'] }); } catch (e) {}

  // ---------- story video ----------
  var story = { on: false, played: false, sound: false, marks: {} };
  function sv(action, extra) { var p = { action: action, video_orientation: innerWidth / innerHeight < 0.9 ? 'portrait' : 'landscape' }; for (var x in extra || {}) p[x] = extra[x]; send('story_video', p); }
  function storyOpen() { story = { on: true, played: false, sound: false, marks: {}, t0: Date.now() }; sv('open'); }
  function storyClose(how) { if (!story.on) return; var v = D.querySelector('.os-player video'); sv('close', { close_via: how, percent: v && v.duration ? Math.round(v.currentTime / v.duration * 100) : 0 }); story.on = false; }
  function isStory(t) { return t && t.tagName === 'VIDEO' && t.closest && t.closest('.os-player'); }
  D.addEventListener('play', function (e) { if (!isStory(e.target)) return; if (!story.on) storyOpen(); if (!story.played) { story.played = true; sv('play', { muted: e.target.muted ? 1 : 0 }); } }, true);
  D.addEventListener('volumechange', function (e) { var v = e.target; if (!isStory(v) || !story.on) return; if (!v.muted && !story.sound) { story.sound = true; sv('sound_on'); } }, true);
  D.addEventListener('timeupdate', function (e) { var v = e.target; if (!isStory(v) || !story.on || !v.duration) return;
    var pct = v.currentTime / v.duration * 100; [25, 50, 75].forEach(function (m) { if (pct >= m && !story.marks[m]) { story.marks[m] = 1; sv('progress', { percent: m }); } }); }, true);
  D.addEventListener('ended', function (e) { if (!isStory(e.target) || !story.on || story.marks[100]) return; story.marks[100] = 1; sv('complete', { percent: 100 }); }, true);

  // ---------- inquire form (opens the guest's mail app) ----------
  D.addEventListener('submit', function (e) {
    var f = e.target; if (!f || f.id !== 'inqForm') return;
    setTimeout(function () { var d = f.querySelector('#inqDone'), er = f.querySelector('#inqErr');
      if (d && !d.hidden) send('inquire_submit', { method: 'mailto' }); else if (er && !er.hidden) send('inquire_error', { field_error: txt(er).slice(0, 60) }); }, 60);
  });

  // ---------- performance: 3D room ready + web vitals ----------
  var sentPerf = {};
  function perf(name, val, unit, extra) {
    if (sentPerf[name]) return; sentPerf[name] = 1;
    var p = { value: Math.round(unit === 'score' ? val * 1000 : val), metric_value: unit === 'score' ? Math.round(val * 1000) / 1000 : Math.round(val), device_class: device, non_interaction: true };
    for (var x in extra || {}) p[x] = extra[x];
    send(name, p);
  }
  var t0 = 0;
  (function waitRoom() {
    var tries = 0;
    (function tick() {
      if (W.__roru && W.__roru.ready) {
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          var ms = performance.now();
          perf('scene_ready', ms, 'ms', { load_ms: Math.round(ms), scene: '3d_room', connection: (navigator.connection && navigator.connection.effectiveType) || 'unknown', metric_rating: ms < 4000 ? 'good' : ms < 8000 ? 'needs-improvement' : 'poor' });
        }); });
        return;
      }
      if (++tries > 600) { send('scene_timeout', { device_class: device, waited_ms: Math.round(performance.now()), non_interaction: true }); return; }
      setTimeout(tick, 100);
    })();
  })();

  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
  var act = (nav && nav.activationStart) || 0;
  function rate(n, v) { var T = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], TTFB: [800, 1800], FCP: [1800, 3000] }[n]; return v <= T[0] ? 'good' : v <= T[1] ? 'needs-improvement' : 'poor'; }
  var vid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function vital(n, v) { perf(n, v, n === 'CLS' ? 'score' : 'ms', { metric_id: vid + '-' + n, metric_rating: rate(n, v), metric_name: n }); }
  function obs(type, cb, o) { try { var p = new PerformanceObserver(function (l) { cb(l.getEntries()); }); var opt = { type: type, buffered: true }; for (var x in o || {}) opt[x] = o[x]; p.observe(opt); return p; } catch (e) { return null; } }

  function ttfb() { if (nav) vital('TTFB', Math.max(nav.responseStart - act, 0)); }
  if (D.readyState === 'complete') setTimeout(ttfb, 0); else W.addEventListener('load', function () { setTimeout(ttfb, 0); });
  obs('paint', function (es) { es.forEach(function (e) { if (e.name === 'first-contentful-paint') vital('FCP', Math.max(e.startTime - act, 0)); }); });

  var lcp = -1, lcpObs = obs('largest-contentful-paint', function (es) { var e = es[es.length - 1]; if (e) lcp = Math.max(e.startTime - act, 0); });
  function lcpDone() { if (lcpObs) { try { lcpObs.takeRecords().forEach(function (e) { lcp = Math.max(e.startTime - act, 0); }); lcpObs.disconnect(); } catch (e) {} } if (lcp >= 0) vital('LCP', lcp); }
  ['keydown', 'pointerdown'].forEach(function (t) { addEventListener(t, function () { setTimeout(lcpDone, 0); }, { once: true, capture: true }); });

  var cls = 0, sess = 0, sFirst = 0, sLast = 0, clsSeen = false, clsObs = obs('layout-shift', function (es) {
    es.forEach(function (e) { clsSeen = true; if (e.hadRecentInput) return;
      if (sess && e.startTime - sLast < 1000 && e.startTime - sFirst < 5000) { sess += e.value; sLast = e.startTime; } else { sess = e.value; sFirst = sLast = e.startTime; }
      if (sess > cls) cls = sess; }); });

  var inter = {}, nInter = 0, inpObs = obs('event', function (es) {
    es.forEach(function (e) { if (!e.interactionId) return; if (!(e.interactionId in inter)) nInter++; inter[e.interactionId] = Math.max(inter[e.interactionId] || 0, e.duration); }); }, { durationThreshold: 16 });
  obs('first-input', function (es) { es.forEach(function (e) { if (e.interactionId) { if (!(e.interactionId in inter)) nInter++; inter[e.interactionId] = Math.max(inter[e.interactionId] || 0, e.duration); } }); });

  function finalVitals() {
    try {
      lcpDone();
      if (clsObs) { try { clsObs.takeRecords(); } catch (e) {} }
      if (clsObs) vital('CLS', cls);
      if (inpObs) { try { inpObs.takeRecords().forEach(function (e) { if (e.interactionId) { if (!(e.interactionId in inter)) nInter++; inter[e.interactionId] = Math.max(inter[e.interactionId] || 0, e.duration); } }); } catch (e) {} }
      var ds = Object.keys(inter).map(function (k) { return inter[k]; }).sort(function (a, b) { return b - a; });
      if (ds.length) vital('INP', ds[Math.min(ds.length - 1, Math.floor(nInter / 50))]);
      if (!sentPerf.scene_ready) send('scene_abandon', { waited_ms: Math.round(performance.now()), device_class: device, non_interaction: true, transport_type: 'beacon' });
      sentPerf.scene_ready = 1;
    } catch (e) {}
  }
  D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'hidden') finalVitals(); }, true);
  W.addEventListener('pagehide', finalVitals, true);
})();
