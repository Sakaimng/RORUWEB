/* Country-code picker for the sign-up phone field (needs /loyalty/phonelib.js = libphonenumber-js "min" metadata).
   Hong Kong is the default and keeps the old behaviour: the number is sent exactly as typed (the server reads 8 bare digits as HK).
   Any other country is parsed with libphonenumber's rules for that country and sent as E.164 ("+447911123456").
   A number typed with its own "+" (or 00) is authoritative: it is sent as "+digits" and the picker follows it.
   "Other" sends whatever was typed. The code request, resend and verify all reuse the same string. */
(function () {
  const P = window.RoruPhone;
  function init() {
    const input = document.getElementById("phone"); if (!P || !input || document.getElementById("dialSel")) return;
    let names; try { names = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) { names = { of: (c) => c }; }
    const list = P.countries().map(([cc, d]) => [cc, d, names.of(cc) || cc]).sort((a, b) => a[2].localeCompare(b[2]));
    const hk = list.findIndex(x => x[0] === "HK"); if (hk > 0) list.unshift(list.splice(hk, 1)[0]);
    const st = document.createElement("style");
    st.textContent = ".dialrow{display:flex;gap:8px;align-items:stretch}.dialrow input{flex:1 1 auto;min-width:0}.dialsel{flex:0 0 auto;width:42%;max-width:170px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-weight:600;background:var(--ink);color:inherit;border:1px solid var(--line);border-radius:12px;padding:0 8px;font-size:16px;outline:none;text-overflow:ellipsis}.dialsel:focus{border-color:var(--orange)}body.lt .dialsel{background:#fff;color:#16181F;border-color:rgba(22,24,31,.18)}";
    document.head.appendChild(st);
    const sel = document.createElement("select"); sel.id = "dialSel"; sel.className = "dialsel"; sel.setAttribute("aria-label", "Country code");
    list.forEach(([cc, d, n]) => { const o = document.createElement("option"); o.value = cc; o.textContent = cc + " +" + d + " · " + n; o.dataset.d = d; sel.appendChild(o); });
    const oo = document.createElement("option"); oo.value = "XX"; oo.textContent = "Other (type + and code)"; sel.appendChild(oo);
    sel.value = "HK";
    const row = document.createElement("div"); row.className = "dialrow";
    input.parentNode.insertBefore(row, input); row.appendChild(sel); row.appendChild(input);
    input.addEventListener("input", () => {
      const v = input.value.trim(); if (v[0] !== "+") return;
      const p = P.parse(v); if (p && p.country && sel.value !== p.country) sel.value = p.country;
    });
    sel.addEventListener("change", () => input.focus());
  }
  window.roruDialPhone = function (raw) {
    raw = String(raw == null ? "" : raw);
    const t = raw.trim(); if (t[0] === "+" || /^00/.test(t)) return "+" + t.replace(/\D/g, "").replace(/^0+/, "");
    const sel = document.getElementById("dialSel"); if (!sel || !P) return raw;
    if (sel.value === "HK" || sel.value === "XX") return raw;
    const digits = t.replace(/\D/g, ""); if (!digits) return raw;
    const p = P.parse(t, sel.value);
    if (p && p.e164) return p.e164;
    return "+" + sel.options[sel.selectedIndex].dataset.d + digits;
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
