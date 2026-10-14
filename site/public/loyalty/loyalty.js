/* Roru Family shared: config, preview gate, i18n, RPC, QR, roll icon. Public key only (anon/publishable). */
window.RORU = (function () {
  const CFG = {
    url: "https://gpudggbdwghzsanyvvgt.supabase.co",
    key: "sb_publishable_WbZvV4s9WkKYvdGGlIUBbw_-e6W7Yfk",
    passHash: "156a203791b9b43e682aa45904eee434cc46fab681b2ae1cbb8ee76415df1c68",   // sha256 of the preview passcode (dark phase only)
    build: "v1-preview-2026-10-14"
  };
  const L = {
    en: {
      family: "Roru Family", tag: "Every visit puts a hand roll on your plate.", sub: "5 rolls fill the plate. Scratch the nori. Get a reward.",
      phone: "Your mobile number", phone_ph: "9123 4567", send: "Send me a code", code: "6-digit code", code_ph: "••••••", name: "Your name (optional)", name_ph: "e.g. Kiki",
      consent: "I agree that RORUBARU (We Rolling Limited) keeps my mobile number and visit history to run Roru Family, and may message me about it. I can delete my data any time below. (PDPO)",
      join: "Join / sign in", test_hint: "Preview mode: no SMS is sent. Use code", resend: "Send again", change: "Change number",
      your_plate: "Your plate", rolls_of: "of", rolls: "rolls", plate_full_soon: "One more and the plate is full!", visited_today: "Today's roll is on the plate ✓", not_today: "Show this at the counter on your next visit",
      your_code: "Your member code", show_staff: "Show this to staff — or just say your number.", rewards: "Rewards", no_rewards: "Fill the plate to earn your first reward.",
      scratch: "Scratch the nori to reveal", scratch_hint: "← rub here →", reveal_done: "Show this QR at the counter to redeem", redeemed: "Redeemed", earned: "Plate full! Scratch to reveal",
      streak: "Visit streak", streak_line: "{n} of {t} visits in the last {d} days → +1 bonus roll", gold: "Gold roll!", gold_line: "A gold roll landed today — ask staff for the gold treat 🎉",
      history: "Recent visits", tier: "Level", signout: "Sign out", delete: "Delete my data", delete_confirm: "Delete your Roru Family record and all visits? This cannot be undone.",
      privacy: "Privacy: we store your mobile number, optional name, language, visit dates and rewards, in RORUBARU's own database. We never sell it. Delete it any time with the button above.",
      preview_note: "Dark preview — rewards shown are placeholders until Dominic sets them.", err_bad_phone: "Please enter a valid mobile number", err_wrong_code: "Wrong code, try again", err_code_expired: "Code expired — send a new one",
      err_consent: "Please tick the consent box to join", err_too_many: "Too many tries, wait a bit", err_net: "Connection problem, try again", member_since: "Member since",
      gate_title: "Preview", gate_sub: "Enter the preview passcode", gate_btn: "Enter", gate_err: "Wrong passcode", lang_zh: "繁中", lang_en: "EN",
      tier_nori: "Nori", tier_gohan: "Gohan", tier_tobiko: "Tobiko", tier_kama: "Kama", plates_done: "plates finished", next_level: "Next level at {n} plates", top_level: "Top level — thank you ❤",
      roll_added: "+1 hand roll!", reward_unlocked: "Plate full — reward unlocked!",
      p_tag: "Scan your receipt. Collect points. Eat better.", p_sub: "{r} point per HK$1 spent at RORUBARU — then spend points on rewards.",
      points: "points", your_points: "Your points", scan: "Scan receipt", scan_sub: "Take a photo of the printed receipt — we read the total for you.", type_instead: "Type it instead", reading: "Reading your receipt…", read_ok: "Check and confirm", read_fail: "Couldn't read it clearly — please check the details",
      receipt_no: "Receipt / bill number", total: "Bill total (HK$)", when: "Date & time on the receipt", shop: "Shop", confirm_add: "Confirm & add points", retake: "Retake photo",
      added_points: "+{n} points!", queued: "Sent to staff to check — points land once approved (usually same day).", pending_hint: "{n} receipt(s) waiting for staff approval",
      ladder: "Rewards", claim: "Use {n} pts", need_more: "{n} more", claimed: "Reward unlocked — scratch to reveal", upgrade: "Upgraded! The nori hid something better 🎉",
      receipts: "Your receipts", tier_line: "{spend} spent · {next}", tier_next: "{n} to {name}", kama_note: "Kama is by chef's invitation only",
      err_receipt_already_used: "This receipt has already been used", err_receipt_too_old: "Receipts count within {h} hours", err_daily_receipt_limit: "Daily receipt limit reached — staff can add it for you", err_receipt_no_required: "Please enter the receipt number", err_bad_total: "Please check the total", err_not_enough_points: "Not enough points yet", err_receipt_in_future: "That date is in the future",
      install_tip: "Tip: add this page to your home screen"
    },
    zh: {
      family: "Roru Family", tag: "每次光臨，碟上多一個手卷。", sub: "集齊 5 個手卷，刮開紫菜，獲得獎賞。",
      phone: "你的手機號碼", phone_ph: "9123 4567", send: "發送驗證碼", code: "6 位驗證碼", code_ph: "••••••", name: "你的名字（可選）", name_ph: "例如：Kiki",
      consent: "我同意 RORUBARU（We Rolling Limited）保存我的手機號碼及到訪紀錄以運作 Roru Family，並可就此向我發送訊息。我可隨時在下方刪除我的資料。（私隱條例 PDPO）",
      join: "加入 / 登入", test_hint: "預覽模式：不會發送短訊。請輸入驗證碼", resend: "重新發送", change: "更改號碼",
      your_plate: "你的碟", rolls_of: "／", rolls: "個手卷", plate_full_soon: "再多一個就集齊！", visited_today: "今日的手卷已上碟 ✓", not_today: "下次光臨時在櫃檯出示",
      your_code: "你的會員碼", show_staff: "向店員出示，或直接說出你的電話號碼。", rewards: "獎賞", no_rewards: "集齊一碟即可獲得第一份獎賞。",
      scratch: "刮開紫菜，看看獎賞", scratch_hint: "← 在此刮開 →", reveal_done: "在櫃檯出示此 QR 以兌換", redeemed: "已兌換", earned: "集齊一碟！刮開看看",
      streak: "連續到訪", streak_line: "最近 {d} 日內到訪 {n}／{t} 次 → 額外 +1 手卷", gold: "金色手卷！", gold_line: "今日出現金色手卷 — 向店員領取金色小禮 🎉",
      history: "最近到訪", tier: "等級", signout: "登出", delete: "刪除我的資料", delete_confirm: "刪除你的 Roru Family 紀錄及所有到訪？此操作無法復原。",
      privacy: "私隱：我們只會把你的手機號碼、名字（可選）、語言、到訪日期及獎賞儲存在 RORUBARU 自己的資料庫，絕不出售。你可隨時按上方按鈕刪除。",
      preview_note: "內部預覽 — 獎賞內容為佔位，待 Dominic 決定。", err_bad_phone: "請輸入有效的手機號碼", err_wrong_code: "驗證碼錯誤，請再試", err_code_expired: "驗證碼已過期，請重新發送",
      err_consent: "請勾選同意方可加入", err_too_many: "嘗試次數過多，請稍後再試", err_net: "連線問題，請再試", member_since: "加入日期",
      gate_title: "預覽", gate_sub: "請輸入預覽密碼", gate_btn: "進入", gate_err: "密碼錯誤", lang_zh: "繁中", lang_en: "EN",
      tier_nori: "Nori 紫菜", tier_gohan: "Gohan 飯", tier_tobiko: "Tobiko 飛魚籽", tier_kama: "Kama", plates_done: "已集齊碟數", next_level: "集齊 {n} 碟升級", top_level: "最高等級 — 多謝你 ❤",
      roll_added: "+1 手卷！", reward_unlocked: "集齊一碟 — 獎賞解鎖！",
      p_tag: "掃描收據，儲積分，食得更好。", p_sub: "在 RORUBARU 每消費 HK$1 得 {r} 分 — 以積分換獎賞。",
      points: "分", your_points: "你的積分", scan: "掃描收據", scan_sub: "影一張收據相片 — 我們會自動讀取總額。", type_instead: "改為手動輸入", reading: "正在讀取收據…", read_ok: "請核對後確認", read_fail: "未能清楚讀取 — 請核對資料",
      receipt_no: "收據／單號", total: "總額 (HK$)", when: "收據上的日期及時間", shop: "分店", confirm_add: "確認並加積分", retake: "重新拍攝",
      added_points: "+{n} 分！", queued: "已交由店員核實 — 批核後積分即到（通常當日）。", pending_hint: "{n} 張收據等待店員批核",
      ladder: "獎賞", claim: "用 {n} 分", need_more: "尚差 {n} 分", claimed: "獎賞解鎖 — 刮開紫菜看看", upgrade: "升級了！紫菜下有更好的 🎉",
      receipts: "你的收據", tier_line: "已消費 {spend} · {next}", tier_next: "再 {n} 升至 {name}", kama_note: "Kama 只限主廚邀請",
      err_receipt_already_used: "此收據已經使用過", err_receipt_too_old: "收據須於 {h} 小時內", err_daily_receipt_limit: "已達每日收據上限 — 可請店員代為加入", err_receipt_no_required: "請輸入收據號碼", err_bad_total: "請核對總額", err_not_enough_points: "積分尚未足夠", err_receipt_in_future: "日期在未來",
      install_tip: "提示：可將此頁加到主畫面"
    }
  };
  let lang = localStorage.getItem("roru_lang") || ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
  const t = (k, vars) => { let s = (L[lang] && L[lang][k]) || L.en[k] || k; if (vars) for (const v in vars) s = s.replace("{" + v + "}", vars[v]); return s; };
  const setLang = (l) => { lang = l; localStorage.setItem("roru_lang", l); document.documentElement.lang = l === "zh" ? "zh-Hant" : "en"; document.dispatchEvent(new Event("roru:lang")); };
  const applyI18n = () => { document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); }); document.querySelectorAll("[data-tp]").forEach(el => { el.placeholder = t(el.dataset.tp); }); document.querySelectorAll(".langs button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang)); };

  async function rpc(fn, args) {
    const r = await fetch(CFG.url + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: CFG.key, Authorization: "Bearer " + CFG.key, "Content-Type": "application/json" }, body: JSON.stringify(args || {}) });
    let body = null; try { body = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error((body && body.message) || ("http_" + r.status)); e.code = (body && body.message) || ("http_" + r.status); throw e; }
    return body;
  }
  const errText = (e) => { const m = { bad_phone: "err_bad_phone", wrong_code: "err_wrong_code", code_expired: "err_code_expired", consent_required: "err_consent", too_many_codes: "err_too_many", too_many_attempts: "err_too_many", receipt_already_used: "err_receipt_already_used", receipt_too_old: "err_receipt_too_old", daily_receipt_limit: "err_daily_receipt_limit", receipt_no_required: "err_receipt_no_required", bad_total: "err_bad_total", not_enough_points: "err_not_enough_points", receipt_in_future: "err_receipt_in_future" }; return m[e.code] ? t(m[e.code], { h: 48 }) : (e.code && !/^http_|fetch/i.test(e.code) ? e.code : t("err_net")); };

  async function sha256(s) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join(""); }
  // Preview gate: the pages stay hidden behind a passcode during the dark phase. Resolves when open.
  function gate() {
    return new Promise(async (resolve) => {
      if (!CFG.passHash || localStorage.getItem("roru_preview_ok") === CFG.passHash) return resolve();
      const q = new URLSearchParams(location.search).get("p");
      if (q && (await sha256(q.trim().toLowerCase())) === CFG.passHash) { localStorage.setItem("roru_preview_ok", CFG.passHash); history.replaceState(null, "", location.pathname); return resolve(); }
      const g = document.createElement("div"); g.className = "gate"; g.lang = document.documentElement.lang;
      g.innerHTML = '<div class="card"><div class="brand" style="margin-bottom:10px"><img src="/logo.png" alt="RORUBARU"><span class="fam">Roru Family</span></div><h2 style="margin-top:4px">' + t("gate_title") + '</h2><p class="muted small">' + t("gate_sub") + '</p><label class="field"><input id="gpass" type="password" autocomplete="off" autocapitalize="off" inputmode="text"></label><div class="err hide" id="gerr">' + t("gate_err") + '</div><button class="btn" id="gbtn">' + t("gate_btn") + '</button></div>';
      document.body.innerHTML = ""; document.body.appendChild(g);
      const go = async () => { const v = g.querySelector("#gpass").value.trim().toLowerCase(); if ((await sha256(v)) === CFG.passHash) { localStorage.setItem("roru_preview_ok", CFG.passHash); location.reload(); } else { g.querySelector("#gerr").classList.remove("hide"); } };
      g.querySelector("#gbtn").onclick = go; g.querySelector("#gpass").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
      g.querySelector("#gpass").focus();
    });
  }

  function qrSvg(text, size) {
    const q = qrcode(0, "M"); q.addData(text); q.make();
    const n = q.getModuleCount(), s = size || 180, c = s / (n + 2);
    let p = "";
    for (let r = 0; r < n; r++) for (let x = 0; x < n; x++) if (q.isDark(r, x)) p += "M" + ((x + 1) * c).toFixed(2) + " " + ((r + 1) * c).toFixed(2) + "h" + c.toFixed(2) + "v" + c.toFixed(2) + "h-" + c.toFixed(2) + "z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges"><rect width="' + s + '" height="' + s + '" fill="#fff"/><path d="' + p + '" fill="#0b0d12"/></svg>';
  }
  // hand roll icon (nori cone, rice, filling) — gold variant
  const rollSvg = (gold) => '<svg class="roll" viewBox="0 0 64 64"><defs><linearGradient id="nori' + (gold ? "g" : "") + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="' + (gold ? "#F3D27A" : "#3d463a") + '"/><stop offset="1" stop-color="' + (gold ? "#C9952E" : "#161c15") + '"/></linearGradient></defs><path d="M8 20 L40 8 L52 46 L20 58 Z" fill="url(#nori' + (gold ? "g" : "") + ')" stroke="' + (gold ? "#E8B84A" : "#5a6456") + '" stroke-width="1.5"/><ellipse cx="34" cy="12" rx="13" ry="7" fill="#F6F3E7"/><path d="M26 9 q8 -9 16 -1 q-4 -3 -8 -1 q-4 -2 -8 2z" fill="#F64501"/><path d="M30 6 q4 -8 10 -4 q-3 0 -4 4z" fill="#4CC38A"/><ellipse cx="34" cy="12" rx="13" ry="7" fill="none" stroke="#e2dfd2" stroke-width="1"/></svg>';

  function toast(msg, ms) { let el = document.querySelector(".toast"); if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); } el.textContent = msg; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), ms || 2200); }
  function burst(colors) { const b = document.createElement("div"); b.className = "burst"; const cs = colors || ["#F64501", "#F6F3E7", "#E8B84A", "#4CC38A"]; for (let i = 0; i < 40; i++) { const s = document.createElement("i"); s.style.left = "50%"; s.style.top = "45%"; s.style.background = cs[i % cs.length]; s.style.setProperty("--dx", (Math.random() * 2 - 1) * 320 + "px"); s.style.setProperty("--dy", (Math.random() * -1 - .2) * 320 + "px"); s.style.animationDelay = (Math.random() * .2) + "s"; b.appendChild(s); } document.body.appendChild(b); setTimeout(() => b.remove(), 1600); if (navigator.vibrate) navigator.vibrate([30, 40, 30]); }
  const fmtDay = (d) => { try { return new Date(d.length === 10 ? d + "T12:00:00+08:00" : d).toLocaleDateString(lang === "zh" ? "zh-HK" : "en-HK", { day: "numeric", month: "short", timeZone: "Asia/Hong_Kong" }); } catch (e) { return d; } };
  const fmtTime = (d) => { try { return new Date(d).toLocaleTimeString(lang === "zh" ? "zh-HK" : "en-HK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Hong_Kong" }); } catch (e) { return d; } };
  setLang(lang);
  return { CFG, t, lang: () => lang, setLang, applyI18n, rpc, errText, gate, qrSvg, rollSvg, toast, burst, fmtDay, fmtTime };
})();
