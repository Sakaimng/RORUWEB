/* owner-glass.js — f57, owner dashboard only. Classic script (no modules; iPhone WhatsApp browser).
   Builds the desktop top pill nav. Each pill only clicks the rail's own [data-go] button, so all
   navigation, data and auth stay in the existing code. Safe no-op if anything is missing. */
(function () {
  try {
    var body = document.body; if (!body || !body.classList.contains("owner-glass")) return;
    var side = document.getElementById("side"), head = document.querySelector("#app > .oh");
    if (!side || !head || head.querySelector(".gpills")) return;
    var want = ["today", "guests", "rewards", "passport", "reports"], wrap = document.createElement("div");
    wrap.className = "gpills"; wrap.setAttribute("role", "tablist"); wrap.setAttribute("aria-label", "Sections");
    want.forEach(function (v) {
      var src = side.querySelector('[data-go="' + v + '"]'); if (!src) return;
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("data-gpill", v);
      var t = ""; for (var i = 0; i < src.childNodes.length; i++) { var n = src.childNodes[i]; if (n.nodeType === 3) t += n.textContent; }
      b.textContent = t.trim() || v; b.addEventListener("click", function () { src.click(); });
      wrap.appendChild(b);
    });
    var acts = head.querySelector(".acts"); head.insertBefore(wrap, acts || null);
    var sync = function () {
      var bs = wrap.querySelectorAll("[data-gpill]");
      for (var i = 0; i < bs.length; i++) { var s = side.querySelector('[data-go="' + bs[i].getAttribute("data-gpill") + '"]'); bs[i].classList.toggle("on", !!(s && s.classList.contains("on"))); }
    };
    sync();
    if (window.MutationObserver) new MutationObserver(sync).observe(side, { subtree: true, attributes: true, attributeFilter: ["class"] });
  } catch (e) { /* visual extra only */ }
})();
