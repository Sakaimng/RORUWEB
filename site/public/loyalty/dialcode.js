/* Country-code picker for the sign-up phone field.
   Picking a country shows its flag + dial code beside the number box. Hong Kong is the default and keeps the old behaviour
   (the number is sent exactly as typed). Any other country sends "+<code><number>" (a single national "0" is dropped only for countries listed in TRUNK0). A number typed
   with its own "+" is sent as typed and the picker follows it. Nothing here touches the code check or saved numbers. */
(function () {
  const C = [["HK","852","Hong Kong"],["MO","853","Macau"],["CN","86","China"],["TW","886","Taiwan"],["SG","65","Singapore"],["MY","60","Malaysia"],["TH","66","Thailand"],["PH","63","Philippines"],["ID","62","Indonesia"],["VN","84","Vietnam"],["JP","81","Japan"],["KR","82","South Korea"],["IN","91","India"],["PK","92","Pakistan"],["BD","880","Bangladesh"],["LK","94","Sri Lanka"],["NP","977","Nepal"],["AE","971","United Arab Emirates"],["SA","966","Saudi Arabia"],["IL","972","Israel"],["TR","90","Turkey"],["US","1","United States"],["CA","1","Canada"],["MX","52","Mexico"],["BR","55","Brazil"],["AR","54","Argentina"],["CL","56","Chile"],["CO","57","Colombia"],["GB","44","United Kingdom"],["IE","353","Ireland"],["FR","33","France"],["DE","49","Germany"],["IT","39","Italy"],["ES","34","Spain"],["PT","351","Portugal"],["NL","31","Netherlands"],["BE","32","Belgium"],["CH","41","Switzerland"],["AT","43","Austria"],["SE","46","Sweden"],["NO","47","Norway"],["DK","45","Denmark"],["FI","358","Finland"],["PL","48","Poland"],["CZ","420","Czechia"],["GR","30","Greece"],["RU","7","Russia"],["UA","380","Ukraine"],["AU","61","Australia"],["NZ","64","New Zealand"],["ZA","27","South Africa"],["NG","234","Nigeria"],["KE","254","Kenya"],["EG","20","Egypt"],["MA","212","Morocco"]];
  // countries where one leading national "0" is the trunk prefix and is dropped after the country code. Others are sent as typed.
  const TRUNK0 = ["GB","IE","FR","DE","AT","CH","NL","BE","SE","FI","AU","NZ","JP","KR","CN","TW","MY","TH","ID","VN","PH","IN","PK","BD","LK","NP","AE","SA","IL","TR","ZA","NG","KE","EG","MA","UA"];
  const byLen = C.slice().sort((a, b) => b[1].length - a[1].length);
  function init() {
    const input = document.getElementById("phone"); if (!input || document.getElementById("dialSel")) return;
    const st = document.createElement("style");
    st.textContent = ".dialrow{display:flex;gap:8px;align-items:stretch}.dialrow input{flex:1 1 auto;min-width:0}.dialsel{flex:0 0 auto;width:104px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-weight:600;background:var(--ink);color:inherit;border:1px solid var(--line);border-radius:12px;padding:0 8px;font-size:16px;outline:none;-webkit-appearance:none;appearance:none;text-align:center;text-align-last:center}.dialsel:focus{border-color:var(--orange)}body.lt .dialsel{background:#fff;color:#16181F;border-color:rgba(22,24,31,.18)}";
    document.head.appendChild(st);
    const sel = document.createElement("select"); sel.id = "dialSel"; sel.className = "dialsel"; sel.setAttribute("aria-label", "Country code");
    C.forEach(([cc, d, n]) => { const o = document.createElement("option"); o.value = cc; o.textContent = cc + " +" + d; o.title = n; o.dataset.d = d; sel.appendChild(o); });
    const oo = document.createElement("option"); oo.value = "XX"; oo.textContent = "Other"; oo.title = "Type your number with + and your country code"; sel.appendChild(oo);
    sel.value = "HK";
    const row = document.createElement("div"); row.className = "dialrow";
    input.parentNode.insertBefore(row, input); row.appendChild(sel); row.appendChild(input);
    // typed "+852…" / "+44…" moves the picker to that country
    input.addEventListener("input", () => {
      const v = input.value.trim(); if (v[0] !== "+") return;
      const d = v.replace(/\D/g, ""), m = byLen.find(x => d.startsWith(x[1]));
      if (m && sel.value !== m[0] && !(C.find(x => x[0] === sel.value)[1] === m[1])) sel.value = m[0];
    });
    sel.addEventListener("change", () => input.focus());
  }
  // what to send to the server for the current picker + box
  window.roruDialPhone = function (raw) {
    raw = String(raw == null ? "" : raw);
    const sel = document.getElementById("dialSel"); if (!sel) return raw;
    const t = raw.trim(); if (t[0] === "+" || /^00/.test(t)) return t.replace(/^00/, "+");
    if (sel.value === "HK" || sel.value === "XX") return raw;
    const cc = sel.value, d = sel.options[sel.selectedIndex].dataset.d; let n = t.replace(/\D/g, "");
    if (!n) return raw;
    if ((cc === "US" || cc === "CA") && n.length === 11 && n[0] === "1") n = n.slice(1);
    else if (cc === "RU" && n.length === 11 && n[0] === "8") n = n.slice(1);
    else if (TRUNK0.indexOf(cc) >= 0 && n[0] === "0") n = n.slice(1);
    return "+" + d + n;
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
