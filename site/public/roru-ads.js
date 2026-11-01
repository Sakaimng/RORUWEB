/* RORUBARU · Google Ads booking conversion (a1, Nov 2026).
   Every click on a Tock booking link (all EN/ZH/JA panels, the 3D room's "Book a seat" buttons, the
   DJ-week card, the noscript fallback) sends one Google Ads conversion straight from our own page,
   before the visitor reaches Tock. Classic script, loaded deferred; never blocks or delays the click:
   the hit leaves as a beacon and the link is never held back (no preventDefault anywhere here).
   Account 132-843-6303, tag AW-18500925224. Label = the account's existing website action
   "RORUBARU Tock booking page (Google tag)" (its only website label, read from the account's tag).
   Only fires on rorubaru.com; anywhere else (previews, sites.tab.bot copies) it logs, sends nothing. */
(function () {
  'use strict';
  var W = window, D = document;
  if (W.__roruAdsOn) return; W.__roruAdsOn = true;
  var AW = 'AW-18500925224';
  var SEND_TO = AW + '/mzq3CI2-4K0dEKju9vVE';
  var LIVE = /(^|\.)rorubaru\.com$/.test(location.hostname);
  var log = W.__roruAds = [];
  W.dataLayer = W.dataLayer || [];
  W.gtag = W.gtag || function () { W.dataLayer.push(arguments); };
  function g() { try { if (LIVE) W.gtag.apply(W, arguments); } catch (e) {} }

  // Make sure the Ads tag itself is on the page (stores the ad click id for the conversion).
  log.push(['config', AW, LIVE ? 'sent' : 'preview-only']);
  g('config', AW);

  var last = 0;
  function isBooking(a) {
    var u; try { u = new URL(a.href, location.href); } catch (e) { return false; }
    return /(^|\.)exploretock\.com$/.test(u.hostname);
  }
  function convert(a, how) {
    var now = Date.now();
    if (now - last < 3000) return;            // one hit per click, even if both handlers see it
    last = now;
    var p = { send_to: SEND_TO, transport_type: 'beacon', event_timeout: 800,
              link_url: (a.href || '').slice(0, 200), site_lang: (D.documentElement.dataset.lang || D.documentElement.lang || 'en').slice(0, 2) };
    log.push(['conversion', SEND_TO, how, p.link_url, LIVE ? 'sent' : 'preview-only']);
    g('event', 'conversion', p);
  }
  function onPick(e, how) {
    try {
      var t = e.target; if (!t || !t.closest) return;
      var a = t.closest('a[href]');
      if (a && isBooking(a)) convert(a, how);
    } catch (err) {}
  }
  // capture phase, so nothing on the page can swallow it; middle-click / new-tab clicks too
  D.addEventListener('click', function (e) { onPick(e, 'click'); }, true);
  D.addEventListener('auxclick', function (e) { if (e.button === 1) onPick(e, 'middle'); }, true);
})();
