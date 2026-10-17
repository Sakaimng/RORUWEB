/* RORUBARU · Roru Day scratch card (f30, f31: the card comes by itself from the guest's receipt scan)
   Guest: a real scratch-to-reveal card (finger/mouse; reduced-motion = tap to reveal) and the prizes saved on their card.
   f31: the server checks every approved receipt scan (Roru Day, bill HK$388+, bill not used, payer, one per guest per night) and gives the card itself.
   Staff: no give step any more, only a fallback when the scan fails (manager PIN + reason); reveal fallback, Mark used, Undo (15 min, then a manager with a reason).
   Owner: cards given, prizes by type, estimated cost, redemption rate; editor for min bill, Roru Days and prize odds (each set = 100%).
   The server picks every prize; this file only shows what the server says. */
(function () {
  const R = window.RORU; if (!R) return;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const zh = () => (R.lang ? R.lang() : "en") === "zh";
  const W = (en, z) => zh() ? z : en;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], DOWZ = ["日", "一", "二", "三", "四", "五", "六"];
  const ymd = (s) => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? [+m[1], +m[2], +m[3]] : null; };
  const dow = (p) => new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  const fmtD = (s, z, wd) => { const p = ymd(s); if (!p) return ""; return z ? p[1] + "月" + p[2] + "日" + (wd ? "（星期" + DOWZ[dow(p)] + "）" : "") : (wd ? DOW[dow(p)] + " " : "") + p[2] + " " + MON[p[1] - 1]; };
  const hkTime = (iso) => { if (!iso) return ""; const d = new Date(new Date(iso).getTime() + 8 * 3600e3); let h = d.getUTCHours(), m = d.getUTCMinutes(); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return h + ":" + String(m).padStart(2, "0") + ap; };
  const money = (n) => "HK$" + Math.round(+n || 0).toLocaleString("en-US");
  const money1 = (n) => "HK$" + (Math.round((+n || 0) * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 });
  const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const IMG = "/loyalty/img/";
  const pic = (n, cls) => '<img class="' + (cls || "sc-ic") + '" src="' + IMG + n + '_64.png" srcset="' + IMG + n + "_64.png 1x, " + IMG + n + '_128.png 2x" alt="">';
  // sticker-style icons drawn to match the custom emoji set (cream fill, ink line, orange rim)
  const SV = (body) => '<svg class="sc-ic" viewBox="0 0 64 64" aria-hidden="true"><g stroke-linejoin="round" stroke-linecap="round">' + body + "</g></svg>";
  const RIM = (d) => '<path d="' + d + '" fill="none" stroke="#F64501" stroke-width="9"/><path d="' + d + '" fill="#F6F3E7" stroke="#16181F" stroke-width="3.2"/>';
  const ICON = {
    soup: SV(RIM("M8 30h48c0 12-10.5 22-24 22S8 42 8 30z") + '<path d="M14 30c3-3 7-3 10 0s7 3 10 0 7-3 10 0 5 2 7 0" fill="none" stroke="#C98A3A" stroke-width="3"/><path d="M24 12c-3 4 3 6 0 11M33 9c-3 5 3 7 0 13M42 12c-3 4 3 6 0 11" fill="none" stroke="#16181F" stroke-width="2.6" opacity=".55"/>'),
    edamame: SV(RIM("M10 44c-4-9 4-18 12-17 2-9 12-15 20-11 9-3 17 6 13 15-3 8-12 9-17 8-6 9-22 14-28 5z") + '<circle cx="24" cy="38" r="5.5" fill="#7DBB4A" stroke="#16181F" stroke-width="2.4"/><circle cx="35" cy="31" r="5.5" fill="#7DBB4A" stroke="#16181F" stroke-width="2.4"/><circle cx="46" cy="24" r="5.5" fill="#7DBB4A" stroke="#16181F" stroke-width="2.4"/>'),
    mapo: SV(RIM("M14 30h36l-5 24H19z") + '<path d="M16 30c0-9 7-15 16-15s16 6 16 15z" fill="#F3D9A6" stroke="#16181F" stroke-width="3"/><path d="M24 22l3 3M33 19l2 3M40 24l3 2M29 27l2 2" stroke="#D2361B" stroke-width="3"/><rect x="27" y="10" width="8" height="8" rx="1.5" fill="#fff" stroke="#16181F" stroke-width="2.4"/>'),
    monaka: SV(RIM("M8 34c0-8 11-14 24-14s24 6 24 14-11 14-24 14S8 42 8 34z") + '<path d="M10 33c5-6 14-9 22-9s17 3 22 9" fill="none" stroke="#7A3B2A" stroke-width="5"/><path d="M18 28l4 10M28 25l2 12M38 26l-1 11M47 29l-4 9" stroke="#C98A3A" stroke-width="2.4"/>'),
    fish: SV(RIM("M6 32c8-11 22-15 34-10l12-8-3 18 3 18-12-8C28 47 14 43 6 32z") + '<circle cx="18" cy="29" r="2.6" fill="#16181F"/><path d="M26 25c3 4 3 10 0 14M33 24c3 5 3 11 0 16" fill="none" stroke="#F64501" stroke-width="3"/>'),
    beer: SV(RIM("M14 16h28v38H14zM42 24h7c4 0 5 3 5 6v8c0 4-2 6-6 6h-6") + '<path d="M17 24h22v28H17z" fill="#F2B232" stroke="none"/><path d="M12 18c0-6 6-9 10-7 2-4 9-5 12-1 4-2 10 1 9 7z" fill="#fff" stroke="#16181F" stroke-width="3"/><path d="M23 30v16M31 30v16" stroke="#fff" stroke-width="2.6" opacity=".7"/>'),
    soda: SV(RIM("M25 6h14v8c0 3 6 6 6 13v27c0 3-2 4-4 4H23c-2 0-4-1-4-4V27c0-7 6-10 6-13z") + '<path d="M19.5 32h25v12h-25z" fill="#F7C531" stroke="#16181F" stroke-width="2.4"/><path d="M25 6h14" stroke="#F64501" stroke-width="4"/><circle cx="32" cy="38" r="3" fill="#7DBB4A"/>'),
    points: SV('<circle cx="32" cy="32" r="24" fill="none" stroke="#F64501" stroke-width="9"/><circle cx="32" cy="32" r="24" fill="#F2C14E" stroke="#16181F" stroke-width="3.2"/><circle cx="32" cy="32" r="17" fill="none" stroke="#B7861C" stroke-width="2.6"/><text x="32" y="38.5" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-weight="900" font-size="15" fill="#16181F">+100</text>'),
    stamp: SV(RIM("M22 8h20v18l8 6v8H14v-8l8-6z") + '<rect x="10" y="44" width="44" height="12" rx="3" fill="#F64501" stroke="#16181F" stroke-width="3"/><text x="32" y="53.5" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-weight="900" font-size="10" fill="#fff">x2</text>')
  };
  const ROLLIC = pic("handroll");
  const prizeIcon = (p) => !p ? ROLLIC : (p.icon === "roll" || p.icon === "wagyu") ? pic("handroll") : p.icon === "highball" ? pic("highball") : p.icon === "sake" ? pic("sake") : (ICON[p.icon] || ROLLIC);
  const TICKET = '<svg class="sc-tk" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 9.5a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2V13a3 3 0 0 0 0 6v3.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V19a3 3 0 0 0 0-6z" fill="#F64501" stroke="#16181F" stroke-width="1.8"/><path d="M11 10v12" stroke="#F6F3E7" stroke-width="1.8" stroke-dasharray="2 2.2"/><path d="M18.6 10.6l1.3 3.6 3.6 1.3-3.6 1.3-1.3 3.6-1.3-3.6-3.6-1.3 3.6-1.3z" fill="#F6F3E7"/></svg>';
  const tierWord = (t) => t === "rare" ? W("Jackpot", "大獎") : t === "mid" ? W("Nice one", "好嘢") : W("On us", "我們請");
  const ERR = {
    scratch_below_min: () => W("This bill is under " + money(S.data && S.data.min_bill || 388) + ". Scratch cards start at " + money(S.data && S.data.min_bill || 388) + ".", "張單未夠 " + money(S.data && S.data.min_bill || 388) + "，滿 " + money(S.data && S.data.min_bill || 388) + " 先有刮刮卡。"),
    scratch_dup_bill: () => W("This bill already got a scratch card. One card per bill.", "呢張單已經俾咗刮刮卡。每張單一張。"),
    scratch_one_per_night: () => W("This guest already got a scratch card tonight. One per guest per Roru Day.", "呢位客人今晚已經攞咗刮刮卡。每人每個 Roru Day 一張。"),
    scratch_not_payer: () => W("That bill belongs to another member. Only the person who paid gets the card.", "呢張單屬於另一位會員。只有埋單嗰位先有刮刮卡。"),
    scratch_bill_required: () => W("Type the bill number from the receipt.", "請輸入收據上面嘅單號。"),
    scratch_not_roru_day: () => W("Scratch cards only work on Roru Day.", "刮刮卡只限 Roru Day。"),
    scratch_not_revealed: () => W("The guest hasn't scratched it yet. Tap Reveal here if their phone isn't handy.", "客人未刮開。如果佢手機唔方便，撳「喺度揭曉」。"),
    scratch_expired: () => W("This prize has expired.", "呢個獎品已經過期。"),
    scratch_monwed_only: () => W("Prizes can be used Mon to Wed, or on the night they were won.", "獎品只可以喺星期一至三用，或者得獎當晚用。"),
    scratch_off: () => W("Scratch cards are switched off.", "刮刮卡已經暫停。"),
    bad_total: () => W("Check the bill total.", "請檢查總數。"),
    perk_used_up: () => W("Already marked used.", "已經標記咗用咗。"),
    manager_only: () => W("Past the undo window. Ask a manager to undo it.", "已過復原時限，請搵經理復原。"),
    reason_required: () => W("A reason is needed for a late undo.", "遲咗復原要寫原因。"),
    not_found: () => W("That card isn't there any more. Refresh.", "搵唔到呢張卡，請重新整理。"),
    manager_pin_wrong: () => W("That isn't a manager PIN. Ask a manager to type theirs.", "唔係經理 PIN，請經理親自輸入。"),
    locked_try_later: () => W("Too many wrong PINs. Try again in 15 minutes.", "PIN 錯太多次，請 15 分鐘後再試。"),
    scratch_use_fallback: () => W("Cards now come from the receipt scan. Use \"Scan didn't work?\" with a manager.", "而家刮刮卡跟收據掃描自動派。掃唔到就用「掃唔到收據？」搵經理。")
  };
  const errTxt = (e) => { const k = e && (e.code || e.message); return ERR[k] ? ERR[k]() : (R.errText ? R.errText(e) : String(k)); };
  function sheet(html, cls) { const ov = document.createElement("div"); ov.className = "pp-ov sc-ovl" + (cls ? " " + cls : ""); ov.innerHTML = '<div class="pp-sh">' + html + "</div>"; document.body.appendChild(ov); return ov; }

  // ================= GUEST =================
  const G = { data: null, at: 0, busy: false };
  const gtok = () => { try { return localStorage.getItem("roru_member_token"); } catch (e) { return null; } };
  async function guestLoad(force) {
    const tk = gtok(); if (!tk || G.busy || !$("#scWrap")) return; if (!force && Date.now() - G.at < 6000) return;
    G.busy = true;
    try { const d = await R.rpc("family_scratch", { p_token: tk }); G.at = Date.now(); const prevNew = G.data ? G.data.cards.filter(c => c.state === "new").length : null; G.data = d; guestRender();
      const nNew = d.cards ? d.cards.filter(c => c.state === "new").length : 0;
      if (prevNew != null && nNew > prevNew) { R.toast(W("🎟 You got a scratch card!", "🎟 你有一張刮刮卡！"), 3500); try { navigator.vibrate && navigator.vibrate(40); } catch (e) {} }
    } catch (e) {} finally { G.busy = false; }
  }
  // f31: right after a receipt scan, ask which card (if any) that receipt earned. The server decided; this only reads it.
  async function afterReceipt(rid) {
    const tk = gtok(); if (!tk || !rid) return null;
    for (let i = 0; i < 2; i++) {
      try { const d = await R.rpc("family_scratch", { p_token: tk }); G.at = Date.now(); G.data = d; guestRender();
        const c = (d.cards || []).find(x => +x.receipt_id === +rid); if (c) return c; } catch (e) {}
      await new Promise(r => setTimeout(r, 700));
    }
    return null;
  }
  // the "You've got a scratch card!" button on the scan result (same look as the one on the card tab)
  function scanWin(host, c) {
    if (!host || !c || $("[data-scopen]", host)) return;
    host.insertAdjacentHTML("afterbegin", '<button type="button" class="sc-new sc-scanwin" data-scopen="' + c.id + '"><span class="sc-new-tk">' + TICKET + '</span><span class="sc-new-t"><b>' + W("You've got a scratch card!", "你有一張刮刮卡！") + "</b><small>" + W("This receipt earned it. Tap to scratch, every card wins.", "呢張收據為你贏咗一張。撳嚟刮開，每張都有獎。") + '</small></span><span class="sc-new-go">' + W("Scratch", "刮") + "</span></button>");
    $("[data-scopen]", host).addEventListener("click", (e) => { e.stopPropagation(); scratchOpen(c.id); });
    R.toast(W("🎟 You've got a scratch card!", "🎟 你有一張刮刮卡！"), 3500); try { navigator.vibrate && navigator.vibrate([30, 40, 30]); } catch (e) {}
  }
  function guestRender() {
    const box = $("#scWrap"), d = G.data; if (!box) return;
    if (!d || !d.on) { box.innerHTML = ""; return; }
    const z = zh(), nw = d.cards.filter(c => c.state === "new"), open = d.cards.filter(c => c.state === "unused"), done = d.cards.filter(c => c.state === "used" || c.state === "expired");
    let h = "";
    if (d.today && d.today.roru_day) {
      h += '<div class="sc-day"><div class="sc-day-h">' + pic("handroll", "sc-day-ic") + "<div><b>" + W("Tonight is Roru Day", "今晚係 Roru Day") + "</b><small>" + W("Members' first drink is on us: any drink except draft sake.", "會員第一杯飲品我們請：除咗生清酒，任何飲品都得。") + "</small></div></div>" +
        '<p>' + W("Spend " + money(d.min_bill) + " or more, then scan your receipt here: your scratch card comes by itself. Gold receipt tonight? A 2nd free drink plus 2x points.", "消費滿 " + money(d.min_bill) + "，埋單後喺度掃描收據，刮刮卡自動送到。今晚拎到金色收據？再送多一杯飲品，仲有雙倍積分。") + "</p></div>";
    } else if (d.next_day && !nw.length && !open.length) {
      h += '<div class="sc-next">' + TICKET + "<span>" + W("Next Roru Day: <b>" + fmtD(d.next_day, false, true) + "</b>. First drink on us, and scan a receipt of " + money(d.min_bill) + " or more for a scratch card.", "下一個 Roru Day：<b>" + fmtD(d.next_day, true, true) + "</b>。第一杯飲品我們請，掃描滿 " + money(d.min_bill) + " 嘅收據仲有刮刮卡。") + "</span></div>";
    }
    nw.forEach(c => { h += '<button type="button" class="sc-new" data-scopen="' + c.id + '"><span class="sc-new-tk">' + TICKET + '</span><span class="sc-new-t"><b>' + W("You've got a scratch card!", "你有一張刮刮卡！") + "</b><small>" + (c.origin === "scan" ? W("From your receipt scan. Tap to scratch it, every card wins.", "嚟自你掃描嘅收據。撳嚟刮開，每張都有獎。") : W("Tap to scratch it. Every card wins something.", "撳嚟刮開，每張都有獎。")) + '</small></span><span class="sc-new-go">' + W("Scratch", "刮") + "</span></button>"; });
    if (open.length || done.length) {
      h += '<div class="sc-prizes"><div class="sc-ph">' + TICKET + "<b>" + W("Scratch card prizes", "刮刮卡獎品") + "</b></div>" +
        open.map(c => '<div class="sc-pr">' + prizeIcon(c.prize) + '<div class="sc-pr-t"><b>' + esc(z ? c.prize.zh : c.prize.en) + "</b><small>" + (c.usable_today ? W("Ready to use. Show this to staff.", "可以用。俾店員睇呢度。") : W("Use it Mon–Wed", "星期一至三可用")) + " · " + W("until " + fmtD(c.expires_on, false), "有效至 " + fmtD(c.expires_on, true)) + '</small></div><span class="sc-chip on">' + W("Unused", "未用") + "</span></div>").join("") +
        done.slice(0, 3).map(c => '<div class="sc-pr dim">' + prizeIcon(c.prize) + '<div class="sc-pr-t"><b>' + esc(z ? c.prize.zh : c.prize.en) + "</b><small>" + (c.state === "expired" ? W("Expired " + fmtD(c.expires_on, false), fmtD(c.expires_on, true) + "已過期") : (c.prize.kind === "item" ? W("Used " + fmtD(c.used_at, false), fmtD(c.used_at, true) + "用咗") : W("Added to your card", "已加到你張卡"))) + '</small></div><span class="sc-chip">' + (c.state === "expired" ? W("Expired", "過期") : W("Used ✓", "已用 ✓")) + "</span></div>").join("") + "</div>";
    }
    box.innerHTML = h;
  }

  // ---- the scratch card itself ----
  function scratchOpen(id) {
    const d = G.data, z = zh(); const red = reduced();
    const ov = sheet('<div class="sc-stage"><div class="sc-top"><button class="pp-x" data-x aria-label="' + W("Close", "關閉") + '">‹</button><div><h2>' + W("Roru Day scratch card", "Roru Day 刮刮卡") + "</h2><small>" + W("Every card wins. The prize is already picked.", "每張都有獎，獎品已經揀好。") + "</small></div></div>" +
      '<div class="sc-card" id="scCard"><div class="sc-under" id="scUnder"><div class="sc-load">' + W("Getting your card…", "攞緊你張卡…") + "</div></div></div>" +
      '<p class="sc-hint" id="scHint">' + (red ? W("Tap the card to reveal your prize.", "撳張卡揭曉獎品。") : W("Scratch the orange foil with your finger.", "用手指刮開橙色嗰層。")) + "</p>" +
      '<div class="sc-acts"><button class="btn ghost sm" type="button" id="scAll">' + W("Reveal it all", "全部揭曉") + '</button></div><div id="scDone" class="sc-after hide"></div></div>', "sc-full");
    let closed = false; const close = () => { closed = true; ov.remove(); guestLoad(true); };
    ov.addEventListener("click", (e) => { if (e.target.closest("[data-x]")) close(); });
    (async () => {
      let r; try { r = await R.rpc("family_scratch_open", { p_token: gtok(), p_card_id: id }); } catch (e) { $("#scUnder", ov).innerHTML = '<div class="sc-load">' + esc(errTxt(e)) + "</div>"; return; }
      if (closed) return;
      G.data = r.scratch; G.at = Date.now();
      const c = r.card, p = c.prize;
      $("#scUnder", ov).innerHTML = '<div class="sc-prize t-' + p.tier + '"><span class="sc-tier">' + tierWord(p.tier) + "</span>" + prizeIcon(p).replace('class="sc-ic"', 'class="sc-ic big"') +
        '<b class="sc-name">' + esc(z ? p.zh : p.en) + '</b><span class="sc-line">' + esc(z ? p.line_zh : p.line_en) + '</span><span class="sc-line2">' + esc(z ? p.line_en : p.line_zh) + "</span></div>";
      const after = () => {
        const dn = $("#scDone", ov); $("#scHint", ov).classList.add("hide"); $("#scAll", ov).classList.add("hide");
        dn.innerHTML = '<p class="sc-saved">' + (p.kind === "item" ? W("Saved to your card as <b>unused</b>. Show staff when you want it: tonight, or Mon–Wed until " + fmtD(c.expires_on, false) + ".", "已存入你張卡，狀態係<b>未用</b>。今晚或者 " + fmtD(c.expires_on, true) + "前嘅星期一至三，俾店員睇就用得。") :
          W("Already added to your card. Nothing to show staff.", "已經加到你張卡，唔使俾店員睇。")) + '</p><button class="btn" type="button" data-x>' + W("Done", "完成") + "</button>";
        dn.classList.remove("hide"); guestRender();
      };
      if (red) coverStatic(ov, after); else coverCanvas(ov, p, after);
    })();
  }
  function coverStatic(ov, after) {
    const card = $("#scCard", ov), cv = document.createElement("button"); cv.type = "button"; cv.className = "sc-cover-static"; cv.setAttribute("aria-label", W("Reveal prize", "揭曉獎品"));
    cv.innerHTML = '<span class="sc-cs-band">' + pic("handroll", "sc-cs-roll") + '</span><span class="sc-cs-t"><b>RORU DAY</b><em>' + W("Tap to reveal", "撳一下揭曉") + "</em></span>";
    card.appendChild(cv);
    const go = () => { cv.remove(); after(); }; cv.onclick = go; $("#scAll", ov).onclick = go;
  }
  function coverCanvas(ov, p, after) {
    const card = $("#scCard", ov), dpr = Math.min(2, window.devicePixelRatio || 1), w = card.clientWidth, h = card.clientHeight;
    const cv = document.createElement("canvas"), fx = document.createElement("canvas");
    cv.className = "sc-cover"; fx.className = "sc-fx"; cv.width = w * dpr; cv.height = h * dpr; fx.width = (w + 80) * dpr; fx.height = (h + 160) * dpr;
    cv.setAttribute("role", "img"); cv.setAttribute("aria-label", W("Scratch area. Use Reveal it all if you can't scratch.", "刮刮區。如果刮唔到，撳「全部揭曉」。"));
    card.appendChild(cv); card.appendChild(fx);
    const g = cv.getContext("2d"), f = fx.getContext("2d"); g.scale(dpr, dpr); f.scale(dpr, dpr);
    // --- paint the foil: RORUBARU orange, a nori band (the cylinder's wrap), sesame specks, sheen, wordmark ---
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#FF7A2E"); gr.addColorStop(.45, "#F64501"); gr.addColorStop(1, "#B83200");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { g.fillStyle = "rgba(255,255,255," + (0.05 + rnd() * .05) + ")"; g.beginPath(); const x = rnd() * w * 1.4 - w * .2; g.moveTo(x, 0); g.lineTo(x + 18 + rnd() * 26, 0); g.lineTo(x - 50 + rnd() * 20, h); g.lineTo(x - 70, h); g.fill(); }
    const bw = Math.round(w * .27); const ng = g.createLinearGradient(0, 0, bw, 0); ng.addColorStop(0, "#132018"); ng.addColorStop(.5, "#22352a"); ng.addColorStop(1, "#101a13");
    g.fillStyle = ng; g.fillRect(0, 0, bw, h);
    g.strokeStyle = "rgba(160,200,150,.10)"; g.lineWidth = 1; for (let y = 4; y < h; y += 5) { g.beginPath(); g.moveTo(0, y + rnd() * 2); g.lineTo(bw, y + rnd() * 2); g.stroke(); }
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(bw, 0, 3, h);
    for (let i = 0; i < 70; i++) { const x = bw + 6 + rnd() * (w - bw - 12), y = 6 + rnd() * (h - 12); g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI); g.fillStyle = rnd() < .7 ? "rgba(255,244,222,.55)" : "rgba(40,20,10,.35)"; g.beginPath(); g.ellipse(0, 0, 2.6, 1.2, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = "#FFF6E6"; g.textAlign = "left"; g.textBaseline = "alphabetic";
    const tx = bw + 18, room = w - tx - 16;
    const fit = (txt, wt, px, fam) => { let s = px; g.font = wt + " " + s + "px " + fam; while (s > 9 && g.measureText(txt).width > room) { s -= 1; g.font = wt + " " + s + "px " + fam; } return s; };
    const FAM = "Geist, 'PingFang HK', 'Noto Sans CJK HK', system-ui, sans-serif";
    fit("RORU DAY", 900, Math.round(h * .2), FAM); g.fillText("RORU DAY", tx, h * .42);
    const t2 = W("SCRATCH HERE  ✦  刮開", "刮開呢度  ✦  SCRATCH"); fit(t2, 500, Math.round(h * .085), FAM); g.fillStyle = "rgba(255,246,230,.95)"; g.fillText(t2, tx, h * .58);
    fit("HIGH ROLLERS · 卷王會", 500, Math.round(h * .07), FAM); g.fillStyle = "rgba(255,246,230,.75)"; g.fillText("HIGH ROLLERS · 卷王會", tx, h * .86);
    const im = new Image(); im.onload = () => { if (done) return; const s = Math.min(bw * .78, h * .42); for (let k = 0; k < 2; k++) { g.save(); g.translate(bw / 2, h * (k ? .72 : .3)); g.rotate((k ? 14 : -14) * Math.PI / 180); g.drawImage(im, -s / 2, -s / 2, s, s); g.restore(); } };
    im.src = IMG + "handroll_128.png";
    // --- scratching ---
    let done = false, last = null, moves = 0, drawing = false; const parts = []; let raf = 0;
    const R0 = Math.max(18, Math.round(w * .07));
    const pos = (e) => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left), y: (e.clientY - b.top) }; };
    function dab(a, b) {
      g.globalCompositeOperation = "destination-out"; g.strokeStyle = "#000"; g.globalAlpha = 1; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = R0 * 2;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x + .01, b.y); g.stroke(); g.globalCompositeOperation = "source-over";
      const n = Math.min(5, 1 + Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 9));
      for (let i = 0; i < n && parts.length < 140; i++) parts.push({ x: b.x + 40, y: b.y + 80, vx: (Math.random() - .5) * 3.2, vy: -Math.random() * 3 - .6, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .4, s: 2 + Math.random() * 3.5, c: Math.random() < .55 ? "#F64501" : Math.random() < .5 ? "#FFD28A" : "#FFF6E6", t: 0 });
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function tick() {
      raf = 0; f.clearRect(0, 0, w + 80, h + 160);
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.vy += .18; q.x += q.vx; q.y += q.vy; q.r += q.vr; q.t++; if (q.t > 70 || q.y > h + 160) { parts.splice(i, 1); continue; }
        f.save(); f.globalAlpha = Math.max(0, 1 - q.t / 70); f.translate(q.x, q.y); f.rotate(q.r); f.fillStyle = q.c; f.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); f.restore(); }
      if (parts.length) raf = requestAnimationFrame(tick);
    }
    function cleared() {
      const step = 8 * dpr, dta = g.getImageData(0, 0, cv.width, cv.height).data; let n = 0, k = 0;
      for (let y = step / 2; y < cv.height; y += step) for (let x = step / 2; x < cv.width; x += step) { n++; if (dta[(Math.floor(y) * cv.width + Math.floor(x)) * 4 + 3] < 40) k++; }
      return k / Math.max(1, n);
    }
    function finish() {
      if (done) return; done = true; cv.style.transition = "opacity .45s ease"; cv.style.opacity = "0"; setTimeout(() => cv.remove(), 500);
      try { navigator.vibrate && navigator.vibrate([20, 40, 30]); } catch (e) {}
      celebrate(card, p.tier); after(); setTimeout(() => { parts.length = 0; fx.style.transition = "opacity .3s"; fx.style.opacity = "0"; setTimeout(() => fx.remove(), 350); }, 1300);
    }
    cv.addEventListener("pointerdown", (e) => { if (done) return; drawing = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} last = pos(e); dab(last, last); e.preventDefault(); });
    cv.addEventListener("pointermove", (e) => { if (!drawing || done) return; const p2 = pos(e); dab(last, p2); last = p2; if (++moves % 10 === 0 && cleared() > .5) finish(); e.preventDefault(); });
    const up = () => { if (!drawing) return; drawing = false; if (!done && cleared() > .5) finish(); };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.style.touchAction = "none";
    $("#scAll", ov).onclick = finish;
    ov.__scratch = { dab: (a, b) => dab(a, b), cleared, finish };
  }
  function celebrate(card, tier) {
    const n = tier === "rare" ? 22 : tier === "mid" ? 14 : 9, host = document.createElement("div"); host.className = "sc-cele"; card.appendChild(host);
    for (let i = 0; i < n; i++) { const s = document.createElement("img"); s.src = IMG + "handroll_64.png"; s.alt = ""; const a = (Math.random() * 300 - 150) * Math.PI / 180;
      s.style.setProperty("--dx", Math.round(Math.sin(a) * (90 + Math.random() * 120)) + "px"); s.style.setProperty("--dy", Math.round(-Math.cos(a) * (70 + Math.random() * 110) - 40) + "px");
      s.style.setProperty("--rz", Math.round(Math.random() * 540 - 270) + "deg"); s.style.animationDelay = Math.round(Math.random() * 120) + "ms"; host.appendChild(s); }
    card.classList.add("pop", "t-" + tier); setTimeout(() => host.remove(), 1700);
  }
  function guestInit() {
    const hero = $("#perkHero"); if (!hero || !$("#member")) return;
    const box = document.createElement("div"); box.id = "scWrap"; box.dataset.tab = "card"; const hb = $("#hookBar"); (hb || hero).insertAdjacentElement("afterend", box);
    box.addEventListener("click", (e) => { const b = e.target.closest("[data-scopen]"); if (b) scratchOpen(+b.dataset.scopen); });
    setInterval(() => { if (document.visibilityState === "visible" && !$("#member").classList.contains("hide")) guestLoad(false); }, 3000);
    document.addEventListener("roru:lang", guestRender);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") guestLoad(true); });
    const mem = $("#member"); new MutationObserver(() => { if (!mem.classList.contains("hide") && !G.data) guestLoad(true); if (mem.classList.contains("hide")) { G.data = null; guestRender(); } }).observe(mem, { attributes: true, attributeFilter: ["class"] });
    if (!mem.classList.contains("hide")) guestLoad(true);
  }

  // ================= STAFF =================
  const S = { code: null, data: null, at: 0, busy: false };
  const sess = () => window.__ppSess && window.__ppSess.token;
  async function staffLoad(force) {
    const c = window.__ppCard; if (!c || !sess() || S.busy) return;
    if (!force && S.code === c.member_code && Date.now() - S.at < 8000) return;
    S.busy = true;
    try { const d = await R.rpc("staff_scratch", { p_token: sess(), p_who: c.member_code }); if (window.__ppCard && window.__ppCard.member_code === c.member_code) { S.code = c.member_code; S.data = d; S.at = Date.now(); staffPaint(); } } catch (e) {} finally { S.busy = false; }
  }
  function staffHtml(d) {
    const z = zh(), um = d.undo_minutes || 15, now = Date.now();
    const t = d.today || {}, live = t.can_give;
    const sub = t.roru_day ? W("Roru Day today · comes by itself when the guest scans a receipt of " + money(d.min_bill) + "+", "今日係 Roru Day · 客人掃描滿 " + money(d.min_bill) + " 嘅收據就自動有") :
      t.test_day ? W("Preview: works any day · comes by itself when the guest scans a receipt of " + money(d.min_bill) + "+", "預覽版：任何日子都得 · 客人掃描滿 " + money(d.min_bill) + " 嘅收據就自動有") :
      (d.next_day ? W("Next Roru Day: " + fmtD(d.next_day, false, true), "下一個 Roru Day：" + fmtD(d.next_day, true, true)) : W("No Roru Day set", "未定 Roru Day"));
    const rows = (d.cards || []).filter(c => c.state !== "used" || (now - new Date(c.used_at).getTime()) < 36 * 3600e3).slice(0, 6).map(c => {
      const recent = (now - new Date(c.created_at).getTime()) < um * 60e3;
      const p = c.prize, nm = p ? esc(z ? p.zh : p.en) : W("Not scratched yet", "未刮開");
      const how = c.origin === "scan" ? W("From receipt scan", "收據掃描") : c.origin === "fallback" ? W("Manager OK", "經理批") : W("Given", "俾咗");
      const meta = c.state === "new" ? W(how + " " + hkTime(c.created_at) + " · bill " + esc(c.bill_ref || ""), how + " " + hkTime(c.created_at) + " · 單號 " + esc(c.bill_ref || "")) :
        c.state === "unused" ? how + " · " + (c.usable_today ? W("unused · can be used now", "未用 · 而家用得") : W("unused · Mon–Wed only, until " + fmtD(c.expires_on, false), "未用 · 只限星期一至三，至 " + fmtD(c.expires_on, true))) :
        c.state === "used" ? (p && p.kind !== "item" ? W("Added to the card automatically", "已自動加到張卡") : W("Used " + hkTime(c.used_at), hkTime(c.used_at) + " 用咗")) : W("Expired", "已過期");
      let btn = "";
      if (c.state === "new") btn = '<button class="btn sm" data-screveal="' + c.id + '">' + W("Reveal here", "喺度揭曉") + "</button>";
      else if (c.state === "unused") btn = '<button class="btn sm" data-scuse="' + c.id + '">' + W("Mark used", "標記已用") + "</button>";
      else if (c.state === "used" && p && p.kind === "item") btn = '<button class="btn ghost sm" data-scuseundo="' + c.id + '">↩︎ ' + W("Undo", "復原") + "</button>";
      const undo = (c.state === "new" || recent) ? '<button class="btn ghost sm sc-void" data-scundo="' + c.id + '" title="' + W("Cancel this card", "取消呢張卡") + '">' + W("Cancel card", "取消") + "</button>" : "";
      return '<div class="sc-row s-' + c.state + '">' + (p ? prizeIcon(p) : TICKET) + '<div class="sc-row-t"><b>' + nm + "</b><small>" + meta + '</small></div><div class="sc-row-b">' + btn + undo + "</div></div>";
    }).join("");
    return '<div class="sc-st-h">' + TICKET + '<div class="sc-st-t"><b>' + W("Roru Day scratch card", "Roru Day 刮刮卡") + "</b><small>" + sub + "</small></div>" +
      "</div>" +
      (t.roru_day ? '<div class="sc-st-note">' + W("Tonight: members' first drink is free (any drink except draft sake). Gold receipt = a 2nd free drink + 2x points.", "今晚：會員第一杯飲品免費（生清酒除外）。金色收據 = 第二杯免費 + 雙倍積分。") + "</div>" : "") + rows +
      (live ? '<div class="sc-st-fb"><span>' + W("Receipt scan didn't work?", "掃唔到收據？") + '</span><button class="btn ghost sm" type="button" data-scgive>' + W("Give by hand (manager)", "人手派（經理）") + "</button></div>" : "");
  }
  function staffPaint() {
    const box = $("#gcard"); if (!box || !box.firstChild || box.dataset.sample) return;
    let el = $(".sc-st", box); const d = S.data, c = window.__ppCard;
    if (!d || !d.on || !c || S.code !== c.member_code) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.className = "sc-st"; const anchor = $(".pp-st", box) || $(".gperks", box); if (anchor) anchor.insertAdjacentElement("afterend", el); else { const gl = $(".gl", box); if (gl) gl.insertAdjacentElement("beforebegin", el); else box.appendChild(el); } }
    el.innerHTML = staffHtml(d);
  }
  function giveSheet() {
    const d = S.data, c = window.__ppCard || {}; if (!d) return;
    const nm = /\p{L}/u.test(c.name || "") ? c.name : W("this guest", "呢位客人");
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Close">‹</button><div><h2>' + W("Scratch card by hand", "人手派刮刮卡") + "</h2><small>" + esc(nm) + "</small></div></div>" +
      '<p class="pp-rule">' + W("Only if the guest's <b>receipt scan didn't work</b>: the scan gives the card by itself. Needs a <b>manager's PIN</b> and a reason. Bill must be <b>" + money(d.min_bill) + " or more</b>, one card per bill, only for the guest who <b>paid</b>. The system still picks the prize.", "只限客人<b>掃唔到收據</b>先用：掃描會自動派卡。要<b>經理 PIN</b> 同原因。張單要<b>滿 " + money(d.min_bill) + "</b>，每張單一張，只俾<b>埋單</b>嗰位。獎品照樣由系統揀。") + "</p>" +
      '<label class="pp-bill"><span>' + W("Bill total (HK$)", "單總數（HK$）") + '</span><input id="scTot" inputmode="decimal" autocomplete="off" placeholder="' + W("e.g. 528", "例如 528") + '"></label>' +
      '<label class="pp-bill"><span>' + W("Bill no. (from the receipt)", "單號（收據上面）") + '</span><input id="scBill" autocomplete="off" autocapitalize="characters" placeholder="e.g. A-001238"></label>' +
      '<label class="pp-bill"><span>' + W("Why no scan?", "點解掃唔到？") + '</span><input id="scWhy" autocomplete="off" maxlength="200" placeholder="' + W("e.g. receipt photo too blurry", "例如：收據影得太矇") + '"></label>' +
      '<label class="pp-bill"><span>' + W("Manager PIN", "經理 PIN") + '</span><input id="scMgr" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="••••••"></label>' +
      '<div id="scErr" class="pp-err hide"></div><div class="pp-sh-f"><button class="btn ghost" data-x type="button" style="width:auto">' + W("Cancel", "取消") + '</button><button class="btn" id="scGo" type="button" style="width:auto">' + W("Give with manager OK", "經理批准派卡") + "</button></div>");
    setTimeout(() => { const i = $("#scTot", ov); if (i) i.focus(); }, 80);
    ov.addEventListener("input", () => { const er = $("#scErr", ov); if (er) er.classList.add("hide"); });
    ov.addEventListener("click", async (e) => {
      if (e.target.closest("[data-x]") || e.target === ov) { ov.remove(); return; }
      if (e.target.closest("#scGo")) {
        const b = $("#scGo", ov), er = $("#scErr", ov); er.classList.add("hide");
        const tot = parseFloat(String($("#scTot", ov).value).replace(/[^0-9.]/g, ""));
        if (!(tot > 0)) { er.textContent = ERR.bad_total(); er.classList.remove("hide"); return; }
        if (tot < (d.min_bill || 388)) { er.textContent = ERR.scratch_below_min(); er.classList.remove("hide"); }   // the server checks again; this is only the quick hint
        if (String($("#scWhy", ov).value).trim().length < 3) { er.textContent = W("Write why the scan didn't work.", "請寫低點解掃唔到。"); er.classList.remove("hide"); return; }
        if (!String($("#scMgr", ov).value).trim()) { er.textContent = W("A manager types their PIN here.", "請經理喺度輸入 PIN。"); er.classList.remove("hide"); return; }
        b.disabled = true;
        try { const r = await R.rpc("staff_scratch_give_fallback", { p_token: sess(), p_who: c.member_code, p_total_hkd: tot, p_bill: $("#scBill", ov).value, p_manager_pin: $("#scMgr", ov).value, p_reason: $("#scWhy", ov).value });
          S.data = Object.assign(r.scratch, { undo_minutes: d.undo_minutes, role: d.role }); S.at = Date.now(); ov.remove(); staffPaint(); givenSheet(r.card_id);
        } catch (x) { er.textContent = errTxt(x); er.classList.remove("hide"); b.disabled = false; }
      }
    });
  }
  function givenSheet(id) {
    const um = (S.data && S.data.undo_minutes) || 15;
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Close">‹</button><div><h2>' + W("Scratch card given ✓", "刮刮卡已俾 ✓") + "</h2><small>" + W("Logged under your PIN, with the manager's OK", "已用你嘅 PIN 同經理批准記錄") + "</small></div></div>" +
      '<div class="sc-given">' + TICKET + "<p>" + W("Ask the guest to open their card on their phone and scratch it. If their phone isn't handy, tap <b>Reveal here</b> on their card.", "請客人喺手機打開會員卡刮開。如果佢手機唔方便，喺佢張卡撳<b>喺度揭曉</b>。") + "</p></div>" +
      '<p class="pp-rule">' + W("Wrong bill or wrong guest? Cancel the card within " + um + " minutes. After that a manager can cancel it with a reason.", "單或者客人搞錯？" + um + " 分鐘內可以取消。之後要經理寫低原因先取消到。") + "</p>" +
      '<div class="pp-sh-f"><button class="btn ghost" data-scundo="' + id + '" type="button" style="width:auto">↩︎ ' + W("Undo", "復原") + '</button><button class="btn" data-x type="button" style="width:auto">' + W("Done", "完成") + "</button></div>");
    ov.addEventListener("click", async (e) => { if (e.target.closest("[data-x]") || e.target === ov) { ov.remove(); return; }
      const u = e.target.closest("[data-scundo]"); if (u) { e.stopPropagation(); if (await undoCall("staff_scratch_undo", { p_card_id: +u.dataset.scundo }, u)) ov.remove(); } });
  }
  async function undoCall(fn, args, btn) {
    btn.disabled = true;
    try { let r; try { r = await R.rpc(fn, Object.assign({ p_token: sess(), p_reason: null }, args)); }
      catch (e) { const k = e.code || e.message; if (k === "reason_required" || (k === "manager_only" && S.data && S.data.role !== "staff")) { const why = prompt(W("Reason for the late undo (manager):", "遲咗復原嘅原因（經理）：")); if (!why) { btn.disabled = false; return false; } r = await R.rpc(fn, Object.assign({ p_token: sess(), p_reason: why }, args)); } else throw e; }
      S.data = Object.assign(r.scratch, { undo_minutes: S.data.undo_minutes, role: S.data.role }); S.at = Date.now(); staffPaint(); R.toast(W("Undone ✓", "已復原 ✓")); return true;
    } catch (e) { R.toast(errTxt(e), 3800); btn.disabled = false; return false; }
  }
  async function simpleCall(fn, id, btn, okMsg) {
    btn.disabled = true;
    try { const r = await R.rpc(fn, { p_token: sess(), p_card_id: id }); S.data = Object.assign(r.scratch, { undo_minutes: S.data.undo_minutes, role: S.data.role }); S.at = Date.now(); staffPaint(); if (okMsg) R.toast(okMsg); }
    catch (e) { R.toast(errTxt(e), 3800); btn.disabled = false; }
  }
  function staffInit() {
    const box = $("#gcard"); if (!box || !$("#pinPad")) return;
    new MutationObserver(() => { if (window.__ppCard && box.firstChild && !box.dataset.sample && !$(".sc-st", box)) { if (S.data && S.code === window.__ppCard.member_code) staffPaint(); staffLoad(S.code !== window.__ppCard.member_code); } }).observe(box, { childList: true });
    setInterval(() => { if (box.firstChild && window.__ppCard && document.visibilityState === "visible") staffLoad(false); }, 5000);
    document.addEventListener("roru:lang", staffPaint);
    document.addEventListener("click", async (e) => {
      if (e.target.closest(".sc-st [data-scgive]")) { await staffLoad(true); giveSheet(); return; }
      const rv = e.target.closest(".sc-st [data-screveal]"); if (rv) return simpleCall("staff_scratch_reveal", +rv.dataset.screveal, rv, W("Revealed ✓", "已揭曉 ✓"));
      const us = e.target.closest(".sc-st [data-scuse]"); if (us) return simpleCall("staff_scratch_use", +us.dataset.scuse, us, W("Marked used ✓", "已標記用咗 ✓"));
      const uu = e.target.closest(".sc-st [data-scuseundo]"); if (uu) return undoCall("staff_scratch_use_undo", { p_card_id: +uu.dataset.scuseundo }, uu);
      const ud = e.target.closest(".sc-st [data-scundo]"); if (ud) { if (!confirm(W("Cancel this scratch card? Any points or stamp it gave come back off.", "取消呢張刮刮卡？佢俾嘅積分或者印花會扣返。"))) return; return undoCall("staff_scratch_undo", { p_card_id: +ud.dataset.scundo }, ud); }
    });
  }

  // ================= OWNER =================
  const O = { data: null };
  const otok = () => window.__ppOwner && window.__ppOwner.token;
  async function ownerLoad() {
    const v = $("#v-scratch"); if (!v || !otok()) return;
    if (!O.data) v.innerHTML = '<p class="sub" style="padding:20px 0">Loading…</p>';
    try { const [d, src] = await Promise.all([R.rpc("owner_scratch", { p_token: otok() }), R.rpc("owner_scratch_sources", { p_token: otok() }).catch(() => null)]); O.data = d; O.src = src; ownerRender(); } catch (e) { v.innerHTML = '<p class="sub">' + esc(errTxt(e)) + "</p>"; }
  }
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  function ownerRender() {
    const d = O.data, v = $("#v-scratch"); if (!d || !v) return;
    const P = {}; d.prizes.forEach(p => P[p.id] = p);
    const tile = (cls, l, val, sub) => '<div class="kpi pp-kpi ' + cls + '"><div class="lbl">' + l + '</div><div class="val">' + val + '</div><div class="kx">' + sub + "</div></div>";
    const per = d.cards ? d.cost_won / d.cards : 0;
    const kp = tile("k-or", "🎟 Cards given", d.cards, d.cards ? d.members_with + " guest" + (d.members_with === 1 ? "" : "s") + " · average bill " + money(d.bill_avg) + " · " + d.scratched + " scratched" : "None yet. They come by themselves when a guest scans a receipt of " + money(d.min_bill) + "+ on Roru Day.") +
      tile("k-gr", "Redemption rate", d.items_won ? pct(d.items_used, d.items_won) + "%" : "–", d.items_won ? d.items_used + " of " + d.items_won + " food &amp; drink prizes used · " + d.items_open + " still waiting" : "Shows once guests start using prizes") +
      tile("k-gold", "Estimated prize cost", money(d.cost_used), "used so far · " + money(d.cost_won) + " if every prize won gets used · about " + money1(per) + " a card") +
      tile("k-pu", "✨ Jackpots", d.by_tier.rare, "Wagyu roll or sake carafe · max 1 a night");
    const bt = d.by_tier, tot = Math.max(1, d.cards), plan = { common: 70, mid: 25, rare: 5 };
    const tierBar = (k, l) => '<div class="sc-ob"><span>' + l + ' <small>planned ' + plan[k] + '%</small></span><span class="pp-ob-b"><i class="sc-' + k + '" style="width:' + Math.max(2, bt[k] / tot * 100) + '%"></i></span><b>' + bt[k] + " <small>(" + pct(bt[k], d.cards) + "%)</small></b></div>";
    const won = d.prizes.filter(p => p.won).sort((a, b) => b.won - a.won);
    const prow = (p) => '<div class="sc-orow"><span class="sc-oic">' + prizeIcon(p) + '</span><span class="sc-on">' + esc(p.en) + " <small>" + esc(p.zh) + '</small></span><span class="sc-tg t-' + p.tier + '">' + p.tier + "</span><b>" + p.won + '</b><span class="sc-ou">' + (p.kind === "item" ? p.used + " used" : "auto") + "</span></div>";
    const t = d.today || {}, cur = d.sets.find(s => s.id === t.set_id);
    const nx = d.days.find(x => x.day >= (d.hk_today || ""));
    const dayRows = d.days.map(x => { const s = d.sets.find(y => y.id === x.set_id) || {}; return '<div class="pp-orow"><span>' + fmtD(x.day, false, true) + " " + ymd(x.day)[0] + " · Set " + esc(s.key || "") + " " + esc(s.en || "") + "</span><b>" + (x.cards ? x.cards + " cards · " + money1(x.cost) : "–") + "</b></div>"; }).join("") +
      (d.other_days || []).map(x => '<div class="pp-orow"><span>' + fmtD(x.day, false, true) + " · preview test</span><b>" + x.cards + " cards · " + money1(x.cost) + "</b></div>").join("");
    const setCard = (s) => '<div class="sc-set"><div class="sc-set-h"><b>Set ' + esc(s.key) + " · " + esc(s.en) + "</b> <small>" + esc(s.zh) + "</small></div>" + s.prizes.map(x => { const p = P[x.prize_id] || {}; return '<div class="sc-sr"><span class="sc-oic">' + prizeIcon(p) + "</span><span>" + esc(p.en) + '</span><span class="sc-tg t-' + p.tier + '">' + p.tier + "</span><b>" + (+x.odds).toFixed(x.odds % 1 ? 2 : 0) + "%</b></div>"; }).join("") + "</div>";
    v.innerHTML = '<div class="vh"><div><h1>Roru Day scratch card</h1><p class="sub">On Roru Day, when the guest who paid scans a receipt of ' + money(d.min_bill) + ' or more, the system gives them one card by itself and picks the prize. Staff don\'t decide; if a scan fails, a manager can give one with their PIN and a reason.</p></div><button class="obtn" id="scEdit">Change prizes &amp; rules</button></div>' +
      '<div class="sc-banner">' + pic("handroll", "sc-bn-ic") + "<span>" + (t.real ? "<b>Today is Roru Day</b> · Set " + esc(cur ? cur.key + " " + cur.en : "") : nx ? "<b>Next Roru Day: " + fmtD(nx.day, false, true) + "</b> · Set " + esc((d.sets.find(s => s.id === nx.set_id) || {}).key || "") + " " + esc((d.sets.find(s => s.id === nx.set_id) || {}).en || "") : "<b>No Roru Day set.</b> Add one under Change prizes &amp; rules.") +
        (d.env !== "live" && d.test_any_day ? '<small>Preview only: receipts from any day get cards so you can try it. On the live app only Roru Day receipts do.</small>' : "") + "</span></div>" +
      '<div class="pp-okpis" id="scOwnerKpis">' + kp + "</div>" +
      '<div class="pp-ocols sc-cols"><div class="pp-ocard"><h2>Prizes won by type</h2><p class="pp-osub">What the cards actually gave, next to the planned odds.</p>' + tierBar("common", "Common") + tierBar("mid", "Mid") + tierBar("rare", "Rare") +
        '<h2 style="margin-top:18px">By prize</h2>' + (won.length ? won.map(prow).join("") : '<p class="pp-osub">Nothing won yet.</p>') + "</div>" +
        '<div class="pp-ocard"><h2>Rules</h2>' +
          '<div class="pp-orow"><span>Minimum bill</span><b>' + money(d.min_bill) + "</b></div>" +
          '<div class="pp-orow"><span>How a card is given</span><b>By itself, when the receipt is scanned</b></div>' +
          '<div class="pp-orow"><span>Cards per bill</span><b>1, for the person who paid · 1 per guest a night</b></div>' +
          '<div class="pp-orow"><span>Prize valid for</span><b>' + d.valid_days + " days, Mon–Wed</b></div>" +
          '<div class="pp-orow"><span>Free first drink</span><b>Any drink except draft sake</b></div>' +
          '<div class="pp-orow"><span>Gold receipt</span><b>1 in 20 · 2x points + a free drink</b></div>' +
          srcHtml() +
          '<h2 style="margin-top:18px">Roru Days</h2><p class="pp-osub">One a month, Mon to Wed. Each uses one prize set.</p>' + (dayRows || '<p class="pp-osub">None yet.</p>') + "</div></div>" +
      '<details class="pp-ocard pp-oall"><summary>Prize sets and odds</summary><div class="sc-sets">' + d.sets.map(setCard).join("") + "</div></details>" +
      '<p class="pp-osub" style="margin-top:10px">Costs are ingredient cost from the October cost sheet. +88 points and the extra visit stamp cost nothing on the night and go onto the guest\'s card by themselves. Guests never see the odds.</p>';
    $("#scEdit").onclick = ownerEdit;
  }
  function srcHtml() {
    const s = O.src; if (!s) return "";
    const fb = (s.recent_fallbacks || []).map(x => '<div class="pp-orow sc-fbrow"><span>' + fmtD(x.day, false) + " · bill " + esc(x.bill_ref || "") + " · " + money(x.bill_hkd) + "<small>" + esc(x.reason || "") + " · " + esc(x.staff || "") + ", OK " + esc(x.manager || "") + "</small></span><b>by hand</b></div>").join("");
    return '<h2 style="margin-top:18px">Where cards came from</h2>' +
      '<div class="pp-orow"><span>📸 Receipt scan (automatic)</span><b>' + s.scan + "</b></div>" +
      '<div class="pp-orow"><span>🔑 By hand, manager OK (scan failed)</span><b>' + s.fallback + "</b></div>" +
      (s.staff ? '<div class="pp-orow"><span>Given by staff before the scan check (preview tests)</span><b>' + s.staff + "</b></div>" : "") + fb;
  }
  function ownerEdit() {
    const d = O.data, P = {}; d.prizes.forEach(p => P[p.id] = p);
    const sets = JSON.parse(JSON.stringify(d.sets)); let cur = 0;
    const d0 = d.hk_today || "";
    const days = d.days.filter(x => x.day >= d0).map(x => ({ day: x.day, set_id: x.set_id }));
    const TG = { common: "Common · about 70% together", mid: "Mid · about 25% together", rare: "Rare · about 5%" };
    const opt = (sel) => ["common", "mid", "rare"].map(tr => '<optgroup label="' + TG[tr] + '">' + d.prizes.filter(p => p.tier === tr).map(p => '<option value="' + p.id + '"' + (p.id === sel ? " selected" : "") + ">" + esc(p.en) + "</option>").join("") + "</optgroup>").join("");
    const setOpt = (sel) => d.sets.map(s => '<option value="' + s.id + '"' + (s.id === sel ? " selected" : "") + ">Set " + esc(s.key) + " · " + esc(s.en) + "</option>").join("");
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Back">‹</button><div><h2>Scratch card: prizes &amp; rules</h2><small>Guests never see the odds</small></div></div>' +
      '<div class="pp-ofields"><label class="fl"><span>Minimum bill (HK$)</span><input class="fin" id="scMin" type="number" min="50" step="1" value="' + Math.round(d.min_bill) + '"><em>One card per bill at or above this</em></label><span></span></div>' +
      '<h3>Roru Days</h3><p class="pp-rule">Pick a Monday, Tuesday or Wednesday each month, and the prize set for that night.</p><div id="scDays"></div><button class="obtn ghost" id="scAddDay" type="button">+ Add a Roru Day</button>' +
      '<h3>Prize sets</h3><p class="pp-rule">Each set\'s odds must add up to exactly 100%. The plan: 70% common, 25% mid, 5% rare.</p>' +
      '<div class="sc-tabs" id="scTabs"></div><div id="scRows"></div><div class="sc-sumrow"><button class="obtn ghost" id="scAddP" type="button">+ Add a prize</button><span id="scSum"></span></div>' +
      '<details class="sc-wording"><summary>Prize wording &amp; cost</summary><p class="pp-rule">What the card says when it\'s scratched, and the ingredient cost used for the estimate.</p><div id="scWord"></div></details>' +
      '<div id="scEErr" class="pp-err hide"></div><div class="pp-sh-f"><button class="obtn ghost" data-x type="button">Cancel</button><span class="sc-sumall" id="scSumAll"></span><button class="obtn" id="scSave" type="button">Save</button></div>', "sc-edit");
    const sumOf = (s) => Math.round(s.prizes.reduce((a, x) => a + (+x.odds || 0), 0) * 100) / 100;
    const paintDays = () => { $("#scDays", ov).innerHTML = days.map((x, i) => { const p = ymd(x.day), ok = p && [1, 2, 3].includes(dow(p));
      return '<div class="sc-drow" data-i="' + i + '"><input class="fin" type="date" name="day" value="' + x.day + '"><select class="fin" name="set">' + setOpt(x.set_id) + '</select><button class="pp-trm sc-rm" type="button" aria-label="Remove">✕</button><em class="' + (ok ? "" : "bad") + '">' + (p ? (ok ? DOW[dow(p)] + " ✓" : DOW[dow(p)] + ": pick Mon–Wed") : "") + "</em></div>"; }).join("") || '<p class="pp-rule">No Roru Days yet.</p>'; };
    const paintTabs = () => { $("#scTabs", ov).innerHTML = sets.map((s, i) => { const sm = sumOf(s); return '<button type="button" class="sc-tab' + (i === cur ? " on" : "") + '" data-tab="' + i + '">Set ' + esc(s.key) + ' <small class="' + (Math.abs(sm - 100) < .001 ? "ok" : "bad") + '">' + sm + "%</small></button>"; }).join(""); };
    const paintRows = () => { const s = sets[cur]; $("#scRows", ov).innerHTML = s.prizes.map((x, i) => '<div class="sc-prow" data-i="' + i + '"><select class="fin" name="pz">' + opt(x.prize_id) + '</select><span class="sc-ptier">' + ((P[x.prize_id] || {}).tier || "") + '</span><label class="sc-odds"><input class="fin" name="odds" type="number" min="0.01" max="100" step="0.01" value="' + x.odds + '"><span>%</span></label><button class="pp-trm sc-rm" type="button" aria-label="Remove">✕</button></div>').join(""); paintSum(); };
    const paintSum = () => { const s = sets[cur], sm = sumOf(s), ok = Math.abs(sm - 100) < .001; const el = $("#scSum", ov); el.className = "sc-sum " + (ok ? "ok" : "bad"); el.textContent = ok ? "Set " + s.key + " adds up to 100% ✓" : "Set " + s.key + " adds up to " + sm + "%: " + (sm < 100 ? "add " + Math.round((100 - sm) * 100) / 100 + "%" : "take off " + Math.round((sm - 100) * 100) / 100 + "%");
      const all = sets.every(x => Math.abs(sumOf(x) - 100) < .001); $("#scSave", ov).disabled = !all; $("#scSumAll", ov).textContent = all ? "" : "Every set must add up to 100%"; paintTabs(); };
    const paintWord = () => { $("#scWord", ov).innerHTML = d.prizes.map(p => '<details class="sc-wp" data-id="' + p.id + '"><summary><span class="sc-oic">' + prizeIcon(p) + "</span>" + esc(p.en) + ' <small>' + p.tier + " · " + money1(p.cost) + "</small></summary>" +
      '<div class="pp-ofields"><label class="fl"><span>Name (English)</span><input class="fin" name="ne" value="' + esc(p.en) + '"></label><label class="fl"><span>Name (繁中)</span><input class="fin" name="nz" value="' + esc(p.zh) + '"></label>' +
      '<label class="fl"><span>Card line (English)</span><input class="fin" name="le" value="' + esc(p.line_en) + '"></label><label class="fl"><span>Card line (繁中)</span><input class="fin" name="lz" value="' + esc(p.line_zh) + '"></label>' +
      '<label class="fl"><span>Cost to us (HK$)</span><input class="fin" name="co" type="number" min="0" step="0.1" value="' + p.cost + '"></label><span></span></div><button class="obtn ghost" type="button" data-savep="' + p.id + '">Save this prize</button></details>').join(""); };
    paintDays(); paintRows(); paintWord();
    ov.addEventListener("input", (e) => {
      const pr = e.target.closest(".sc-prow"); if (pr) { const x = sets[cur].prizes[+pr.dataset.i]; if (e.target.name === "odds") x.odds = +e.target.value; if (e.target.name === "pz") { x.prize_id = +e.target.value; pr.querySelector(".sc-ptier").textContent = (P[x.prize_id] || {}).tier || ""; } paintSum(); return; }
      const dr = e.target.closest(".sc-drow"); if (dr) { const x = days[+dr.dataset.i]; if (e.target.name === "day") { x.day = e.target.value; paintDays(); } if (e.target.name === "set") x.set_id = +e.target.value; }
    });
    ov.addEventListener("change", (e) => { const pr = e.target.closest(".sc-prow"); if (pr && e.target.name === "pz") sets[cur].prizes[+pr.dataset.i].prize_id = +e.target.value; });
    ov.addEventListener("click", async (e) => {
      if (e.target.closest("[data-x]") || e.target === ov) { ov.remove(); return; }
      const tb = e.target.closest(".sc-tab"); if (tb) { cur = +tb.dataset.tab; paintRows(); return; }
      if (e.target.closest(".sc-prow .sc-rm")) { sets[cur].prizes.splice(+e.target.closest(".sc-prow").dataset.i, 1); paintRows(); return; }
      if (e.target.closest(".sc-drow .sc-rm")) { days.splice(+e.target.closest(".sc-drow").dataset.i, 1); paintDays(); return; }
      if (e.target.closest("#scAddP")) { const used = sets[cur].prizes.map(x => x.prize_id), nx = d.prizes.find(p => !used.includes(p.id)); if (!nx) return R.toast("All 15 prizes are already in this set"); sets[cur].prizes.push({ prize_id: nx.id, odds: 0 }); paintRows(); return; }
      if (e.target.closest("#scAddDay")) { days.push({ day: "", set_id: d.sets[days.length % d.sets.length].id }); paintDays(); return; }
      const sp = e.target.closest("[data-savep]"); if (sp) { const w = sp.closest(".sc-wp"), g = (n) => w.querySelector('[name="' + n + '"]').value;
        try { O.data = await R.rpc("owner_save_scratch_prize", { p_token: otok(), p_id: +sp.dataset.savep, p_name_en: g("ne"), p_name_zh: g("nz"), p_line_en: g("le"), p_line_zh: g("lz"), p_cost: +g("co") }); ownerRender(); R.toast("Prize saved ✓"); }
        catch (x) { R.toast(x.code === "scratch_bad_prize" ? "A prize needs a name, a card line and a cost." : errTxt(x), 3500); } return; }
      if (e.target.closest("#scSave")) {
        const er = $("#scEErr", ov); er.classList.add("hide");
        const msg = { scratch_bad_min: "The minimum bill must be between HK$50 and HK$10,000.", scratch_bad_odds: "Each set needs its odds to add up to exactly 100%, with no prize listed twice.", scratch_bad_day: "Each Roru Day must be a Monday, Tuesday or Wednesday, with no date listed twice." };
        try { O.data = await R.rpc("owner_save_scratch", { p_token: otok(), p_min_bill: +$("#scMin", ov).value, p_sets: sets.map(s => ({ id: s.id, prizes: s.prizes.map(x => ({ prize_id: x.prize_id, odds: +x.odds })) })), p_days: days.filter(x => x.day) });
          ov.remove(); ownerRender(); R.toast("Saved ✓ The next card uses it"); }
        catch (x) { er.textContent = msg[x.code || x.message] || errTxt(x); er.classList.remove("hide"); }
      }
    });
  }
  function ownerInit() {
    const v = $("#v-scratch"); if (!v) return;
    new MutationObserver(() => { if (v.classList.contains("on")) ownerLoad(); }).observe(v, { attributes: true, attributeFilter: ["class"] });
  }

  const init = () => { guestInit(); staffInit(); ownerInit(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.RORU_SC = { guestLoad, staffLoad, ownerLoad, afterReceipt, scanWin, open: scratchOpen, sample: () => staffHtml };
})();
