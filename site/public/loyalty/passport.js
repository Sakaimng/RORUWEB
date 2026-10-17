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
  const hans = () => !!(R.hans && R.hans());
  // W(en, 繁中, 简中): 简中 is optional; without it the 繁中 text is shown converted to Simplified characters.
  const W = (en, z, s) => zh() ? (s != null && hans() ? s : z) : en;
  const tierFor = (p) => (p.tiers || []).find(t => p.count < t.n) || null;

  // ---------- progress track (shared) ----------
  function track(p) {
    const pct = (n) => Math.max(0, Math.min(100, n / Math.max(1, p.total) * 100));
    return '<div class="pp-track"><div class="pp-fill" style="width:' + pct(p.count) + '%"></div>' +
      (p.tiers || []).map(t => '<i class="pp-mk' + (p.count >= t.n ? " on" : "") + '" style="left:' + pct(t.n) + '%"><span>' + t.n + "</span></i>").join("") + "</div>";
  }
  // f37: calendar quarters (Q1 Jan–Mar · Q2 Apr–Jun · Q3 Jul–Sep · Q4 Oct–Dec); stamps reset when the quarter ends
  const qOf = (s) => { const e = ymd(s && s.ends_on); return e ? Math.floor((e[1] - 1) / 3) + 1 : ""; };
  const daysLeft = (s) => { const e = ymd(s && s.ends_on); if (!e) return 0; const t = hkDate(new Date().toISOString()); return Math.max(0, Math.round((Date.UTC(e[0], e[1] - 1, e[2]) - Date.UTC(t[0], t[1] - 1, t[2])) / 864e5)); };
  const QRULE = () => W("Each passport runs for one quarter (Q1–Q4). Stamps reset when the quarter ends.", "每本護照為期一季（Q1–Q4）。季度完結，印花就會重新計算。", "每本护照为期一个季度（Q1–Q4）。季度结束后，印花清零重新开始。");
  function seasonLine(p, z) {
    const s = p.season || {}, end = fmtD(ymd(s.ends_on), z), start = fmtD(ymd(s.starts_on), z), nm = z ? (s.name_zh || s.name_en) : s.name_en, q = qOf(s);
    if (s.status === "upcoming") return nm + W(" · starts " + start, " · " + start + "開始", " · " + start + "开始");
    if (s.status === "ended") return nm + W(" · ended " + end, " · 已於" + end + "完結", " · 已于" + end + "结束");
    const rng = fmtD(ymd(s.starts_on), z, true) + W(" – ", "至", "至") + fmtD(ymd(s.ends_on), z, true), left = daysLeft(s);
    return nm + " · " + rng + " · " + W(left + (left === 1 ? " day" : " days") + " left in Q" + q, "Q" + q + " 仲有 " + left + " 日", "Q" + q + " 还剩 " + left + " 天");
  }
  function nextLine(p, z) {
    const nx = tierFor(p);
    if (!nx) return z ? "全部 " + p.total + " 款都試齊！你係 Roru Master。" : "All " + p.total + " tried. You're a Roru Master.";
    const left = nx.n - p.count;
    return z ? "再集 " + left + " 個印花：" + esc(nx.zh || nx.en) : left + " more stamp" + (left === 1 ? "" : "s") + " to: " + esc(nx.en);
  }


  // ---------- f36: drinks passport + progress view for both sides ----------
  // Bottles are drawn here (no clip-art): a sake isshobin and a wine bottle, label band in Roru orange.
  const BOT_SAKE = '<svg class="dk-bot" viewBox="0 0 32 48" aria-hidden="true"><path class="dk-glass" d="M13 2h6v7c0 2 4 4.5 4 9v26a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V18c0-4.5 4-7 4-9z"/><rect class="dk-cap" x="12.5" y="1" width="7" height="4" rx="1"/><rect class="dk-lab" x="10.5" y="24" width="11" height="14" rx="1.5"/><path class="dk-ink" d="M16 27v8M13.5 30h5"/></svg>';
  const BOT_WINE = '<svg class="dk-bot" viewBox="0 0 32 48" aria-hidden="true"><path class="dk-glass" d="M13.5 2h5v11c0 1.6 4.5 3 4.5 7v24a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V20c0-4 4.5-5.4 4.5-7z"/><rect class="dk-cap" x="13" y="1" width="6" height="6" rx="1"/><rect class="dk-lab" x="10.5" y="26" width="11" height="11" rx="1.5"/><circle class="dk-ink" cx="16" cy="31.5" r="2.4"/></svg>';
  const botIcon = (cat) => (cat === "sake" || cat === "shochu") ? BOT_SAKE : BOT_WINE;
  const LOCK = '<svg class="pp-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
  const HIGHBALL = '<img class="pp-roll" src="' + IMG + 'highball_64.png" srcset="' + IMG + 'highball_64.png 1x, ' + IMG + 'highball_128.png 2x" alt="">';
  const SAKE_IMG = '<img class="pp-roll" src="' + IMG + 'sake_64.png" srcset="' + IMG + 'sake_64.png 1x, ' + IMG + 'sake_128.png 2x" alt="">';
  const DCAT = { sake: ["Sake", "清酒", "清酒"], shochu: ["Shochu", "燒酎", "烧酎"], white: ["White wine", "白酒", "白葡萄酒"], red: ["Red wine", "紅酒", "红葡萄酒"], rose: ["Rosé", "玫瑰紅酒", "桃红葡萄酒"], sparkling: ["Sparkling", "氣泡酒", "起泡酒"], whisky: ["Whisky", "威士忌", "威士忌"], other: ["More bottles", "其他酒", "其他酒款"] };
  const DBADGE = { sake: ["Sake sensei", "清酒達人", "清酒达人"], shochu: ["Shochu shogun", "燒酎將軍", "烧酎将军"], white: ["White wine whisperer", "白酒知音", "白葡萄酒知音"], red: ["Red all over", "紅酒迷", "红葡萄酒迷"], rose: ["Pink drink pro", "玫瑰紅酒迷", "桃红葡萄酒迷"], sparkling: ["Bubble boss", "氣泡王", "起泡酒王"], whisky: ["Whisky wise", "威士忌通", "威士忌通"], other: ["Bottle hunter", "尋酒高手", "寻酒高手"] };
  const CL = (lb) => W(lb[0], lb[1], lb[2]);   // a category / badge label in the current language
  const FBADGE = { roll: ["Roll royalty", "手卷之王"], app: ["Starter pack", "前菜全制霸"], dessert: ["Sweet tooth", "甜品控"] };
  // a badge: earned = every item of the group tried; otherwise how far along
  const badge = (title, sub, got, of, art) => '<div class="pp-badge' + (got >= of && of ? " on" : "") + '"><span class="pp-badge-ic">' + art + (got >= of && of ? '<i>✓</i>' : "") + '</span><span class="pp-badge-t"><b>' + esc(title) + "</b><small>" + esc(sub) + "</small></span>" +
    (got >= of && of ? "" : '<em>' + got + "/" + of + "</em>") + "</div>";
  // "X to go" chip: the next milestone, in plain words
  function togo(count, tiers, z, unitEn, unitsEn, unitZh, unitZhs) {
    const nx = (tiers || []).find(t => count < t.n);
    if (!nx) return '<div class="pp-togo done"><b>✓</b><span>' + (z ? "全部獎賞解鎖！" : "Every reward unlocked!") + "</span></div>";
    const left = nx.n - count;
    return '<div class="pp-togo"><b>' + left + "</b><span>" + (z ? (hans() ? (unitZhs || unitZh) + "即可解锁" : unitZh + "就解鎖") : (left === 1 ? unitEn : unitsEn) + " to go") + "<small>" + esc(z ? ((hans() && nx.zhs) || nx.zh || nx.en) : nx.en) + "</small></span></div>";
  }
  // celebrate a reward the guest just reached (once per reward per phone)
  function celebrate(kind, seasonId, tiers, z) {
    try {
      const key = "roru_pp_cele_" + kind + "_" + seasonId, seen = JSON.parse(localStorage.getItem(key) || "null");
      const now = (tiers || []).filter(t => t.reached).map(t => t.n);
      localStorage.setItem(key, JSON.stringify(now));
      if (!seen) return;    // first look on this phone: no party for old news
      const fresh = (tiers || []).filter(t => t.reached && !t.used_at && !seen.includes(t.n));
      if (!fresh.length) return;
      const t = fresh[fresh.length - 1];
      if (R.burst) R.burst(["#F64501", "#E8B84A", "#F6F3E7"]);
      const ov = document.createElement("div"); ov.className = "pp-cele"; ov.setAttribute("role", "dialog");
      ov.innerHTML = '<div class="pp-cele-c"><div class="pp-cele-art">' + (kind === "drinks" ? (t.n >= 10 ? BOT_WINE : t.n >= 6 ? SAKE_IMG : HIGHBALL) : (t.n >= 20 ? CARD : t.n >= 10 ? ROLL : SWEET)) + '</div><div class="pp-cele-k">' + (z ? (hans() ? "已解锁！" : "解鎖咗！") : "Unlocked!") + "</div><h2>" + esc(z ? ((hans() && t.zhs) || t.zh || t.en) : t.en) + "</h2><p>" +
        (kind === "drinks" ? (z ? (hans() ? t.n + " 瓶已达成。结账前出示给店员即可兑换。" : t.n + " 支酒達成。埋單前俾店員睇就換到。") : t.n + " bottles down. Show staff before you pay to claim it.") : (z ? (hans() ? t.n + " 个印花已集齐。出示给店员即可兑换。" : t.n + " 個印花達成。俾店員睇就換到。") : t.n + " stamps collected. Show staff to claim it.")) +
        '</p><button class="btn" type="button" data-x>' + (z ? "正！" : "Nice one") + "</button></div>";
      ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-x]")) ov.remove(); });
      document.body.appendChild(ov);
    } catch (e) {}
  }

  const INFO_BTN = () => '<button type="button" class="pp-info" data-ppinfo aria-label="' + W("How it works", "點樣玩", "怎么玩") + '">i</button>';
  // ---------- GUEST ----------
  const G = { data: null, drinks: null, at: 0, busy: false, seen: null, mode: (function () { try { return localStorage.getItem("roru_pp_mode") === "drinks" ? "drinks" : "food"; } catch (e) { return "food"; } })() };
  function guestToken() { try { return localStorage.getItem("roru_member_token"); } catch (e) { return null; } }
  // f37: makes sure the current calendar quarter exists (the next one starts by itself on its first day)
  const TICK = R.rpc("passport_quarter_tick", {}).catch(() => null);
  async function guestLoad(force) {
    await TICK;
    const tk = guestToken(); if (!tk || G.busy) return; if (!force && Date.now() - G.at < 12000) return;
    G.busy = true;
    try { const [p, dk] = await Promise.all([R.rpc("family_passport", { p_token: tk }), R.rpc("family_drinks", { p_token: tk }).catch(() => null)]); G.at = Date.now(); const prev = G.data; G.data = p; G.drinks = dk; guestRender(prev); } catch (e) {} finally { G.busy = false; }
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
    const how = z ? ["掃描收據：每款付咗錢嘅食物蓋一個印花（每張單每款一次）。", "每張單最多 " + p.max_per_bill + " 個新印花。", "只有埋單嗰位有印花，同枱朋友冇。", "免費嘢食、獎賞同飲品都唔計。套餐會蓋入面嘅手卷。", "收據讀唔到？埋單時叫店員幫你蓋。", QRULE()]
      : ["Scan your receipt: every food item you paid for gets a stamp (once per item per bill).", "Up to " + p.max_per_bill + " new stamps a bill.", "Only the person who paid gets stamps, not the rest of the table.", "Free items, rewards and drinks don't count. A roll set stamps the rolls in it.", "Receipt won't read? Ask staff to stamp it when you pay.", QRULE()];
    const foodHtml = '<div class="pp-hero"><div class="pp-top">' + CARD + INFO_BTN() + '<div><div class="pp-k">' + W("Menu Passport", "菜單護照") + " · " + W("菜單護照", "Menu Passport") + '</div><div class="pp-season">' + esc(seasonLine(p, z)) + "</div></div></div>" +
      '<div class="pp-count"><b>' + p.count + "</b><span>/" + p.total + '</span></div><div class="pp-sub">' + W("dishes tried this quarter", "今季試過嘅菜式", "本季已尝菜式") + "</div>" + track(p) +
      togo(p.count, p.tiers, z, "dish", "dishes", "款") + (p.season && p.season.status !== "live" ? '<div class="pp-off">' + W("Stamps are paused outside the quarter's dates.", "季度以外暫停蓋印花。", "季度以外暂停盖印花。") + "</div>" : "") +
      '<div class="pp-badges">' + ["roll", "app", "dessert"].map(g => { const its = p.items.filter(x => x.grp === g); if (!its.length) return ""; const got = its.filter(x => x.sid).length;
        return badge(W(FBADGE[g][0], FBADGE[g][1]), got >= its.length ? W("Tried every " + GRP[g][0].toLowerCase().replace(/s$/, ""), "全部" + GRP[g][1] + "試齊") : W("Try every " + GRP[g][0].toLowerCase().replace(/s$/, ""), "試齊所有" + GRP[g][1]), got, its.length, icon(g)); }).join("") + "</div></div>" +
      '<div class="card pp-prizes"><h2>' + W("Prizes", "獎品") + "</h2>" + prizes + "</div>" + groups +
      '<div class="card pp-how"><h2>' + W("How stamps work", "點樣蓋印花") + "</h2><ul>" + how.map(h => "<li>" + esc(h) + "</li>").join("") + "</ul></div>";
    const dk = G.drinks && G.drinks.on ? G.drinks : null;
    if (!dk && G.mode === "drinks") G.mode = "food";
    const tog = dk ? '<div class="pp-tog" role="tablist" aria-label="' + W("Passport", "護照") + '"><button type="button" role="tab" data-ppmode="food" aria-selected="' + (G.mode === "food") + '" class="' + (G.mode === "food" ? "on" : "") + '">' + ROLL + "<span>" + W("Food", "食物") + "</span><em>" + p.count + "/" + p.total + "</em></button>" +
      '<button type="button" role="tab" data-ppmode="drinks" aria-selected="' + (G.mode === "drinks") + '" class="' + (G.mode === "drinks" ? "on" : "") + '">' + BOT_SAKE + "<span>" + W("Drinks", "飲品") + "</span><em>" + dk.count + "</em></button></div>" : "";
    sec.innerHTML = tog + (G.mode === "drinks" && dk ? drinksHtml(dk, z) : foodHtml);
    // f38: the rules sit behind the ⓘ on the passport card (same text, opens as a sheet)
    $$("[data-ppinfo]", sec).forEach(b => b.onclick = () => { const hw = $(".pp-how", sec); if (!hw) return; const ov = document.createElement("div"); ov.className = "ask-sheet f38-sheet"; ov.setAttribute("role", "dialog");
      ov.innerHTML = '<div class="card fs-card pp-how-sheet"><div class="fs-h"><h2>' + hw.querySelector("h2").innerHTML + '</h2><button type="button" class="fs-x" aria-label="Close">✕</button></div><div class="fs-b"><ul>' + hw.querySelector("ul").innerHTML + "</ul></div></div>";
      ov.addEventListener("click", e => { if (e.target === ov || e.target.closest(".fs-x")) ov.remove(); }); document.body.appendChild(ov); });
    $$("[data-ppmode]", sec).forEach(b => b.onclick = () => { G.mode = b.dataset.ppmode; try { localStorage.setItem("roru_pp_mode", G.mode); } catch (e) {} guestRender(null); window.scrollTo({ top: Math.max(0, sec.getBoundingClientRect().top + window.scrollY - 70), behavior: "smooth" }); });
    if (guestToken()) { celebrate("food", p.season && p.season.id, p.tiers, z); if (dk) celebrate("drinks", dk.season && dk.season.id, dk.rewards, z); }
  }
  // the bottle passport: one stamp per different bottle, milestones count every bottle
  // f37: vintage / brewery line + the menu bottle price under each bottle name
  const dkMeta = (b) => (b.note || b.price) ? '<div class="dk-meta">' + [b.note ? esc(b.note) : "", b.price ? "HK$" + Math.round(+b.price) : ""].filter(Boolean).join(" · ") + "</div>" : "";
  function drinksHtml(d, z) {
    const tiers = d.rewards || [], top = tiers.length ? Math.max(...tiers.map(t => t.n)) : 10;
    const tr = { count: d.count, total: Math.max(top, d.count), tiers: tiers };
    const cats = [...new Set((d.bottles || []).map(b => b.cat))];
    const prizes = tiers.map(t => {
      const st = t.used_at ? "used" : t.reached ? "ready" : "lock", left = t.n - d.count;
      const right = st === "used" ? '<span class="pp-pz-s used">' + W("Enjoyed ✓ ", "已享用 ✓ ") + fmtD(hkDate(t.used_at), z, true) + "</span>"
        : st === "ready" ? '<span class="pp-pz-s ready">' + W("Unlocked! Show staff", "解鎖咗！俾店員睇", "已解锁！出示给店员") + "</span>"
        : '<span class="pp-pz-s">' + LOCK + " " + W(left + " to go", "仲差 " + left + " 支", "还差 " + left + " 瓶") + "</span>";
      const art = t.n >= 10 ? BOT_WINE : t.n >= 6 ? SAKE_IMG : HIGHBALL;
      return '<div class="pp-pz dk-pz ' + st + '"><div class="pp-pz-n"><b>' + t.n + "</b><small>" + W("bottles", "支", "瓶") + '</small></div><div class="pp-pz-art">' + art + '</div><div class="pp-pz-t"><b>' + esc(z ? ((hans() && t.zhs) || t.zh) : t.en) + "</b><small>" + esc(z ? ((hans() && t.line_zhs) || t.line_zh || "") : (t.line_en || "")) + "</small></div>" + right + "</div>";
    }).join("");
    const groups = cats.map(c => {
      const its = d.bottles.filter(b => b.cat === c), got = its.filter(b => b.n > 0).length, lb = DCAT[c] || DCAT.other;
      return '<div class="pp-gh"><h2>' + CL(lb) + " <span>" + W(lb[1], lb[0]) + "</span></h2><b>" + got + "/" + its.length + "</b></div>" +
        '<div class="pp-grid dk-grid">' + its.map(b => '<div class="pp-cell dk-cell ' + (b.n ? "on" : "off") + '" data-cat="' + esc(c) + '"><div class="dk-ic">' + botIcon(c) + (b.n > 1 ? '<span class="dk-x">×' + b.n + "</span>" : "") + "</div>" +
          '<div class="pp-nm">' + esc(z ? b.zh : b.en) + "</div>" + dkMeta(b) + (b.n ? '<div class="pp-stamp"><span>✓</span><em>' + fmtD(hkDate(b.at), z, true) + "</em></div>" : '<div class="pp-zh">' + W("not yet", "未試", "未尝") + "</div>") + "</div>").join("") + "</div>";
    }).join("");
    const allDiff = d.total && d.different >= d.total;
    const badges = cats.map(c => { const its = d.bottles.filter(b => b.cat === c), got = its.filter(b => b.n > 0).length, bd = DBADGE[c] || DBADGE.other, lb = DCAT[c] || DCAT.other;
        return badge(CL(bd), got >= its.length ? W("Tried every " + lb[0].toLowerCase(), "全部" + lb[1] + "試齊", lb[2] + "全部尝遍") : W("Try every " + lb[0].toLowerCase(), "試齊所有" + lb[1], "尝遍所有" + lb[2]), got, its.length, botIcon(c)); }).join("") +
      badge(W("Full cellar", "酒窖全開", "酒窖全开"), allDiff ? W("Every bottle on the list", "酒牌上每支都試齊", "酒单上每瓶都尝过") : W("Every bottle on the list", "試齊酒牌上每一支", "尝遍酒单上每一瓶"), d.different, d.total, BOT_WINE);
    // f37 (Dominic): the sharing rule, word for word in all three languages; the logic is unchanged (the scanner gets the bottles, split shares never stamp)
    const shareRule = W("Sharing a bill? Bottle stamps go to whoever scans the receipt. Splitting the bill shares the points, not the bottle stamps. Max " + d.max_per_bill + " bottle stamps per bill.",
      "同枱夾單？酒樽印花歸掃描收據嗰位。分單只會分積分，唔會分酒樽印花。每張單最多" + d.max_per_bill + "個酒樽印花。",
      "同桌分单？酒瓶印花归扫描收据的人。分单只分积分，不分酒瓶印花。每张单最多" + d.max_per_bill + "个酒瓶印花。");
    const how = !z ? ["Every bottle you pay for counts. Scan your receipt and it stamps itself. Glasses don't count.", "One stamp for each different bottle; ordering a favourite again still counts toward the rewards.", "Rewards at 3, 6 and 10 bottles, once each a quarter. Show staff before you pay.", shareRule, "Receipt won't read? Staff can stamp it on the iPad.", QRULE()]
      : hans() ? ["每瓶付费的酒（整瓶）都算：扫描收据就会自动盖印。杯装不算。", "每款不同的酒一个印花；同一款再点也会计入奖赏进度。", "奖赏：3 瓶、6 瓶、10 瓶，每季每项兑换一次，结账前出示给店员。", shareRule, "收据读不到？请店员帮你在 iPad 上盖印。", QRULE()]
      : ["每支付咗錢嘅酒（整支）都計：掃描收據就自動蓋印。杯裝唔計。", "每款唔同嘅酒一個印花；同一款再叫都計入獎賞進度。", "獎賞：3 支、6 支、10 支，每季每樣換一次，埋單前俾店員睇。", shareRule, "收據讀唔到？叫店員幫你喺 iPad 蓋。", QRULE()];
    return '<div class="pp-hero dk-hero"><div class="pp-top"><span class="dk-hero-ic">' + BOT_SAKE + BOT_WINE + '</span>' + INFO_BTN() + '<div><div class="pp-k">' + W("Bottle Passport", "酒瓶護照") + " · " + W("酒瓶護照", "Bottle Passport") + '</div><div class="pp-season">' + esc(seasonLine(d, z)) + "</div></div></div>" +
      '<div class="pp-count"><b>' + d.count + '</b><span>' + W(d.count === 1 ? " bottle" : " bottles", " 支", " 瓶") + '</span></div><div class="pp-sub">' + W(d.different + " of " + d.total + " different bottles tried", "試咗 " + d.total + " 款之中 " + d.different + " 款", d.total + " 款中已尝 " + d.different + " 款") + "</div>" + track(tr) +
      togo(d.count, tiers, z, "bottle", "bottles", "支", "瓶") +
      (d.season && d.season.status !== "live" ? '<div class="pp-off">' + W("Stamps are paused outside the quarter's dates.", "季度以外暫停蓋印花。", "季度以外暂停盖印花。") + "</div>" : "") +
      '<div class="pp-badges">' + badges + "</div></div>" +
      '<div class="card pp-prizes"><h2>' + W("Rewards", "獎賞") + "</h2>" + prizes + "</div>" + groups +
      '<div class="card pp-how"><h2>' + W("How the bottle passport works", "酒瓶護照點玩", "酒瓶护照怎么玩") + "</h2><ul>" + how.map(h => "<li>" + esc(h) + "</li>").join("") + "</ul></div>";
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
    passport_no_season: "No passport quarter is running today.", passport_off: "The passport is switched off.",
    passport_nothing_picked: "Pick at least one item.", passport_not_reached: "Not enough stamps for that prize yet.",
    perk_used_up: "Already used this quarter.", manager_only: "After 15 minutes only a manager or the owner can undo this.",
    reason_required: "Please type a short reason.", already_undone: "Already undone.", owner_only: "Owner only."
  };
  const ERRZ = { passport_bill_cap: "呢張單已經蓋滿新印花，下次再嚟！", passport_not_payer: "呢個單號屬於另一位會員，只有埋單嗰位有印花。", passport_no_season: "今日冇護照季度。", passport_off: "護照已關閉。",
    passport_nothing_picked: "最少揀一樣。", passport_not_reached: "印花未夠換呢個獎品。", perk_used_up: "今季已經用咗。", manager_only: "過咗時限，只有經理或者老闆可以復原。", reason_required: "請寫低簡單原因。", already_undone: "已經復原咗。", owner_only: "只限老闆。" };
  const errTxt = (e) => (zh() && ERRZ[e && (e.code || e.message)]) || ERR[e && (e.code || e.message)] || (R.errText ? R.errText(e) : String(e && e.message || e));
  const sess = () => window.__ppSess && window.__ppSess.token;
  async function staffLoad(force) {
    await TICK;
    const c = window.__ppCard; if (!c || !c.member_code || !sess()) return;
    if (!force && S.code === c.member_code && Date.now() - S.at < 20000) { staffPaint(); return; }
    if (S.busy) return; S.busy = true;
    try { const [pp, dk] = await Promise.all([R.rpc("staff_passport", { p_token: sess(), p_who: c.member_code }), R.rpc("staff_drinks", { p_token: sess(), p_who: c.member_code }).catch(() => null)]);
      S.data = pp; S.drinks = dk; S.code = c.member_code; S.at = Date.now(); } catch (e) { S.data = null; S.drinks = null; } finally { S.busy = false; }
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
      (live ? '<button class="btn sm" data-ppstamp>' + W("Stamp passport", "蓋護照印花") + "</button>" : "") + "</div>" + rows + staffDrinksHtml(S.drinks);
  }
  // f36: the bottle passport on the iPad, under the food passport
  function staffDrinksHtml(d) {
    if (!d || !d.on) return "";
    const live = d.season && d.season.status === "live", nx = (d.rewards || []).find(t => d.count < t.n);
    const rows = (d.rewards || []).filter(t => t.reached).map(t => '<div class="pp-st-pz' + (t.used_at ? " used" : "") + '"><span><b>' + t.n + W(" bottles:", " 支：", " 瓶：") + "</b> " + esc(zh() ? ((hans() && t.zhs) || t.zh) : t.en) + (t.used_at ? ' <em>· ' + W("used ", "已用 ") + fmtD(hkDate(t.used_at), zh(), true) + "</em>" : "") + "</span>" +
      (t.used_at ? '<button class="btn ghost sm" data-dkundo="' + t.claim_id + '">↩︎ ' + W("Undo", "復原") + "</button>" : '<button class="btn sm" data-dkuse="' + t.n + '">' + W("Mark used", "標記已用") + "</button>") + "</div>").join("");
    return '<div class="pp-st-h dk-st-h"><span class="dk-st-ic">' + BOT_SAKE + '</span><div class="pp-st-t"><b>' + W("Bottles ", "酒瓶 ") + d.count + " · " + W(d.different + "/" + d.total + " different", "唔同款 " + d.different + "/" + d.total, "不同款 " + d.different + "/" + d.total) + "</b><small>" +
      (nx ? W((nx.n - d.count) + " more to: " + nx.en, "再 " + (nx.n - d.count) + " 支就換：" + nx.zh, "再 " + (nx.n - d.count) + " 瓶即可兑换：" + (nx.zhs || nx.zh)) : W("Every reward unlocked", "全部獎賞解鎖")) + "</small></div>" +
      (live ? '<button class="btn sm" data-dkstamp>' + W("Stamp bottles", "蓋酒瓶印花") + "</button>" : "") + "</div>" + rows;
  }
  function drinksSheet() {
    const d = S.drinks, c = window.__ppCard || {}; if (!d) return;
    const pick = {}, max = d.max_per_bill || 6, tot = () => Object.values(pick).reduce((a, b) => a + b, 0);
    const nm = /\p{L}/u.test(c.name || "") ? c.name : W("this guest", "呢位客人");
    const cats = [...new Set(d.bottles.map(b => b.cat))];
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Close">‹</button><div><h2>' + W("Stamp bottles", "蓋酒瓶印花") + '</h2><small>' + esc(nm) + " · " + W(d.count + " bottles so far", "暫時 " + d.count + " 支", "目前 " + d.count + " 瓶") + "</small></div></div>" +
      '<p class="pp-rule">' + W("Tap + for each <b>bottle</b> on this guest's bill (not glasses). Sharing a bill? Bottle stamps go to whoever scans the receipt. Splitting the bill shares the points, not the bottle stamps. Max <b>" + max + "</b> bottle stamps per bill.",
        "喺呢位客人張單上面每支<b>整支酒</b>撳一下 +（杯裝唔計）。同枱夾單？酒樽印花歸掃描收據嗰位。分單只會分積分，唔會分酒樽印花。每張單最多<b>" + max + "</b>個酒樽印花。",
        "在这位客人的账单上，每瓶<b>整瓶酒</b>按一下 +（杯装不算）。同桌分单？酒瓶印花归扫描收据的人。分单只分积分，不分酒瓶印花。每张单最多<b>" + max + "</b>个酒瓶印花。") + "</p>" +
      '<label class="pp-bill"><span>' + W("Bill no. (optional)", "單號（可以留空）", "单号（可留空）") + '</span><input id="dkBill" autocomplete="off" autocapitalize="characters" placeholder="e.g. A-001238"></label>' +
      cats.map(ct => '<h3>' + W((DCAT[ct] || DCAT.other)[0] + " · " + (DCAT[ct] || DCAT.other)[1], (DCAT[ct] || DCAT.other)[1] + " · " + (DCAT[ct] || DCAT.other)[0], (DCAT[ct] || DCAT.other)[2] + " · " + (DCAT[ct] || DCAT.other)[0]) + '</h3><div class="pp-pick dk-pick">' + d.bottles.filter(b => b.cat === ct).map(b =>
        '<div class="pp-pk dk-pk" data-id="' + b.id + '"><span class="pp-pk-ic dk-pk-ic">' + botIcon(ct) + '</span><span class="pp-pk-t"><b>' + esc(zh() ? b.zh : b.en) + "</b><small>" + (b.price ? "HK$" + Math.round(+b.price) + (b.note ? " · " + esc(b.note) : "") + " · " : "") + (b.n ? W("had " + b.n + " this quarter", "今季飲過 " + b.n + " 支", "本季已点 " + b.n + " 瓶") : W("new for this guest", "第一次")) + '</small></span><span class="dk-step"><button type="button" class="dk-minus" aria-label="−">−</button><b>0</b><button type="button" class="dk-plus" aria-label="+">+</button></span></div>').join("") + "</div>").join("") +
      '<div class="pp-sh-f"><span id="dkPicked">' + W("0 bottles", "0 支", "0 瓶") + '</span><button class="btn" id="dkGo" disabled>' + W("Stamp", "蓋印") + '</button></div><div id="dkErr" class="pp-err hide"></div>');
    const upd = () => { const n = tot(); $("#dkPicked", ov).textContent = W(n + " of " + max + " bottles", n + "/" + max + " 支", n + "/" + max + " 瓶"); const b = $("#dkGo", ov); b.disabled = !n; b.textContent = n ? W("Stamp " + n + " bottle" + (n === 1 ? "" : "s"), "蓋 " + n + " 支", "盖 " + n + " 瓶") : W("Stamp", "蓋印"); };
    ov.addEventListener("click", async (e) => {
      if (e.target.closest("[data-x]") || e.target === ov) { ov.remove(); return; }
      const st = e.target.closest(".dk-plus, .dk-minus");
      if (st) { const row = st.closest(".dk-pk"), id = +row.dataset.id, cur = pick[id] || 0;
        if (st.classList.contains("dk-plus")) { if (tot() >= max) { R.toast(W("Max " + max + " bottle stamps per bill", "每張單最多" + max + "個酒樽印花", "每张单最多" + max + "个酒瓶印花")); return; } pick[id] = cur + 1; } else pick[id] = Math.max(0, cur - 1);
        row.querySelector(".dk-step b").textContent = pick[id]; row.classList.toggle("sel", pick[id] > 0); upd(); return; }
      if (e.target.closest("#dkGo")) {
        const b = $("#dkGo", ov); b.disabled = true; $("#dkErr", ov).classList.add("hide");
        const items = []; Object.keys(pick).forEach(k => { for (let i = 0; i < pick[k]; i++) items.push(+k); });
        try {
          const r = await R.rpc("staff_drinks_stamp", { p_token: sess(), p_who: c.member_code, p_items: items, p_bill: $("#dkBill", ov).value || null });
          S.drinks = Object.assign(r.drinks, { undo_minutes: d.undo_minutes, role: d.role }); S.at = Date.now(); ov.remove(); staffPaint(); drinksDone(r, items);
        } catch (er) { const m = $("#dkErr", ov); m.textContent = errTxt(er); m.classList.remove("hide"); b.disabled = false; }
      }
    });
  }
  function drinksDone(r, items) {
    const d = S.drinks, byId = {}; d.bottles.forEach(b => byId[b.id] = b);
    const ids = r.stamp_ids || [];
    const reached = (d.rewards || []).filter(t => t.reached && !t.used_at);
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Close">‹</button><div><h2>' + W(r.added + " bottle" + (r.added === 1 ? "" : "s") + " stamped ✓", "蓋咗 " + r.added + " 支 ✓", "已盖 " + r.added + " 瓶 ✓") + "</h2><small>" + W("Bottles now ", "而家 ", "现在 ") + d.count + W("", " 支", " 瓶") + "</small></div></div>" +
      '<div class="pp-done">' + items.map((id, i) => '<div class="pp-done-r"><span>' + esc(zh() ? (byId[id] || {}).zh : (byId[id] || {}).en) + '</span><button class="btn ghost sm" data-dkunstamp="' + ids[i] + '">↩︎ ' + W("Undo", "復原") + "</button></div>").join("") + "</div>" +
      (reached.length ? '<p class="pp-rule"><b>' + W("Reward ready: ", "可以換獎賞：") + "</b>" + esc(reached.map(t => zh() ? t.zh : t.en).join(" · ")) + W(". Hand it over, then tap Mark used.", "。送出後撳「標記已用」。") + "</p>" : "") +
      '<p class="pp-rule">' + W("Logged under your PIN. Undo works for " + (d.undo_minutes || 15) + " minutes; after that a manager can undo it with a reason.", "已用你嘅 PIN 記錄。" + (d.undo_minutes || 15) + " 分鐘內可以復原；之後要經理寫低原因。") + '</p><div class="pp-sh-f"><span></span><button class="btn" data-x>' + W("Done", "完成") + "</button></div>");
    ov.addEventListener("click", (e) => { if (e.target.closest("[data-x]") || e.target === ov) ov.remove(); });
  }
  async function dkUndoCall(fnName, args, btn) {
    btn.disabled = true;
    try { let r; try { r = await R.rpc(fnName, Object.assign({ p_token: sess(), p_reason: null }, args)); }
      catch (e) { if ((e.code || e.message) === "reason_required" || ((e.code || e.message) === "manager_only" && S.drinks && S.drinks.role !== "staff")) { const why = prompt(W("Reason for the late undo (manager):", "遲咗復原嘅原因（經理）：")); if (!why) { btn.disabled = false; return; } r = await R.rpc(fnName, Object.assign({ p_token: sess(), p_reason: why }, args)); } else throw e; }
      S.drinks = Object.assign(r.drinks, { undo_minutes: S.drinks.undo_minutes, role: S.drinks.role }); S.at = Date.now(); staffPaint(); R.toast(W("Undone ✓", "已復原 ✓")); return true;
    } catch (e) { R.toast(errTxt(e), 3500); btn.disabled = false; return false; }
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
      '<label class="pp-bill"><span>' + W("Bill no. (optional)", "單號（可以留空）", "单号（可留空）") + '</span><input id="ppBill" autocomplete="off" autocapitalize="characters" placeholder="e.g. A-001238"></label>' +
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
  // f38: ONE stamp sheet for the staff action bar: Food | Drinks toggle on top of the passport / bottle sheet (same sheets as before)
  window.__ppStaff = { open: async (mode) => {
    await staffLoad(true);
    const foodOk = !!(S.data && S.data.on && S.data.season && S.data.season.status === "live"), drinkOk = !!(S.drinks && S.drinks.on && S.drinks.season && S.drinks.season.status === "live");
    if (!foodOk && !drinkOk) { R.toast(W("No passport quarter is running today.", "今日冇護照季度。", "今天没有护照季度。"), 3000); return; }
    if (mode === "drinks" && !drinkOk) mode = "food"; if (mode === "food" && !foodOk) mode = "drinks";
    try { localStorage.setItem("roru_stamp_mode", mode); } catch (e) {}
    $$(".pp-ov").forEach(x => x.remove());
    if (mode === "drinks") drinksSheet(); else stampSheet();
    const ov = [...document.querySelectorAll(".pp-ov")].pop(); if (!ov) return; const sh = $(".pp-sh", ov);
    const sw = document.createElement("div"); sw.className = "pp-tog pp-sw"; sw.setAttribute("role", "tablist");
    sw.innerHTML = '<button type="button" data-sw="food" class="' + (mode === "food" ? "on" : "") + '"' + (foodOk ? "" : " disabled") + ">" + ROLL + "<span>" + W("Food", "食物") + '</span></button><button type="button" data-sw="drinks" class="' + (mode === "drinks" ? "on" : "") + '"' + (drinkOk ? "" : " disabled") + ">" + BOT_SAKE + "<span>" + W("Drinks", "飲品") + "</span></button>";
    const hd = $(".pp-sh-h", sh); if (hd) hd.after(sw); else sh.prepend(sw);
    $$("[data-sw]", sw).forEach(b => b.onclick = () => { if (b.dataset.sw !== mode) window.__ppStaff.open(b.dataset.sw); });
  } };
  function staffInit() {
    const box = $("#gcard"); if (!box) return;
    new MutationObserver(() => { if (window.__ppCard && box.firstChild && !$(".pp-st", box)) { staffPaint(); staffLoad(false); } }).observe(box, { childList: true });
    setInterval(() => { if (box.firstChild && window.__ppCard) staffLoad(false); }, 5000);
    document.addEventListener("click", async (e) => {
      if (e.target.closest("[data-ppstamp]")) { await staffLoad(true); stampSheet(); return; }
      if (e.target.closest("[data-dkstamp]")) { await staffLoad(true); drinksSheet(); return; }
      const du = e.target.closest("[data-dkuse]"); if (du) { du.disabled = true; try { const r = await R.rpc("staff_drinks_claim", { p_token: sess(), p_who: window.__ppCard.member_code, p_at: +du.dataset.dkuse }); S.drinks = Object.assign(r.drinks, { undo_minutes: S.drinks.undo_minutes, role: S.drinks.role }); staffPaint(); R.toast(W("Reward marked used ✓", "獎賞已標記使用 ✓")); } catch (er) { R.toast(errTxt(er), 3500); du.disabled = false; } return; }
      const dz = e.target.closest("[data-dkundo]"); if (dz) { await dkUndoCall("staff_drinks_claim_undo", { p_claim_id: +dz.dataset.dkundo }, dz); return; }
      const ds = e.target.closest("[data-dkunstamp]"); if (ds) { if (await dkUndoCall("staff_drinks_unstamp", { p_stamp_id: +ds.dataset.dkunstamp }, ds)) { ds.textContent = W("Undone", "已復原"); ds.closest(".pp-done-r").classList.add("undone"); } return; }
      const u = e.target.closest("[data-ppzuse]"); if (u) { u.disabled = true; try { const r = await R.rpc("staff_passport_prize", { p_token: sess(), p_who: window.__ppCard.member_code, p_tier: +u.dataset.ppzuse }); S.data = Object.assign(r.passport, { undo_minutes: S.data.undo_minutes, role: S.data.role }); staffPaint(); R.toast(W("Prize marked used ✓", "獎品已標記使用 ✓")); } catch (er) { R.toast(errTxt(er), 3500); u.disabled = false; } return; }
      const z = e.target.closest("[data-ppzundo]"); if (z) { await undoCall("staff_passport_prize_undo", { p_prize_id: +z.dataset.ppzundo }, z); return; }
      const s = e.target.closest("[data-ppunstamp]"); if (s) { if (await undoCall("staff_passport_unstamp", { p_stamp_id: +s.dataset.ppunstamp }, s)) { s.textContent = W("Undone", "已復原"); s.closest(".pp-done-r").classList.add("undone"); } }
    });
  }

  // ---------- OWNER ----------
  const O = { data: null };
  const otok = () => window.__ppOwner && window.__ppOwner.token;
  async function ownerLoad() {
    await TICK;
    const v = $("#v-passport"); if (!v || !otok()) return;
    if (!O.data) v.innerHTML = '<p class="sub" style="padding:20px 0">Loading…</p>';
    try { const [pp, dk] = await Promise.all([R.rpc("owner_passport", { p_token: otok() }), R.rpc("owner_drinks", { p_token: otok() }).catch(() => null)]); O.data = pp; O.drinks = dk; ownerRender(); } catch (e) { v.innerHTML = '<p class="sub">' + esc(errTxt(e)) + "</p>"; }
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
    const statusTxt = s.status === "live" ? "Running · " + s.days_left + " days left in Q" + qOf(s) : s.status === "upcoming" ? "Starts " + odate(s.starts_on) : "Ended " + odate(s.ends_on);
    v.innerHTML = '<div class="vh"><div><h1>Menu Passport</h1><p class="sub">Guests collect one stamp for each dish they try. Use it to see who\'s playing and which dishes get ordered least.</p></div><button class="obtn" id="ppEdit">Change quarter &amp; prizes</button></div>' +
      '<div class="pp-okpis" id="ppOwnerKpis">' + kp + "</div>" +
      '<div class="pp-ocols"><div class="pp-ocard"><h2>Quarter</h2><p class="pp-osub">The dates stamps count, and what guests win. Each passport runs for one quarter (Q1–Q4). Stamps reset when the quarter ends; the next quarter starts by itself with the same dishes, prizes, bottles and rewards.</p>' +
        '<div class="pp-orow"><span>' + esc(s.name_en) + " · " + esc(s.name_zh || "") + "</span><b>" + statusTxt + "</b></div>" +
        '<div class="pp-orow"><span>Dates</span><b>' + odate(s.starts_on) + " → " + odate(s.ends_on) + "</b></div>" +
        '<div class="pp-orow"><span>New stamps a bill (max)</span><b>' + s.max_per_bill + "</b></div>" +
        tiers.map(t => '<div class="pp-orow"><span>Prize at ' + t.n + " stamps</span><b>" + esc(t.en) + "</b></div>").join("") +
        '<div class="pp-orow"><span>Stamps so far</span><b>' + d.stamps + " (" + (d.by_source.receipt || 0) + " from receipts, " + (d.by_source.staff || 0) + " by staff)</b></div>" +
      '</div><div class="pp-ocard"><h2>Most stamped</h2><p class="pp-osub">Dishes members try the most this quarter.</p>' + most.map(bar).join("") +
        '<h2 style="margin-top:18px">Least stamped</h2><p class="pp-osub">Dishes members skip. Worth a staff recommendation, a better photo, or a rethink.</p>' + least.map(bar).join("") +
      '</div></div><details class="pp-ocard pp-oall"><summary>All ' + d.total + " dishes, most to least stamped</summary>" + d.items.map(bar).join("") + "</details>" +
      '<p class="pp-osub" style="margin-top:10px">How stamps get ticked: the guest\'s receipt scan reads the food lines (sets stamp their rolls); staff can tick items from the bill on the iPad with "Stamp passport". Only the person who paid, one stamp per dish per bill, max ' + s.max_per_bill + " new stamps a bill, free items never stamp. Prizes are marked used by staff like other benefits, and every stamp, prize and undo is in Staff &amp; PINs → activity.</p>";
    $("#ppEdit").onclick = ownerEdit;
    ownerDrinks(v);
    // f38: Food | Drinks toggle, the same as the guest Passport tab (the owner page stacked both, 4,054px)
    if (v.querySelector(".dk-own")) {
      let m = "food"; try { m = localStorage.getItem("roru_owner_pp_mode") || "food"; } catch (e) {}
      const tg = document.createElement("div"); tg.className = "pp-tog pp-otog"; tg.setAttribute("role", "tablist");
      tg.innerHTML = '<button type="button" data-opm="food">' + ROLL + "<span>Food</span><em>" + (d.total || "") + '</em></button><button type="button" data-opm="drinks">' + BOT_SAKE + "<span>Drinks</span><em>" + ((O.drinks && (O.drinks.drinks || []).filter(x => x.in).length) || "") + "</em></button>";
      v.prepend(tg);
      const setM = (k) => { v.dataset.ppmode = k; $$("[data-opm]", tg).forEach(b => { b.classList.toggle("on", b.dataset.opm === k); b.setAttribute("aria-selected", b.dataset.opm === k); }); try { localStorage.setItem("roru_owner_pp_mode", k); } catch (e) {} };
      $$("[data-opm]", tg).forEach(b => b.onclick = () => { setM(b.dataset.opm); window.scrollTo(0, 0); });
      setM(m);
    } else delete v.dataset.ppmode;
  }
  // f36: the bottle passport for the owner: how it's going, the list, the rewards and what they cost
  function ownerDrinks(v) {
    const d = O.drinks; if (!d || !d.season) return;
    const inl = (d.drinks || []).filter(x => x.in), money = (n) => n == null ? "–" : "HK$" + Number(n).toLocaleString("en-HK", { maximumFractionDigits: 2 });
    const cheapest = inl.length ? Math.min(...inl.map(x => +x.price || 1e9)) : 0, avg = inl.length ? inl.reduce((a, x) => a + (+x.price || 0), 0) / inl.length : 0;
    const pct = (c, n, p) => p && n ? (c / (n * p) * 100).toFixed(1) + "%" : "–";
    const tile = (cls, l, val, sub) => '<div class="kpi pp-kpi ' + cls + '"><div class="lbl">' + l + '</div><div class="val">' + val + '</div><div class="kx">' + sub + "</div></div>";
    const el = document.createElement("div"); el.className = "dk-own";
    el.innerHTML = '<div class="vh" style="margin-top:26px"><div><h1>Bottle Passport</h1><p class="sub">The Drinks side of the guest Passport tab. One stamp for each different bottle; the rewards count every bottle ordered' + (d.repeats_count ? ", repeats included" : " (different bottles only)") + '. Glasses never count.</p></div><button class="obtn" id="dkEdit">Change bottles &amp; rewards</button></div>' +
      '<div class="pp-okpis">' + tile("k-or", "Members playing", d.playing, "have 1 or more bottles stamped") + tile("k-gr", "Bottles stamped", d.bottles, (d.by_source.receipt || 0) + " from receipts, " + (d.by_source.staff || 0) + " by staff") + tile("k-bl", "Bottles this week", d.week, "last 7 days") +
        (d.rewards || []).map(r => tile("k-gold", "Reward at " + r.n, r.claimed, "claimed · " + esc(r.en))).join("") + "</div>" +
      '<div class="pp-ocols"><div class="pp-ocard"><h2>Bottles on the passport</h2><p class="pp-osub">Names and bottle prices from the rorubaru.com drinks menu. Costs from the October price sheet; "cost unknown" where the sheet has no row.</p>' +
        inl.map(x => '<div class="pp-orow"><span>' + esc(x.short_en || x.name) + ' <small class="dk-cat">' + esc((DCAT[x.cat] || DCAT.other)[0]) + "</small>" + (x.note || x.glass_too ? "<br><small>" + esc([x.note, x.glass_too ? "also by the glass (glasses never stamp)" : ""].filter(Boolean).join(" · ")) + "</small>" : "") + "</span><b>" + money(x.price) + ' <small>' + (x.cost == null ? '<span class="dk-unk">cost unknown</span>' : "cost " + money(x.cost)) + " · " + x.stamped + " stamped</small></b></div>").join("") +
      '</div><div class="pp-ocard"><h2>Rewards &amp; what they cost</h2><p class="pp-osub">Cost as a share of the least a guest can spend to get there (cheapest bottle, ' + money(cheapest) + ') and of a typical spend (average bottle, ' + money(Math.round(avg)) + ').</p>' +
        (() => { const rs = d.rewards || [], top = rs.length ? Math.max(...rs.map(r => r.n)) : 0, tot = rs.reduce((a, r) => a + (r.cost == null ? 0 : +r.cost), 0);
          return top && avg ? '<div class="dk-tot"><b>' + (tot / (top * avg) * 100).toFixed(1) + '%</b><span>All ' + rs.length + " rewards together (" + money(tot) + ") for a guest who reaches " + top + " bottles, against " + top + " average bottles (" + money(Math.round(top * avg)) + ", before service charge)</span></div>" : ""; })() +
        (d.rewards || []).map(r => '<div class="pp-orow"><span><b>' + r.n + " bottles:</b> " + esc(r.en) + "<br><small>" + esc(r.cost_note || "") + "</small></span><b>" + money(r.cost) + ' <small>' + pct(r.cost, r.n, cheapest) + " min · " + pct(r.cost, r.n, avg) + " typical</small></b></div>").join("") +
      "</div></div>" +
      '<p class="pp-osub" style="margin-top:10px">How bottles get stamped: the receipt scan reads bottle lines and checks the price, so a HK$88 glass of Pessegueiro or an HK$80 glass of Heavensake never counts but the bottle does; a line like "2 Sari Black" stamps 2. Staff can tap bottles on the iPad with "Stamp bottles". Sharing a bill? Bottle stamps go to whoever scans the receipt. Splitting the bill shares the points, not the bottle stamps. Max ' + d.max_per_bill + " bottle stamps per bill. Rewards are marked used by staff; every stamp, reward and undo is in Staff &amp; PINs → activity.</p>";
    v.appendChild(el);
    $("#dkEdit").onclick = ownerDrinksEdit;
  }
  function ownerDrinksEdit() {
    const d = O.drinks, cats = Object.keys(DCAT);
    const brow = (x) => '<div class="dk-erow' + (x.in ? " on" : "") + '" data-id="' + x.id + '"><label class="dk-chk"><input type="checkbox" name="in"' + (x.in ? " checked" : "") + '><span>' + esc(x.name) + "</span></label>" +
      '<select class="fin" name="cat">' + cats.map(c => '<option value="' + c + '"' + ((x.cat || (x.in ? "" : "other")) === c ? " selected" : "") + ">" + DCAT[c][0] + "</option>").join("") + "</select>" +
      '<label class="fl"><span>Price</span><input class="fin" name="price" type="number" min="0" value="' + (x.price == null ? "" : x.price) + '"></label><label class="fl"><span>Cost</span><input class="fin" name="cost" type="number" min="0" step="0.1" value="' + (x.cost == null ? "" : x.cost) + '"></label></div>';
    const rrow = (r) => '<div class="pp-trow"><label class="fl"><span>Bottles</span><input class="fin" name="n" type="number" min="1" max="99" value="' + (r.n || "") + '"></label><label class="fl"><span>Reward (English)</span><input class="fin" name="en" value="' + esc(r.en || "") + '"></label><label class="fl"><span>Reward (繁中)</span><input class="fin" name="zh" value="' + esc(r.zh || "") + '"></label><label class="fl"><span>Cost HK$</span><input class="fin" name="cost" type="number" min="0" step="0.1" value="' + (r.cost == null ? "" : r.cost) + '"></label><button class="pp-trm" type="button" aria-label="Remove">✕</button>' +
      '<input type="hidden" name="line_en" value="' + esc(r.line_en || "") + '"><input type="hidden" name="line_zh" value="' + esc(r.line_zh || "") + '"><input type="hidden" name="cost_note" value="' + esc(r.cost_note || "") + '"></div>';
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Back">‹</button><div><h2>Bottles &amp; rewards</h2><small>The Drinks side of the guest Passport</small></div></div>' +
      '<h3>Bottles</h3><p class="pp-rule">Tick the bottles that count. Every drink on the menu is listed; only tick bottles (wine, sake, shochu), never glasses or cocktails.</p><div class="dk-elist">' + (d.drinks || []).map(brow).join("") + "</div>" +
      '<h3>Rewards</h3><p class="pp-rule">Once each a quarter, when a guest reaches that many bottles.</p><div id="dkR">' + (d.rewards || []).map(rrow).join("") + '</div><button class="obtn ghost" id="dkAdd" type="button">+ Add a reward</button>' +
      '<div class="pp-ofields"><label class="dk-chk"><input type="checkbox" id="dkRep"' + (d.repeats_count ? " checked" : "") + '><span>Count repeat bottles toward rewards (the same bottle twice = 2)</span></label>' +
      '<label class="fl"><span>Max bottles a bill</span><input class="fin" type="number" min="1" max="24" id="dkMax" value="' + d.max_per_bill + '"></label></div>' +
      '<div id="dkEErr" class="pp-err hide"></div><div class="pp-sh-f"><button class="obtn ghost" data-x type="button">Cancel</button><button class="obtn" id="dkSave" type="button">Save</button></div>');
    ov.addEventListener("change", (e) => { const r = e.target.closest(".dk-erow"); if (r && e.target.name === "in") r.classList.toggle("on", e.target.checked); });
    ov.addEventListener("click", async (e) => {
      if (e.target.closest("[data-x]") || e.target === ov) { ov.remove(); return; }
      if (e.target.closest(".pp-trm")) { e.target.closest(".pp-trow").remove(); return; }
      if (e.target.closest("#dkAdd")) { if ($$(".pp-trow", ov).length >= 5) return R.toast("Up to 5 rewards"); $("#dkR", ov).insertAdjacentHTML("beforeend", rrow({})); return; }
      if (e.target.closest("#dkSave")) {
        const q = (r, n) => r.querySelector('[name="' + n + '"]').value;
        const bottles = $$(".dk-erow", ov).map((r, i) => ({ id: +r.dataset.id, in: r.querySelector('[name="in"]').checked, cat: q(r, "cat"), price: q(r, "price"), cost: q(r, "cost"), sort: i + 1 }))
          .filter(b => b.in || (d.drinks.find(x => x.id === b.id) || {}).cat);
        bottles.forEach(b => { const o = d.drinks.find(x => x.id === b.id) || {}; b.short_en = o.short_en || ""; b.short_zh = o.short_zh || ""; b.min_line = o.min_line; });
        const rewards = $$(".pp-trow", ov).map(r => ({ n: +q(r, "n"), en: q(r, "en"), zh: q(r, "zh"), cost: q(r, "cost"), line_en: q(r, "line_en"), line_zh: q(r, "line_zh"), cost_note: q(r, "cost_note") }));
        try { O.drinks = await R.rpc("owner_save_drinks", { p_token: otok(), p_bottles: bottles, p_rewards: rewards, p_repeats: $("#dkRep", ov).checked, p_max: +$("#dkMax", ov).value });
          ov.remove(); ownerRender(); R.toast("Saved ✓ Guests see it now"); }
        catch (er) { const m = $("#dkEErr", ov); m.textContent = (er.code || er.message) === "bad_value" ? "Each reward needs a bottle count (1 to 99, no repeats) and an English name. Max bottles a bill is 1 to 24." : errTxt(er); m.classList.remove("hide"); }
      }
    });
  }
  function ownerEdit() {
    const s = O.data.season, total = O.data.total;
    const trow = (t) => '<div class="pp-trow"><label class="fl"><span>Stamps</span><input class="fin" name="n" type="number" min="1" max="' + total + '" value="' + (t.n || "") + '"></label><label class="fl"><span>Prize (English)</span><input class="fin" name="en" value="' + esc(t.en || "") + '"></label><label class="fl"><span>Prize (繁中)</span><input class="fin" name="zh" value="' + esc(t.zh || "") + '"></label><button class="pp-trm" type="button" aria-label="Remove">✕</button></div>';
    const ov = sheet('<div class="pp-sh-h"><button class="pp-x" data-x aria-label="Back">‹</button><div><h2>Quarter &amp; prizes</h2><small>What guests see on their passport</small></div></div>' +
      '<div class="pp-ofields"><label class="fl"><span>Quarter name (English)</span><input class="fin" id="pnEn" value="' + esc(s.name_en) + '"><em>e.g. Q4 2026</em></label>' +
      '<label class="fl"><span>Quarter name (繁中)</span><input class="fin" id="pnZh" value="' + esc(s.name_zh || "") + '"><em>e.g. 2026年第四季</em></label>' +
      '<label class="fl"><span>First day</span><input class="fin" type="date" id="pS" value="' + s.starts_on + '"></label>' +
      '<label class="fl"><span>Last day</span><input class="fin" type="date" id="pE" value="' + s.ends_on + '"><em>Calendar quarters: Q1 Jan–Mar · Q2 Apr–Jun · Q3 Jul–Sep · Q4 Oct–Dec</em></label>' +
      '<label class="fl"><span>Max new stamps a bill</span><input class="fin" type="number" min="1" max="' + total + '" id="pM" value="' + s.max_per_bill + '"><em>' + s.max_per_bill + ' means finishing takes at least ' + Math.ceil(total / s.max_per_bill) + ' visits</em></label></div>' +
      "<h3>Prizes</h3><p class=\"pp-rule\">A guest gets each prize once a quarter when they reach that many stamps (out of " + total + ').</p><div id="pTiers">' + (s.tiers || []).map(trow).join("") + '</div><button class="obtn ghost" id="pAdd" type="button">+ Add a prize</button>' +
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
