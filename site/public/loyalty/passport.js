/* RORUBARU · Menu Passport (f29): guest passport tab, staff "Stamp passport" + prize mark-used, owner Passport section.
   27 food stamps a season; prizes at the owner's counts; receipt lines stamp automatically on the server, staff tap is the fallback. */
(function () {
  const R = window.RORU; if (!R) return;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const zh = () => (R.lang ? R.lang() : "en") === "zh";
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ymd = (s) => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? [+m[1], +m[2], +m[3]] : null; };
  const hkDate = (iso) => { if (!iso) return null; const d = new Date(new Date(iso).getTime() + 8 * 3600e3); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };
  const fmtD = (p, z, short) => p ? (z ? (short ? "" : p[0] + "年") + p[1] + "月" + p[2] + "日" : p[2] + " " + MON[p[1] - 1] + (short ? "" : " " + p[0])) : "";
  const IMG = "/loyalty/img/";
  const ROLL = '<img class="pp-roll" src="' + IMG + 'handroll_64.png" srcset="' + IMG + 'handroll_64.png 1x, ' + IMG + 'handroll_128.png 2x" alt="">';
  const BOWL = '<svg class="pp-svg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15.5h24c0 6.4-5.4 11.5-12 11.5S4 21.9 4 15.5z"/><path d="M11 27.5h10"/><path d="M11 10.5c0-1.6 1.6-1.6 1.6-3.2S11 5.7 11 4.2M16 10.5c0-1.6 1.6-1.6 1.6-3.2S16 5.7 16 4.2M21 10.5c0-1.6 1.6-1.6 1.6-3.2S21 5.7 21 4.2"/></svg>';
  const SWEET = '<svg class="pp-svg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 15.5a6.5 6.5 0 0 1 13 0"/><path d="M7 15.5h18l-2.4 11.5H9.4z"/><path d="M13 9.6c1-1.8 3-2.3 4.6-1.4"/></svg>';
  const icon = (g) => g === "roll" ? ROLL : g === "dessert" ? SWEET : BOWL;
  const CARD = '<img class="pp-card-ic" src="' + IMG + 'stampcard_64.png" srcset="' + IMG + 'stampcard_64.png 1x, ' + IMG + 'stampcard_128.png 2x" alt="">';
  const GRP = { roll: ["Hand rolls", "手卷"], app: ["Appetisers", "前菜"], dessert: ["Desserts", "甜品"] };
  const W = (en, z) => zh() ? z : en;
  const tierFor = (p) => (p.tiers || []).find(t => p.count < t.n) || null;

  // ---------- progress track (shared) ----------
  function track(p) {
    const pct = (n) => Math.max(0, Math.min(100, n / Math.max(1, p.total) * 100));
    return '<div class="pp-track"><div class="pp-fill" style="width:' + pct(p.count) + '%"></div>' +
      (p.tiers || []).map(t => '<i class="pp-mk' + (p.count >= t.n ? " on" : "") + '" style="left:' + pct(t.n) + '%"><span>' + t.n + "</span></i>").join("") + "</div>";
  }
  function seasonLine(p, z) {
    const s = p.season || {}, end = fmtD(ymd(s.ends_on), z), start = fmtD(ymd(s.starts_on), z), nm = z ? (s.name_zh || s.name_en) : s.name_en;
    if (s.status === "upcoming") return nm + (z ? " · " + start + "開始" : " · starts " + start);
    if (s.status === "ended") return nm + (z ? " · 已於" + end + "完結" : " · ended " + end);
    return nm + (z ? " · 截至" + end : " · ends " + end);
  }
  function nextLine(p, z) {
    const nx = tierFor(p);
    if (!nx) return z ? "全部 " + p.total + " 款都試齊！你係 Roru Master。" : "All " + p.total + " tried. You're a Roru Master.";
    const left = nx.n - p.count;
    return z ? "再集 " + left + " 個印花：" + esc(nx.zh || nx.en) : left + " more stamp" + (left === 1 ? "" : "s") + " to: " + esc(nx.en);
  }

  // ---------- GUEST ----------
  const G = { data: null, at: 0, busy: false, seen: null };
  function guestToken() { try { return localStorage.getItem("roru_member_token"); } catch (e) { return null; } }
  async function guestLoad(force) {
    const tk = guestToken(); if (!tk || G.busy) return; if (!force && Date.now() - G.at < 12000) return;
    G.busy = true;
    try { const p = await R.rpc("family_passport", { p_token: tk }); G.at = Date.now(); const prev = G.data; G.data = p; guestRender(prev); } catch (e) {} finally { G.busy = false; }
  }
  function guestRender(prev) {
    const p = G.data, sec = $("#ppSec"), tz = $("#ppTeaser"), btn = $('#tabBar [data-tab="passport"]');
    if (!sec || !tz) return;
    const on = p && p.on; if (btn) { btn.classList.toggle("hide", !on); const lb = btn.querySelector(".pp-tablbl"); if (lb) lb.textContent = zh() ? "護照" : "Passport"; } const tb = $("#tabBar"); if (tb) tb.classList.toggle("pp5", !!on); tz.classList.toggle("hide", !on);
    if (!on) { sec.innerHTML = ""; return; }
    const z = zh();
    // new stamps since this phone last looked → thump them in + a toast
    let fresh = [];
    try { const key = "roru_pp_seen_" + (p.season && p.season.id); const seen = JSON.parse(localStorage.getItem(key) || "null");
      const now = p.items.filter(x => x.sid).map(x => x.id);
      if (seen) fresh = now.filter(x => !seen.includes(x));
      localStorage.setItem(key, JSON.stringify(now));
      if (fresh.length && prev) R.toast(z ? "護照新增 " + fresh.length + " 個印花" : "+" + fresh.length + " passport stamp" + (fresh.length === 1 ? "" : "s"), 3500);
    } catch (e) {}
    const nx = tierFor(p);
    tz.innerHTML = '<button type="button" class="pp-teaser" id="ppGo">' + CARD + '<span class="pp-tz-t"><b>' + W("Menu Passport", "菜單護照") + ' <em>' + p.count + "/" + p.total + "</em></b>" +
      '<span class="pp-tz-bar"><span style="width:' + (p.count / Math.max(1, p.total) * 100) + '%"></span></span><small>' + (nx ? nextLine(p, z) : nextLine(p, z)) + "</small></span><span class=\"pp-tz-go\">›</span></button>";
    $("#ppGo").onclick = () => { const b = $('#tabBar [data-tab="passport"]'); if (b) b.click(); };
    const prizes = (p.tiers || []).map(t => {
      const st = t.used_at ? "used" : t.reached ? "ready" : "lock", left = t.n - p.count;
      const right = st === "used" ? '<span class="pp-pz-s used">' + W("Enjoyed ✓ ", "已享用 ✓ ") + fmtD(hkDate(t.used_at), z, true) + "</span>"
        : st === "ready" ? '<span class="pp-pz-s ready">' + W("Ready! Show staff", "可以換！俾店員睇") + "</span>"
        : '<span class="pp-pz-s">' + W(left + " to go", "仲差 " + left + " 個") + "</span>";
      const art = t.n >= p.total ? CARD : t.n >= 10 ? ROLL : SWEET;
      return '<div class="pp-pz ' + st + '"><div class="pp-pz-n"><b>' + t.n + "</b><small>" + W("stamps", "印花") + '</small></div><div class="pp-pz-art">' + art + '</div><div class="pp-pz-t"><b>' + esc(z ? (t.zh || t.en) : t.en) + "</b>" + (z ? "<small>" + esc(t.en) + "</small>" : (t.zh ? "<small>" + esc(t.zh) + "</small>" : "")) + "</div>" + right + "</div>";
    }).join("");
    const groups = ["roll", "app", "dessert"].map(g => {
      const its = p.items.filter(x => x.grp === g); if (!its.length) return "";
      const got = its.filter(x => x.sid).length;
      return '<div class="pp-gh"><h2>' + W(GRP[g][0], GRP[g][1]) + " <span>" + W(GRP[g][1], GRP[g][0]) + "</span></h2><b>" + got + "/" + its.length + "</b></div>" +
        '<div class="pp-grid">' + its.map(x => {
          const onx = !!x.sid, nw = fresh.includes(x.id);
          return '<div class="pp-cell ' + (onx ? "on" : "off") + (nw ? " new" : "") + '" data-g="' + g + '"><div class="pp-ic">' + icon(g) + "</div>" +
            '<div class="pp-nm">' + esc(z ? x.zh : x.en) + '</div><div class="pp-zh">' + esc(z ? x.en : x.zh) + "</div>" +
            (onx ? '<div class="pp-stamp"><span>✓</span><em>' + fmtD(hkDate(x.at), z, true) + "</em></div>" : "") + "</div>";
        }).join("") + "</div>";
    }).join("");
    const how = z ? ["掃描收據：每款付咗錢嘅食物蓋一個印花（每張單每款一次）。", "每張單最多 " + p.max_per_bill + " 個新印花。", "只有埋單嗰位有印花，同枱朋友冇。", "免費嘢食、獎賞同飲品都唔計。套餐會蓋入面嘅手卷。", "收據讀唔到？埋單時叫店員幫你蓋。", "一季三個月，季尾重新開始。"]
      : ["Scan your receipt: every food item you paid for gets a stamp (once per item per bill).", "Up to " + p.max_per_bill + " new stamps a bill.", "Only the person who paid gets stamps, not the rest of the table.", "Free items, rewards and drinks don't count. A roll set stamps the rolls in it.", "Receipt won't read? Ask staff to stamp it when you pay.", "A season runs 3 months, then the passport starts fresh."];
    sec.innerHTML = '<div class="pp-hero"><div class="pp-top">' + CARD + '<div><div class="pp-k">' + W("Menu Passport", "菜單護照") + " · " + W("菜單護照", "Menu Passport") + '</div><div class="pp-season">' + esc(seasonLine(p, z)) + "</div></div></div>" +
      '<div class="pp-count"><b>' + p.count + "</b><span>/" + p.total + '</span></div><div class="pp-sub">' + W("dishes tried this season", "今季試過嘅菜式") + "</div>" + track(p) +
      '<div class="pp-next">' + nextLine(p, z) + "</div>" + (p.season && p.season.status !== "live" ? '<div class="pp-off">' + W("Stamps are paused outside the season dates.", "季度以外暫停蓋印花。") + "</div>" : "") + "</div>" +
      '<div class="card pp-prizes"><h2>' + W("Prizes", "獎品") + "</h2>" + prizes + "</div>" + groups +
      '<div class="card pp-how"><h2>' + W("How stamps work", "點樣蓋印花") + "</h2><ul>" + how.map(h => "<li>" + esc(h) + "</li>").join("") + "</ul></div>";
  }
  function guestInit() {
    if (!$("#ppSec")) return;
    guestLoad(true);
    setInterval(() => { if (document.visibilityState === "visible") guestLoad(false); }, 4000);
    document.addEventListener("roru:lang", () => guestRender(null));
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") guestLoad(true); });
    const done = $("#scanDone"); if (done) new MutationObserver(() => { if (!done.classList.contains("hide")) { setTimeout(() => guestLoad(true), 900); setTimeout(() => guestLoad(true), 3500); } }).observe(done, { attributes: true, childList: true });
    const mem = $("#member"); if (mem) new MutationObserver(() => { if (!mem.classList.contains("hide") && !G.data) guestLoad(true); if (mem.classList.contains("hide")) { G.data = null; } }).observe(mem, { attributes: true, attributeFilter: ["class"] });
  }

  // ---------- STAFF ----------
  const S = { code: null, data: null, at: 0, busy: false, last: [] };
  const ERR = {
    passport_bill_cap: "This bill already has the most new stamps it can get. Next visit!",
    passport_not_payer: "That bill number belongs to another member. Only the person who paid gets stamps.",
    passport_no_season: "No passport season is running today.", passport_off: "The passport is switched off.",
    passport_nothing_picked: "Pick at least one item.", passport_not_reached: "Not enough stamps for that prize yet.",
    perk_used_up: "Already used this season.", manager_only: "After 15 minutes only a manager or the owner can undo this.",
    reason_required: "Please type a short reason.", already_undone: "Already undone.", owner_only: "Owner only."
  };
  const ERRZ = { passport_bill_cap: "呢張單已經蓋滿新印花，下次再嚟！", passport_not_payer: "呢個單號屬於另一位會員，只有埋單嗰位有印花。", passport_no_season: "今日冇護照季度。", passport_off: "護照已關閉。",
    passport_nothing_picked: "最少揀一樣。", passport_not_reached: "印花未夠換呢個獎品。", perk_used_up: "今季已經用咗。", manager_only: "過咗時限，只有經理或者老闆可以復原。", reason_required: "請寫低簡單原因。", already_undone: "已經復原咗。", owner_only: "只限老闆。" };
  const errTxt = (e) => (zh() && ERRZ[e && (e.code || e.message)]) || ERR[e && (e.code || e.message)] || (R.errText ? R.errText(e) : String(e && e.message || e));
  const sess = () => window.__ppSess && window.__ppSess.token;
  async function staffLoad(force) {
    const c = window.__ppCard; if (!c || !c.member_code || !sess()) return;
    if (!force && S.code === c.member_code && Date.now() - S.at < 20000) { staffPaint(); return; }
    if (S.busy) return; S.busy = true;
    try { S.data = await R.rpc("staff_passport", { p_token: sess(), p_who: c.member_code }); S.code = c.member_code; S.at = Date.now(); } catch (e) { S.data = null; } finally { S.busy = false; }
    staffPaint();
  }
  function staffPaint() {
    const box = $("#gcard"); if (!box || !box.firstChild) return;
    let el = $(".pp-st", box); const p = S.data;
    if (!p || !p.on || S.code !== (window.__ppCard || {}).member_code) { if (el) el.remove(); return; }
    const html = staffHtml(p);
    if (!el) { el = document.createElement("div"); el.className = "pp-st"; const after = $(".gperks", box); if (after) after.after(el); else box.appendChild(el); }
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  function staffHtml(p) {
    const nx = tierFor(p), live = p.season && p.season.status === "live";
    const rows = (p.tiers || []).filter(t => t.reached).map(t => '<div class="pp-st-pz' + (t.used_at ? " used" : "") + '"><span><b>' + t.n + W(" stamps:", " 個印花：") + "</b> " + esc(zh() ? (t.zh || t.en) : t.en) + (t.used_at ? ' <em>· ' + W("used ", "已用 ") + fmtD(hkDate(t.used_at), zh(), true) + "</em>" : "") + "</span>" +
      (t.used_at ? '<button class="btn ghost sm" data-ppzundo="' + t.prize_id + '">↩︎ ' + W("Undo", "復原") + "</button>" : '<button class="btn sm" data-ppzuse="' + t.n + '">' + W("Mark used", "標記已用") + "</button>") + "</div>").join("");
    return '<div class="pp-st-h">' + CARD + '<div class="pp-st-t"><b>' + W("Passport ", "護照 ") + p.count + "/" + p.total + "</b><small>" + (nx ? W((nx.n - p.count) + " more to the " + nx.n + "-stamp prize", "再集 " + (nx.n - p.count) + " 個就換 " + nx.n + " 個印花獎品") : W("Finished all " + p.total, "全部 " + p.total + " 款集齊")) + "</small></div>" +
      (live ? '<button class="btn sm" data-ppstamp>' + W("Stamp passport", "蓋護照印花") + "</button>" : "") + "</div>" + rows;
  }
  function sheet(html) {
    const ov = document.createElement("div"); ov.className = "pp-ov"; ov.innerHTML = '<div class="pp-sh">' + html + "</div>"; document.body.appendChild(ov); return ov;
  }
  function stampSheet() {
    const p = S.data, c = window.__ppCard || {}; if (!p) return;
    const pick = new Set(), max = p.max_per_bill || 5;
    const nm = /\p{L}/u.test(c.name || "") ? c.name : W("this guest", "呢位客人");
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Close">‹</button><div><h2>' + W("Stamp passport", "蓋護照印花") + '</h2><small>' + esc(nm) + " · " + W(p.count + "/" + p.total + " stamped", "已蓋 " + p.count + "/" + p.total) + "</small></div></div>" +
      '<p class="pp-rule">' + W('Tick the food on <b>this guest\'s bill</b>. Only the person who paid. Max <b>' + max + '</b> new stamps a bill. Free items, rewards and drinks don\'t count.', '剔返<b>呢位客人張單</b>上面嘅食物。只限埋單嗰位。每張單最多 <b>' + max + '</b> 個新印花。免費嘢食、獎賞同飲品唔計。') + '</p>' +
      '<label class="pp-bill"><span>' + W("Bill no. (optional)", "單號（可以留空）") + '</span><input id="ppBill" autocomplete="off" autocapitalize="characters" placeholder="e.g. A-001238"></label>' +
      ["roll", "app", "dessert"].map(g => '<h3>' + W(GRP[g][0] + " · " + GRP[g][1], GRP[g][1] + " · " + GRP[g][0]) + '</h3><div class="pp-pick">' + p.items.filter(x => x.grp === g).map(x =>
        '<button type="button" class="pp-pk' + (x.sid ? " done" : "") + '" data-id="' + x.id + '"' + (x.sid ? " disabled" : "") + '><span class="pp-pk-ic">' + icon(g) + '</span><span class="pp-pk-t"><b>' + esc(zh() ? x.zh : x.en) + "</b><small>" + esc(zh() ? x.en : x.zh) + "</small></span><i>" + (x.sid ? "✓" : "") + "</i></button>").join("") + "</div>").join("") +
      '<div class="pp-sh-f"><span id="ppPicked">' + W("0 of " + max + " picked", "已揀 0/" + max) + '</span><button class="btn" id="ppGo" disabled>' + W("Stamp", "蓋印") + '</button></div><div id="ppErr" class="pp-err hide"></div>');
    const upd = () => { $("#ppPicked", ov).textContent = W(pick.size + " of " + max + " picked", "已揀 " + pick.size + "/" + max); const b = $("#ppGo", ov); b.disabled = !pick.size; b.textContent = pick.size ? W("Stamp " + pick.size + " item" + (pick.size === 1 ? "" : "s"), "蓋 " + pick.size + " 個印") : W("Stamp", "蓋印"); };
    ov.addEventListener("click", async (e) => {
      if (e.target.closest("[data-x]") || e.target === ov) { ov.remove(); return; }
      const k = e.target.closest(".pp-pk"); if (k && !k.disabled) { const id = +k.dataset.id; if (pick.has(id)) pick.delete(id); else { if (pick.size >= max) { R.toast(W("Max " + max + " new stamps a bill", "每張單最多 " + max + " 個新印花")); return; } pick.add(id); } k.classList.toggle("sel", pick.has(id)); k.querySelector("i").textContent = pick.has(id) ? "✓" : ""; upd(); return; }
      if (e.target.closest("#ppGo")) {
        const b = $("#ppGo", ov); b.disabled = true; $("#ppErr", ov).classList.add("hide");
        try {
          const r = await R.rpc("staff_passport_stamp", { p_token: sess(), p_who: c.member_code, p_items: [...pick], p_bill: $("#ppBill", ov).value || null });
          S.data = Object.assign(r.passport, { undo_minutes: p.undo_minutes, role: p.role }); S.at = Date.now();
          const added = S.data.items.filter(x => (r.stamp_ids || []).includes(x.sid));
          S.last = added.map(x => ({ sid: x.sid, en: x.en, zh: x.zh }));
          ov.remove(); staffPaint(); doneSheet(r, added);
        } catch (er) { const m = $("#ppErr", ov); m.textContent = errTxt(er); m.classList.remove("hide"); b.disabled = false; }
      }
    });
  }
  function doneSheet(r, added) {
    const p = S.data;
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Close">‹</button><div><h2>' + (r.added ? W(r.added + " stamp" + (r.added === 1 ? "" : "s") + " added ✓", "加咗 " + r.added + " 個印花 ✓") : W("Nothing new to stamp", "冇新嘢要蓋")) + "</h2><small>" + W("Passport now ", "護照而家 ") + p.count + "/" + p.total + "</small></div></div>" +
      (added.length ? '<div class="pp-done">' + added.map(x => '<div class="pp-done-r"><span>' + esc(zh() ? (x.zh || x.en) : x.en) + '</span><button class="btn ghost sm" data-ppunstamp="' + x.sid + '">↩︎ ' + W("Undo", "復原") + '</button></div>').join("") + "</div>" : "") +
      ((r.already || []).length ? '<p class="pp-rule">' + W("Already stamped before: ", "之前已經蓋咗：") + esc(p.items.filter(x => r.already.includes(x.id)).map(x => zh() ? x.zh : x.en).join(", ")) + "</p>" : "") +
      '<p class="pp-rule">' + W('Logged under your PIN. Undo works for ' + (p.undo_minutes || 15) + ' minutes; after that a manager can undo it with a reason.', '已用你嘅 PIN 記錄。' + (p.undo_minutes || 15) + ' 分鐘內可以復原；之後要經理寫低原因先復原到。') + '</p><div class="pp-sh-f"><span></span><button class="btn" data-x>' + W("Done", "完成") + '</button></div>');
    ov.addEventListener("click", (e) => { if (e.target.closest("[data-x]") || e.target === ov) ov.remove(); });
  }
  async function undoCall(fnName, args, btn) {
    btn.disabled = true;
    try { let r; try { r = await R.rpc(fnName, Object.assign({ p_token: sess(), p_reason: null }, args)); }
      catch (e) { if ((e.code || e.message) === "reason_required" || ((e.code || e.message) === "manager_only" && S.data && S.data.role !== "staff")) { const why = prompt(W("Reason for the late undo (manager):", "遲咗復原嘅原因（經理）：")); if (!why) { btn.disabled = false; return; } r = await R.rpc(fnName, Object.assign({ p_token: sess(), p_reason: why }, args)); } else throw e; }
      S.data = Object.assign(r.passport, { undo_minutes: S.data.undo_minutes, role: S.data.role }); S.at = Date.now(); staffPaint(); R.toast(W("Undone ✓", "已復原 ✓")); return true;
    } catch (e) { R.toast(errTxt(e), 3500); btn.disabled = false; return false; }
  }
  function staffInit() {
    const box = $("#gcard"); if (!box) return;
    new MutationObserver(() => { if (window.__ppCard && box.firstChild && !$(".pp-st", box)) { staffPaint(); staffLoad(false); } }).observe(box, { childList: true });
    setInterval(() => { if (box.firstChild && window.__ppCard) staffLoad(false); }, 5000);
    document.addEventListener("click", async (e) => {
      if (e.target.closest("[data-ppstamp]")) { await staffLoad(true); stampSheet(); return; }
      const u = e.target.closest("[data-ppzuse]"); if (u) { u.disabled = true; try { const r = await R.rpc("staff_passport_prize", { p_token: sess(), p_who: window.__ppCard.member_code, p_tier: +u.dataset.ppzuse }); S.data = Object.assign(r.passport, { undo_minutes: S.data.undo_minutes, role: S.data.role }); staffPaint(); R.toast(W("Prize marked used ✓", "獎品已標記使用 ✓")); } catch (er) { R.toast(errTxt(er), 3500); u.disabled = false; } return; }
      const z = e.target.closest("[data-ppzundo]"); if (z) { await undoCall("staff_passport_prize_undo", { p_prize_id: +z.dataset.ppzundo }, z); return; }
      const s = e.target.closest("[data-ppunstamp]"); if (s) { if (await undoCall("staff_passport_unstamp", { p_stamp_id: +s.dataset.ppunstamp }, s)) { s.textContent = W("Undone", "已復原"); s.closest(".pp-done-r").classList.add("undone"); } }
    });
  }

  // ---------- OWNER ----------
  const O = { data: null };
  const otok = () => window.__ppOwner && window.__ppOwner.token;
  async function ownerLoad() {
    const v = $("#v-passport"); if (!v || !otok()) return;
    if (!O.data) v.innerHTML = '<p class="sub" style="padding:20px 0">Loading…</p>';
    try { O.data = await R.rpc("owner_passport", { p_token: otok() }); ownerRender(); } catch (e) { v.innerHTML = '<p class="sub">' + esc(errTxt(e)) + "</p>"; }
  }
  const odate = (s) => fmtD(ymd(s), false);
  function ownerRender() {
    const d = O.data, v = $("#v-passport"); if (!d || !v) return;
    if (!d.on || !d.season) { v.innerHTML = '<div class="vh"><div><h1>Menu Passport</h1><p class="sub">The passport is switched off.</p></div></div>'; return; }
    const s = d.season, pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    const tile = (cls, l, val, sub) => '<div class="kpi pp-kpi ' + cls + '"><div class="lbl">' + l + '</div><div class="val">' + val + '</div><div class="kx">' + sub + "</div></div>";
    const tiers = d.tiers || [];
    const kp = tile("k-or", "Members playing", d.playing, "have 1 or more stamps · out of " + d.members + " members (" + pct(d.playing, d.members) + "%) · higher is better") +
      tiers.map(t => tile(t.n >= d.total ? "k-gold" : "k-gr", (t.n >= d.total ? "Finished all " + t.n : "Reached " + t.n + " stamps"), t.reached, esc(t.en) + " · " + t.used + " claimed so far")).join("") +
      tile("k-bl", "Stamps this week", d.stamps_week, "new dishes members tried in the last 7 days") +
      tile("k-pu", "Average per player", d.avg, "of " + d.total + " dishes · higher means members explore more of the menu");
    const max = Math.max(1, ...d.items.map(i => i.n));
    const bar = (i) => '<div class="pp-ob"><span class="pp-ob-n">' + esc(i.en) + ' <small>' + esc(i.zh || "") + '</small></span><span class="pp-ob-b"><i style="width:' + Math.max(2, i.n / max * 100) + '%"></i></span><b>' + i.n + "</b></div>";
    const most = d.items.slice(0, 5), least = d.items.slice(-5).reverse();
    const statusTxt = s.status === "live" ? "Running · " + s.days_left + " days left" : s.status === "upcoming" ? "Starts " + odate(s.starts_on) : "Ended " + odate(s.ends_on);
    v.innerHTML = '<div class="vh"><div><h1>Menu Passport</h1><p class="sub">Guests collect one stamp for each dish they try. Use it to see who\'s playing and which dishes get ordered least.</p></div><button class="obtn" id="ppEdit">Change season &amp; prizes</button></div>' +
      '<div class="pp-okpis" id="ppOwnerKpis">' + kp + "</div>" +
      '<div class="pp-ocols"><div class="pp-ocard"><h2>Season</h2><p class="pp-osub">The dates stamps count, and what guests win.</p>' +
        '<div class="pp-orow"><span>' + esc(s.name_en) + " · " + esc(s.name_zh || "") + "</span><b>" + statusTxt + "</b></div>" +
        '<div class="pp-orow"><span>Dates</span><b>' + odate(s.starts_on) + " → " + odate(s.ends_on) + "</b></div>" +
        '<div class="pp-orow"><span>New stamps a bill (max)</span><b>' + s.max_per_bill + "</b></div>" +
        tiers.map(t => '<div class="pp-orow"><span>Prize at ' + t.n + " stamps</span><b>" + esc(t.en) + "</b></div>").join("") +
        '<div class="pp-orow"><span>Stamps so far</span><b>' + d.stamps + " (" + (d.by_source.receipt || 0) + " from receipts, " + (d.by_source.staff || 0) + " by staff)</b></div>" +
      '</div><div class="pp-ocard"><h2>Most stamped</h2><p class="pp-osub">Dishes members try the most this season.</p>' + most.map(bar).join("") +
        '<h2 style="margin-top:18px">Least stamped</h2><p class="pp-osub">Dishes members skip. Worth a staff recommendation, a better photo, or a rethink.</p>' + least.map(bar).join("") +
      '</div></div><details class="pp-ocard pp-oall"><summary>All ' + d.total + " dishes, most to least stamped</summary>" + d.items.map(bar).join("") + "</details>" +
      '<p class="pp-osub" style="margin-top:10px">How stamps get ticked: the guest\'s receipt scan reads the food lines (sets stamp their rolls); staff can tick items from the bill on the iPad with "Stamp passport". Only the person who paid, one stamp per dish per bill, max ' + s.max_per_bill + " new stamps a bill, free items never stamp. Prizes are marked used by staff like other benefits, and every stamp, prize and undo is in Staff &amp; PINs → activity.</p>";
    $("#ppEdit").onclick = ownerEdit;
  }
  function ownerEdit() {
    const s = O.data.season, total = O.data.total;
    const trow = (t) => '<div class="pp-trow"><label class="fl"><span>Stamps</span><input class="fin" name="n" type="number" min="1" max="' + total + '" value="' + (t.n || "") + '"></label><label class="fl"><span>Prize (English)</span><input class="fin" name="en" value="' + esc(t.en || "") + '"></label><label class="fl"><span>Prize (繁中)</span><input class="fin" name="zh" value="' + esc(t.zh || "") + '"></label><button class="pp-trm" type="button" aria-label="Remove">✕</button></div>';
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Back">‹</button><div><h2>Season &amp; prizes</h2><small>What guests see on their passport</small></div></div>' +
      '<div class="pp-ofields"><label class="fl"><span>Season name (English)</span><input class="fin" id="pnEn" value="' + esc(s.name_en) + '"><em>e.g. Season 1</em></label>' +
      '<label class="fl"><span>Season name (繁中)</span><input class="fin" id="pnZh" value="' + esc(s.name_zh || "") + '"><em>e.g. 第一季</em></label>' +
      '<label class="fl"><span>First day</span><input class="fin" type="date" id="pS" value="' + s.starts_on + '"></label>' +
      '<label class="fl"><span>Last day</span><input class="fin" type="date" id="pE" value="' + s.ends_on + '"><em>About 3 months after the first day</em></label>' +
      '<label class="fl"><span>Max new stamps a bill</span><input class="fin" type="number" min="1" max="' + total + '" id="pM" value="' + s.max_per_bill + '"><em>' + s.max_per_bill + ' means finishing takes at least ' + Math.ceil(total / s.max_per_bill) + ' visits</em></label></div>' +
      "<h3>Prizes</h3><p class=\"pp-rule\">A guest gets each prize once a season when they reach that many stamps (out of " + total + ').</p><div id="pTiers">' + (s.tiers || []).map(trow).join("") + '</div><button class="obtn ghost" id="pAdd" type="button">+ Add a prize</button>' +
      '<div id="pErr" class="pp-err hide"></div><div class="pp-sh-f"><button class="obtn ghost" data-x type="button">Cancel</button><button class="obtn" id="pSave" type="button">Save</button></div>');
    ov.addEventListener("click", async (e) => {
      if (e.target.closest("[data-x]") || e.target === ov) { ov.remove(); return; }
      if (e.target.closest(".pp-trm")) { e.target.closest(".pp-trow").remove(); return; }
      if (e.target.closest("#pAdd")) { if ($$(".pp-trow", ov).length >= 5) return R.toast("Up to 5 prizes"); $("#pTiers", ov).insertAdjacentHTML("beforeend", trow({})); return; }
      if (e.target.closest("#pSave")) {
        const tiers = $$(".pp-trow", ov).map(r => ({ n: +r.querySelector('[name="n"]').value, en: r.querySelector('[name="en"]').value, zh: r.querySelector('[name="zh"]').value }));
        const msg = { passport_bad_dates: "Check the dates: the last day must be after the first day (and within about a year).", passport_bad_max: "Max new stamps a bill must be between 1 and " + total + ".", passport_bad_tiers: "Each prize needs a stamp count (1 to " + total + ", no repeats) and an English name." };
        try { O.data = await R.rpc("owner_save_passport", { p_token: otok(), p_name_en: $("#pnEn", ov).value, p_name_zh: $("#pnZh", ov).value, p_starts: $("#pS", ov).value, p_ends: $("#pE", ov).value, p_tiers: tiers, p_max: +$("#pM", ov).value });
          ov.remove(); ownerRender(); R.toast("Saved ✓ Guests see it now"); }
        catch (er) { const m = $("#pErr", ov); m.textContent = msg[er.code || er.message] || errTxt(er); m.classList.remove("hide"); }
      }
    });
  }
  function ownerInit() {
    const v = $("#v-passport"); if (!v) return;
    new MutationObserver(() => { if (v.classList.contains("on")) ownerLoad(); }).observe(v, { attributes: true, attributeFilter: ["class"] });
  }

  const init = () => { guestInit(); staffInit(); ownerInit(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.RORU_PP = { guestLoad, staffLoad, ownerLoad };
})();
