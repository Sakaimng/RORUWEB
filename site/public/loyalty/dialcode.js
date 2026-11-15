/* Country-code picker for the sign-up phone field (needs /loyalty/phonelib.js = libphonenumber-js "min" metadata).
   Hong Kong is the default and keeps the old behaviour: the number is sent exactly as typed (the server reads 8 bare digits as HK).
   Any other country is parsed with libphonenumber's rules for that country and sent as E.164 ("+447911123456"); a number that is not valid for that country is not sent at all.
   A number typed with its own "+" (or 00) is authoritative: it is sent as "+digits" and the picker follows it.
   "Other" needs the number typed with + and the country code. The code request, resend and verify all reuse the same string. */
(function () {
  const P = window.RoruPhone;
  const flag = (cc) => /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : "\u{1F310}";
  function init() {
    const input = document.getElementById("phone"); if (!P || !input || document.getElementById("dialSel")) return;
    let names; try { names = new Intl.DisplayNames([(document.documentElement.lang || "en")], { type: "region" }); } catch (e) { try { names = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e2) { names = { of: (c) => c }; } }
    const list = P.countries().map(([cc, d]) => [cc, d, names.of(cc) || cc]).sort((a, b) => a[2].localeCompare(b[2]));
    const hk = list.findIndex(x => x[0] === "HK"); if (hk > 0) list.unshift(list.splice(hk, 1)[0]);
    list.push(["XX", "", "Other (type + and country code)"]);
    const st = document.createElement("style");
    st.textContent = [
      ".dialbtn{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 10px;background:var(--ink);border:1px solid var(--line);border-radius:12px;padding:14px;font-size:18px;color:inherit;text-align:left;cursor:pointer}",
      ".dialbtn:focus-visible,.dialbtn:active{border-color:var(--orange);outline:none}",
      ".dialbtn .df{font-size:24px;line-height:1}.dialbtn .dn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dialbtn .dc{color:var(--muted)}.dialbtn svg{flex:none;width:16px;height:16px;opacity:.7}",
      ".dialov{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);display:none;align-items:flex-end;justify-content:center}.dialov.on{display:flex}",
      ".dialsheet{width:100%;max-width:520px;max-height:78vh;display:flex;flex-direction:column;background:var(--ink2);color:var(--cream);border:1px solid var(--line);border-radius:20px 20px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom))}",
      ".dialsheet h3{margin:2px 4px 10px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}",
      ".dialq{width:100%;background:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:16px;color:inherit;outline:none;margin-bottom:8px}.dialq:focus{border-color:var(--orange)}",
      ".diallist{overflow-y:auto;-webkit-overflow-scrolling:touch;margin:0 -4px;padding:0 4px;flex:1}",
      ".dialit{display:flex;align-items:center;gap:12px;width:100%;background:none;border:0;border-radius:10px;padding:12px 8px;font-size:17px;color:inherit;text-align:left;cursor:pointer}.dialit:active,.dialit:hover{background:var(--line)}.dialit .df{font-size:24px}.dialit .dn{flex:1;min-width:0}.dialit .dc{color:var(--muted)}.dialit.sel1 .dn{color:var(--orange);font-weight:700}"
    ].join("");
    document.head.appendChild(st);
    const sel = document.createElement("select"); sel.id = "dialSel"; sel.hidden = true; sel.setAttribute("aria-hidden", "true"); sel.tabIndex = -1; sel.style.display = "none";
    list.forEach(([cc, d, n]) => { const o = document.createElement("option"); o.value = cc; o.textContent = flag(cc) + " " + n + (d ? " +" + d : ""); o.dataset.d = d; sel.appendChild(o); });
    sel.value = "HK";
    const btn = document.createElement("button"); btn.type = "button"; btn.id = "dialBtn"; btn.className = "dialbtn"; btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-label", "Country code");
    const lab = input.closest("label"); if (lab) lab.setAttribute("for", "phone");
    input.parentNode.insertBefore(btn, input); input.parentNode.insertBefore(sel, input);
    const row = (cc, d, n) => '<span class="df">' + flag(cc) + '</span><span class="dn"></span>' + (d ? '<span class="dc">+' + d + '</span>' : '');
    const paint = () => { const o = sel.options[sel.selectedIndex], n = list.find(x => x[0] === sel.value);
      btn.innerHTML = row(n[0], n[1], n[2]) + '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg>';
      btn.querySelector(".dn").textContent = n[2]; };
    const ov = document.createElement("div"); ov.className = "dialov"; ov.innerHTML = '<div class="dialsheet" role="dialog" aria-modal="true"><h3></h3><input class="dialq" type="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Search country or code"><div class="diallist"></div></div>';
    document.body.appendChild(ov);
    const lst = ov.querySelector(".diallist"), q = ov.querySelector(".dialq"); ov.querySelector("h3").textContent = "Country code";
    const draw = (f) => { f = (f || "").toLowerCase().replace(/^\+/, ""); lst.innerHTML = "";
      list.filter(x => !f || x[2].toLowerCase().includes(f) || x[0].toLowerCase() === f || x[1].startsWith(f)).forEach(([cc, d, n]) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "dialit" + (cc === sel.value ? " sel1" : ""); b.dataset.cc = cc;
        b.innerHTML = '<span class="df">' + flag(cc) + '</span><span class="dn"></span>' + (d ? '<span class="dc">+' + d + '</span>' : ''); b.querySelector(".dn").textContent = n; lst.appendChild(b); }); };
    const open = () => { q.value = ""; draw(""); ov.classList.add("on"); const c = lst.querySelector(".sel1"); if (c) c.scrollIntoView({ block: "center" }); };
    const close = () => { ov.classList.remove("on"); };
    btn.addEventListener("click", open);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); const b = e.target.closest(".dialit"); if (b) { sel.value = b.dataset.cc; paint(); close(); input.focus(); } });
    q.addEventListener("input", () => draw(q.value));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("on")) close(); });
    paint();
    input.addEventListener("input", () => {
      const v = input.value.trim(); if (v[0] !== "+") return;
      const p = P.parse(v); if (p && p.country && sel.value !== p.country) { sel.value = p.country; paint(); }
    });
  }
  // returns the string to send, or null when the number is not valid for the chosen country (the page then shows the "enter a valid number" message and sends nothing)
  window.roruDialPhone = function (raw) {
    raw = String(raw == null ? "" : raw);
    const t = raw.trim(), sel = document.getElementById("dialSel");
    if (!sel || !P) return raw;
    if (t[0] === "+" || /^00/.test(t)) { const p = P.parse("+" + t.replace(/\D/g, "").replace(/^0+/, "")); return p && p.valid ? p.e164 : null; }
    if (sel.value === "HK") return raw;
    if (sel.value === "XX") return null;
    const p = P.parse(t, sel.value);
    return p && p.valid ? p.e164 : null;
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
