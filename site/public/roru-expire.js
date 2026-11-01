/* RORUBARU · end dates for anything on the page (classic script, no modules).
   Put data-until="YYYY-MM-DD" on any element (an event block in a <template> panel, a note, a banner line):
   once the Hong Kong date (UTC+8, no DST) is past that day, i.e. after 23:59 HK, the element is removed,
   so its zh-Hant / ja text goes with it (translations are applied in place). No end date = stays (RORU AFTER DARK).
   An events "Past" heading with no past event under it, or a story block with no event title left, is removed too.
   Upcoming event cards (events-data.js "until" / "end" / "date") and the seasonal top bar (seasonal.js "until")
   follow the same rule in their own scripts. Test any day: ?seasondate=YYYY-MM-DD (same switch as seasonal.js). */
(function () {
  'use strict';
  var w = window, d = document;
  function hkToday() { return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); }
  function today() { var m = /[?&]seasondate=(\d{4}-\d{2}-\d{2})/.exec(w.location.search); return m ? m[1] : hkToday(); }
  function expired(until, day) { return /^\d{4}-\d{2}-\d{2}$/.test(until || '') && (day || today()) > until; }
  function drop(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  function tidy(root) {
    var i, n;
    n = root.querySelectorAll('.story');
    for (i = 0; i < n.length; i++) if (!n[i].querySelector('h3')) drop(n[i]);
    n = root.querySelectorAll('.ev-past');
    for (i = 0; i < n.length; i++) if (n[i].parentNode && !n[i].parentNode.querySelector('section.ev')) drop(n[i]);
  }
  function sweep(root, day) {
    var gone = 0, i, els = root.querySelectorAll('[data-until]');
    for (i = 0; i < els.length; i++) if (expired(els[i].getAttribute('data-until'), day)) { drop(els[i]); gone++; }
    var ts = root.querySelectorAll('template');
    for (i = 0; i < ts.length; i++) if (ts[i].content) gone += sweep(ts[i].content, day);
    if (gone) tidy(root);
    return gone;
  }
  function run() { try { return sweep(d, today()); } catch (e) { return 0; } }
  w.RoruExpire = { today: today, expired: expired, run: run };
  run();
  setInterval(run, 60e3);
})();
