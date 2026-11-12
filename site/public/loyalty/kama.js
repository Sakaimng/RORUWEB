/* f49e (Oct 22 4:26pm, Dominic): guests pick 1 or 2 guests in the booking sheet (step 2 · Guests, default 2); stored in seats; staff cards + shop WhatsApp say "1 pax" / "2 pax". A 1-pax booking still uses one pass.
   f49c (Oct 22 11:25): guest picks the location first (Wan Chai; Central "Coming soon" from settings), staff Bookings has a Wan Chai | Central toggle + location on each card.
   f49 (Dominic, Oct 22 2026 9:50 AM HKT): Kama Dinner booked in the app.
   Regular menu · Monday to Thursday only · any 30-min slot 12:00-21:00 · no minimum notice · table for 1 or 2 (f49e).
   Guest: "Book Kama Dinner" -> pick a day (Fri-Sun can't be picked) + a time -> optional note -> Requested, waiting for confirmation.
   Staff (Bookings tab on the home lists): Confirm, or Suggest another time -> the guest accepts or declines in the app.
   A Kama pass is used only when the booking is confirmed and comes back if it is cancelled. WhatsApp confirmation + the
   day-before reminder are queued on the server (held: the loyalty WhatsApp number is not live), nothing is sent from here. */
(function () {
  const R = () => window.RORU;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = {
    en: {
      h: "Kama Dinner", title: "Kama Dinner · regular menu", sub: "Table for {n} · Mon–Thu", sub2: "Regular menu|Table for 1 or 2|Mon–Thu", left: "{n} of {m} left", none_left: "0 of {m} left",
      book: "Book Kama Dinner", book_sub: "Mon–Thu · any time 12:00–9:00pm", book2: "Book another Kama Dinner",
      st_requested: "Requested", st_suggested: "Suggested new time", st_confirmed: "Confirmed", st_cancelled: "Cancelled", today: "TODAY",
      w_requested: "Requested · {d}", w_confirmed: "Booked · {d}", w_suggested: "New time · {d}", w_cancelled: "{d}",
      s_requested: "Waiting for confirmation", s_confirmed: "Table for {n} · regular menu", s_confirmed_today: "Tonight! Table for {n} · regular menu",
      s_suggested: "You asked for {d}. Does the new time work?", s_cancel_guest: "You cancelled. Your pass is back.", s_cancel_decline: "You said no to the new time. Nothing was used.",
      s_cancel_staff: "Cancelled by the shop. Your pass is back.", s_cancel_req: "Request cancelled. Nothing was used.",
      cancel_req: "Cancel request", cancel_bk: "Cancel booking", accept: "Accept new time", decline: "Decline", shop_says: "From the shop:",
      sheet_nav: "Kama Dinner", sheet_t: "Book Kama Dinner", sheet_s: "Regular menu · table for 1 or 2", pick_day: "1 · Pick a day", pick_time: "2 · Pick a time", note_l: "5 · Note (optional)", pax_l: "2 · Guests", pax_1: "1 guest", pax_2: "2 guests", pax_n: "Table for {n}", pick_day3: "3 · Pick a day", pick_time3: "4 · Pick a time", pax_note: "Same 1 pass for 1 or 2 guests.", loc_l: "1 · Pick a location", pick_day2: "2 · Pick a day", pick_time2: "3 · Pick a time", soon: "Coming soon", h_t: "Your {t} member perk",
      note_ph: "Anything we should know? e.g. allergies", closed_note: "Kama Dinner is Monday to Thursday. Fri, Sat and Sun can't be picked.",
      pick_first: "Pick a day first", send: "Send request", sum_none: "Pick a day and a time", pass_note: "Your pass is used only when the shop confirms.",
      done_t: "Requested", done_s: "Waiting for confirmation", done_p: "We'll confirm in the app. You can cancel any time before then.", done_btn: "Done",
      ask_cancel_bk: "Cancel this booking?", ask_cancel_req: "Cancel this request?", ask_p_bk: "{d}. Your Kama pass comes back.", ask_p_req: "{d}. Nothing has been used yet.",
      ask_decline: "Say no to the new time?", ask_p_decline: "{d}. The request closes and you can book again.", yes_cancel: "Yes, cancel", yes_decline: "Yes, decline", keep: "Keep it",
      t_requested: "Request sent", t_cancelled: "Cancelled · your pass is back", t_req_cancelled: "Request cancelled", t_accepted: "Booked", t_declined: "Declined",
      back: "Back", close: "Close", prev: "Previous month", next: "Next month", today_s: "Today", g_lunch: "Lunch", g_aft: "Afternoon", g_dinner: "Dinner", left_pending: "{n} left · 1 pending", done_t1: "Requested", notify: "We'll let you know here as soon as the shop confirms.", add_cal: "Add to calendar", walkin: "Use 1 pass now (walk-in)",
      // staff
      k_tab: "Bookings", k_h: "Kama Dinner bookings", k_req: "Requests · {n}", k_sug: "Waiting for the guest · {n}", k_up: "Confirmed · {n}", k_can: "Cancelled · last 7 days · {n}",
      k_none_req: "No new requests.", k_none_up: "No confirmed bookings coming up.", k_seats: "{n} pax", k_passes: "Passes {n} of {m} left",
      k_confirm: "Confirm", k_suggest: "Suggest another time", k_cancel: "Cancel booking", k_withdraw: "Withdraw suggestion", k_asked: "Guest asked for {d}", k_sent: "Suggested {d}",
      k_wa: "WhatsApp confirmation + day-before reminder queued (not sent: the loyalty WhatsApp number isn't live yet)", k_by: "by {s}",
      k_sug_t: "Suggest another time", k_sug_s: "{who} asked for {d}", k_sug_note: "Message to the guest (optional)", k_sug_send: "Send to guest", k_sug_ph: "e.g. 7:30 is full, 8:30 is free",
      k_confirmed: "Confirmed · 1 pass used", k_suggested: "Sent. The guest will accept or decline in the app.", k_cancelled: "Cancelled · the pass is back",
      k_ask_cancel: "Cancel {who}'s booking?", k_ask_p: "{d}. Their Kama pass comes back.", k_foot: "Kama Dinner for TOBIKO (1 a year) and KAMA (2 a year) members · Mon–Thu, 12:00–9:00pm · table for 1 or 2 · regular menu. A pass is used only when you confirm.", k_none_loc: "No bookings for {l} yet.", k_soon_loc: "{l} is coming soon. Its Kama Dinner bookings will show here.",
      k_ago_m: "{n} min ago", k_ago_h: "{n} h ago", k_ago_d: "{n} d ago", k_now: "just now",
      e_kama_day_closed: "Kama Dinner is Monday to Thursday only.", e_kama_date_range: "Pick a day from today up to 60 days ahead.", e_kama_time_range: "Pick a time between 12:00 and 9:00pm.",
      e_kama_time_past: "That time has already passed. Pick a later one.", e_kama_pick_slot: "Pick a day and a time.", e_no_passes_left: "No Kama passes left this year.",
      e_kama_already_requested: "You already have a request waiting.", e_kama_same_day: "You already have a booking that day.", e_kama_already_answered: "Someone already answered this one.",
      e_kama_not_suggested: "This booking changed. Pull down to refresh.", e_kama_already_cancelled: "Already cancelled.", e_kama_too_late: "This booking has already started.", e_not_kama: "Kama Dinner is for Tobiko and Kama members.", e_kama_location_closed: "That location is coming soon. Pick Wan Chai for now.", e_kama_pick_location: "Pick a location.", e_kama_pick_party: "Pick 1 or 2 guests."
    },
    zh: {
      h: "Kama 晚宴", title: "Kama 晚宴 · 正常菜單", sub: "{n} 位 · 星期一至四", sub2: "正常菜單|1 或 2 位|星期一至四", left: "尚餘 {n}/{m} 次", none_left: "尚餘 0/{m} 次",
      book: "預約 Kama 晚宴", book_sub: "星期一至四 · 12:00–21:00 任何時間", book2: "再預約一次 Kama 晚宴",
      st_requested: "已申請", st_suggested: "建議新時間", st_confirmed: "已確認", st_cancelled: "已取消", today: "今日",
      w_requested: "已申請 · {d}", w_confirmed: "已預約 · {d}", w_suggested: "新時間 · {d}", w_cancelled: "{d}",
      s_requested: "等待確認", s_confirmed: "{n} 位 · 正常菜單", s_confirmed_today: "就係今晚！{n} 位 · 正常菜單",
      s_suggested: "你原本揀咗 {d}。新時間得唔得？", s_cancel_guest: "你已取消，次數已退返。", s_cancel_decline: "你拒絕咗新時間，冇用到次數。",
      s_cancel_staff: "餐廳已取消，次數已退返。", s_cancel_req: "申請已取消，冇用到次數。",
      cancel_req: "取消申請", cancel_bk: "取消預約", accept: "接受新時間", decline: "拒絕", shop_says: "餐廳留言：",
      sheet_nav: "Kama 晚宴", sheet_t: "預約 Kama 晚宴", sheet_s: "正常菜單 · 1 或 2 位", pick_day: "1 · 揀日子", pick_time: "2 · 揀時間", note_l: "5 · 備註（可選）", pax_l: "2 · 人數", pax_1: "1 位", pax_2: "2 位", pax_n: "{n} 位", pick_day3: "3 · 揀日子", pick_time3: "4 · 揀時間", pax_note: "1 位或 2 位都係用 1 次。", loc_l: "1 · 揀分店", pick_day2: "2 · 揀日子", pick_time2: "3 · 揀時間", soon: "即將開業", h_t: "你的 {t} 會員禮遇",
      note_ph: "有咩要我哋知？例如敏感食物", closed_note: "Kama 晚宴只限星期一至四，星期五、六、日揀唔到。",
      pick_first: "請先揀日子", send: "送出申請", sum_none: "請揀日子同時間", pass_note: "餐廳確認後先會用一次。",
      done_t: "已申請", done_s: "等待確認", done_p: "我哋會喺 App 內確認。確認前你隨時可以取消。", done_btn: "完成",
      ask_cancel_bk: "取消呢個預約？", ask_cancel_req: "取消呢個申請？", ask_p_bk: "{d}。Kama 次數會退返。", ask_p_req: "{d}。未用到任何次數。",
      ask_decline: "拒絕新時間？", ask_p_decline: "{d}。申請會關閉，你可以再預約。", yes_cancel: "確定取消", yes_decline: "確定拒絕", keep: "保留",
      t_requested: "申請已送出", t_cancelled: "已取消 · 次數已退返", t_req_cancelled: "申請已取消", t_accepted: "已預約", t_declined: "已拒絕",
      back: "返回", close: "關閉", prev: "上個月", next: "下個月", today_s: "今日", g_lunch: "午餐", g_aft: "下午", g_dinner: "晚餐", left_pending: "尚餘 {n} 次 · 1 個待確認", done_t1: "已申請", notify: "餐廳一確認，我哋會喺呢度通知你。", add_cal: "加入日曆", walkin: "即場用 1 次（冇預約）",
      k_tab: "預約", k_h: "Kama 晚宴預約", k_req: "新申請 · {n}", k_sug: "等客人回覆 · {n}", k_up: "已確認 · {n}", k_can: "已取消 · 最近 7 日 · {n}",
      k_none_req: "冇新申請。", k_none_up: "冇即將嚟嘅預約。", k_seats: "{n} 位", k_passes: "尚餘 {n}/{m} 次",
      k_confirm: "確認", k_suggest: "建議其他時間", k_cancel: "取消預約", k_withdraw: "撤回建議", k_asked: "客人揀咗 {d}", k_sent: "已建議 {d}",
      k_wa: "WhatsApp 確認同前一日提醒已排隊（未發送：會員 WhatsApp 號碼未啟用）", k_by: "由 {s}",
      k_sug_t: "建議其他時間", k_sug_s: "{who} 揀咗 {d}", k_sug_note: "俾客人嘅留言（可選）", k_sug_send: "傳俾客人", k_sug_ph: "例如 19:30 滿咗，20:30 有位",
      k_confirmed: "已確認 · 用咗 1 次", k_suggested: "已傳送，客人會喺 App 內接受或拒絕。", k_cancelled: "已取消 · 次數已退返",
      k_ask_cancel: "取消 {who} 嘅預約？", k_ask_p: "{d}。佢嘅 Kama 次數會退返。", k_foot: "Kama 晚宴適用於 TOBIKO（每年 1 次）及 KAMA（每年 2 次）會員 · 星期一至四 12:00–21:00 · 1 或 2 位 · 正常菜單。確認後才會使用一次。", k_none_loc: "{l}暫時未有預約。", k_soon_loc: "{l}即將開業，之後嘅 Kama 晚宴預約會喺呢度顯示。",
      k_ago_m: "{n} 分鐘前", k_ago_h: "{n} 小時前", k_ago_d: "{n} 日前", k_now: "啱啱",
      e_kama_day_closed: "Kama 晚宴只限星期一至四。", e_kama_date_range: "請揀今日起 60 日內嘅日子。", e_kama_time_range: "請揀 12:00 至 21:00 之間嘅時間。",
      e_kama_time_past: "呢個時間已經過咗，請揀遲啲。", e_kama_pick_slot: "請揀日子同時間。", e_no_passes_left: "今年 Kama 次數已用完。",
      e_kama_already_requested: "你已經有一個申請等緊確認。", e_kama_same_day: "嗰日你已經有預約。", e_kama_already_answered: "已經有人處理咗。",
      e_kama_not_suggested: "預約有更新，請下拉重新整理。", e_kama_already_cancelled: "已經取消咗。", e_kama_too_late: "呢個預約已經開始咗。", e_not_kama: "Kama 晚宴只限 Tobiko 及 Kama 會員。", e_kama_location_closed: "呢間分店即將開業，暫時請揀灣仔。", e_kama_pick_location: "請揀分店。", e_kama_pick_party: "請揀 1 位或 2 位。"
    }
  };
  // 简中: the app turns 繁 into 简 on screen (loyalty.js hans), so the zh table covers both
  const lk = () => (R().lang() === "zh" ? "zh" : "en");
  const tx = (k, v) => { let s = L[lk()][k]; if (s == null) s = L.en[k]; if (s == null) s = k; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; };
  const errT = (e) => { const c = e && e.code; return (c && (L[lk()]["e_" + c] || L.en["e_" + c])) || R().errText(e); };
  const IC = {
    kama: '<path d="M3.5 13.5h17a8.5 8.5 0 01-17 0z"/><path d="M8 20.5h8"/><path d="M14.5 3.5l-4 7.5M19 4l-6 7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', check: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.7 2.7L16.2 9.5"/>',
    swap: '<path d="M4 8.5h13.5M14 5l3.5 3.5L14 12"/><path d="M20 15.5H6.5M10 12l-3.5 3.5L10 19"/>', xc: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', back: '<path d="M15 5l-7 7 7 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    next: '<path d="M9 5l7 7-7 7"/>', note: '<path d="M5 4.5h14v11l-4.5 4.5H5z"/><path d="M14.5 20v-4.5H19"/><path d="M8.5 9h7M8.5 12.5h4"/>',
    person: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.7-3.7 3.3-5.6 6.5-5.6s5.8 1.9 6.5 5.6"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.5 14.6c2.4-.2 4.3 1.1 5 3.9"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    sun: '<circle cx="12" cy="12" r="3.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'
  };
  const ic = (k, w) => '<svg class="kic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + "</svg>";
  // f49c: locations come from the server (settings location_<id>_open), Central "Coming soon" until switched on
  const LOC0 = [{ id: "wanchai", en: "Wan Chai", zh: "灣仔", open: true }, { id: "central", en: "Central", zh: "中環", open: false }];
  const locs = (rules) => (rules && rules.locations && rules.locations.length ? rules.locations : LOC0);
  const locName = (id, rules) => { const l = locs(rules).find(x => x.id === (id || "wanchai")) || LOC0.find(x => x.id === id) || { en: id, zh: id }; return lk() === "zh" ? l.zh : l.en; };
  const ST_IC = { requested: "clock", suggested: "swap", confirmed: "check", cancelled: "xc" };

  // ---------- dates (HK wall-clock strings, never the device's zone) ----------
  const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], DOW_ZH = ["日", "一", "二", "三", "四", "五", "六"];
  const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONL_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const pd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const ds = (dt) => dt.toISOString().slice(0, 10);
  const addD = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return ds(d); };
  const dow = (s) => pd(s).getUTCDay();
  const iso = (s) => { const w = dow(s); return w === 0 ? 7 : w; };
  const tLbl = (t) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); if (lk() !== "en") return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + (h < 12 ? "am" : "pm"); };
  const dLbl = (s, long) => { if (!s) return ""; const d = pd(s); if (lk() !== "en") return (d.getUTCMonth() + 1) + "月" + d.getUTCDate() + "日（" + (long ? "星期" : "") + DOW_ZH[d.getUTCDay()] + "）"; return DOW_EN[d.getUTCDay()] + " " + d.getUTCDate() + " " + MON_EN[d.getUTCMonth()]; };
  const dt = (d, t) => dLbl(d) + (lk() === "en" ? " · " : " ") + tLbl(t);
  const hkToday = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const hkNow = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(11, 16);
  function slots(rules, day) {
    const out = [], [fh, fm] = (rules.first || "12:00").split(":").map(Number), [lh, lm] = (rules.last || "21:00").split(":").map(Number), step = rules.step || 30;
    for (let m = fh * 60 + fm; m <= lh * 60 + lm; m += step) { const t = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); out.push({ t, past: day === hkToday() && t <= hkNow() }); }
    return out;
  }
  const dayOk = (rules, s) => { const t = hkToday(); return (rules.days || [1, 2, 3, 4]).includes(iso(s)) && s >= t && s <= addD(t, rules.ahead || 60); };

  // ---------- small shared bits ----------
  const tok = () => { try { return localStorage.getItem("roru_member_token"); } catch (e) { return null; } };
  const busy = (b, on) => { if (b) { b.disabled = on; b.classList.toggle("busy", on); } };
  const pill = (st) => '<span class="kd-pill st-' + st + '">' + ic(ST_IC[st] || "clock", 2.2) + "<span>" + esc(tx("st_" + st)) + "</span></span>";
  const todayB = (b) => (b.is_today && b.status !== "cancelled" ? '<span class="kd-today">' + ic("sun", 2.2) + esc(tx("today")) + "</span>" : "");
  function ask(title, body, yes, danger) {
    return new Promise(res => {
      const o = document.createElement("div"); o.className = "kd-ask"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
      o.innerHTML = '<div class="kd-ask-in"><b>' + esc(title) + "</b><p>" + esc(body) + '</p><button type="button" class="kd-btn' + (danger ? " danger" : "") + '" data-y>' + esc(yes) + '</button><button type="button" class="kd-btn sec" data-n>' + esc(tx("keep")) + "</button></div>";
      const done = (v) => { o.remove(); res(v); };
      o.addEventListener("click", (e) => { if (e.target === o) done(false); });
      o.querySelector("[data-y]").onclick = () => done(true); o.querySelector("[data-n]").onclick = () => done(false);
      document.body.appendChild(o);
    });
  }
  function sheet(navT, onClose) {
    const o = document.createElement("div"); o.className = "kd-sheet"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
    o.innerHTML = '<div class="kd-sheet-in"><div class="kd-nav"><button type="button" class="kd-cb" data-back aria-label="' + esc(tx("back")) + '">' + ic("back", 2.4) + '</button><span class="kd-nav-t">' + esc(navT) + '</span><button type="button" class="kd-cb" data-x aria-label="' + esc(tx("close")) + '">' + ic("x", 2.4) + '</button></div><div class="kd-body"></div></div>';
    document.body.appendChild(o); document.documentElement.classList.add("kd-open");
    let closed = false;
    const api = { el: o, body: o.querySelector(".kd-body"), close: () => { if (closed) return; closed = true; o.remove(); if (!document.querySelector(".kd-sheet")) document.documentElement.classList.remove("kd-open"); window.removeEventListener("popstate", onPop); if (onClose) onClose(); } };
    const onPop = () => api.close();
    try { history.pushState({ kd: 1 }, ""); window.addEventListener("popstate", onPop); } catch (e) {}
    const shut = () => { if (history.state && history.state.kd) { try { history.back(); return; } catch (e) {} } api.close(); };
    o.querySelector("[data-x]").onclick = shut; o.querySelector("[data-back]").onclick = shut;
    return api;
  }
  // day + time picker shared by the guest sheet and staff "Suggest another time"
  function icsDownload(b, rules) {
    const z = (n) => String(n).padStart(2, "0");
    const [y, mo, d] = b.date.split("-").map(Number), [h, mi] = String(b.time).slice(0, 5).split(":").map(Number);
    const st = new Date(Date.UTC(y, mo - 1, d, h - 8, mi)), en = new Date(st.getTime() + 90 * 60000); // HK is UTC+8, no DST
    const f = (x) => x.getUTCFullYear() + z(x.getUTCMonth() + 1) + z(x.getUTCDate()) + "T" + z(x.getUTCHours()) + z(x.getUTCMinutes()) + "00Z";
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RORUBARU//Kama Dinner//EN", "BEGIN:VEVENT", "UID:kama-" + b.id + "@rorubaru.com", "DTSTAMP:" + f(new Date()),
      "DTSTART:" + f(st), "DTEND:" + f(en), "SUMMARY:Kama Dinner · RORUBARU (" + tx("st_requested") + ")", "LOCATION:RORUBARU " + locName(b.shop_id, rules), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "kama-dinner.ics";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function picker(host, rules, sel, onChange, opts) {
    // f55 (impeccable review, Dominic "fix all of it" Oct 27): no month grid of mostly dead days. A swipeable strip of only the days that
    // can be picked (Mon–Thu, today up to the booking window), "Today" marked with a small dot (not a ring that looks selected), and the
    // times grouped Lunch / Afternoon / Dinner so only one group shows at a time (Dinner first: it's a dinner perk).
    opts = opts || {};
    const first = hkToday(), last = addD(first, rules.ahead || 60);
    const days = []; for (let s = first; s <= last && days.length < 40; s = addD(s, 1)) if (dayOk(rules, s)) days.push(s);
    const GR = [["lunch", 0, 14 * 60 + 59], ["aft", 15 * 60, 17 * 60 + 59], ["dinner", 18 * 60, 24 * 60]];
    const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const grpOf = (t) => (GR.find(g => mins(t) >= g[1] && mins(t) <= g[2]) || GR[2])[0];
    let grp = sel.time ? grpOf(sel.time) : "dinner";
    const chip = (s) => { const d = pd(s), en = lk() === "en";
      const top = s === first ? tx("today_s") : (en ? DOW_EN[d.getUTCDay()] : "星期" + DOW_ZH[d.getUTCDay()]);
      const bot = en ? MON_EN[d.getUTCMonth()] : (d.getUTCMonth() + 1) + "月";
      return '<button type="button" class="kd-dc' + (s === sel.date ? " on" : "") + (s === first ? " is-today" : "") + '" data-day="' + s + '" aria-pressed="' + (s === sel.date) + '" aria-label="' + esc(dLbl(s, true)) + '"><i>' + esc(top) + "</i><b>" + d.getUTCDate() + "</b><i>" + esc(bot) + "</i></button>"; };
    const draw = () => {
      const sl = sel.date ? slots(rules, sel.date) : [];
      const avail = (g) => sl.filter(x => grpOf(x.t) === g[0] && !x.past).length;
      if (sel.date && !avail(GR.find(g => g[0] === grp)) && !sel.time) { const g2 = [...GR].reverse().find(g => avail(g)); if (g2) grp = g2[0]; }
      const shown = sl.filter(x => grpOf(x.t) === grp);
      const tabs = '<div class="kd-tg" role="tablist">' + GR.map(g => { const n = avail(g); return '<button type="button" role="tab" class="kd-tgb' + (g[0] === grp ? " on" : "") + '" data-grp="' + g[0] + '" aria-selected="' + (g[0] === grp) + '"' + (sel.date && !n ? " disabled" : "") + ">" + esc(tx("g_" + g[0])) + "</button>"; }).join("") + "</div>";
      host.innerHTML = '<div class="kd-lbl">' + esc(opts.dayLabel || tx("pick_day")) + "</div>" +
        '<div class="kd-strip" role="group">' + days.map(chip).join("") + "</div>" +
        '<p class="kd-closed">' + ic("cal", 1.8) + esc(tx("closed_note")) + "</p>" +
        '<div class="kd-lbl">' + esc(opts.timeLabel || tx("pick_time")) + "</div>" +
        (sel.date ? tabs + '<div class="kd-times">' + shown.map(x => '<button type="button" class="kd-time' + (x.t === sel.time ? " on" : "") + '" data-time="' + x.t + '"' + (x.past ? " disabled" : "") + ' aria-pressed="' + (x.t === sel.time) + '">' + esc(tLbl(x.t)) + "</button>").join("") + "</div>"
                  : '<p class="kd-hint">' + esc(tx("pick_first")) + "</p>");
      const strip = host.querySelector(".kd-strip"), on = strip.querySelector(".kd-dc.on");
      if (on) strip.scrollLeft = Math.max(0, on.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2);
      host.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { const x = strip.scrollLeft; sel.date = b.dataset.day; if (sel.time && slots(rules, sel.date).find(y => y.t === sel.time && y.past)) sel.time = null; draw(); host.querySelector(".kd-strip").scrollLeft = x; onChange(); });
      host.querySelectorAll("[data-grp]").forEach(b => b.onclick = () => { if (b.disabled) return; const x = strip.scrollLeft; grp = b.dataset.grp; draw(); host.querySelector(".kd-strip").scrollLeft = x; });
      host.querySelectorAll("[data-time]").forEach(b => b.onclick = () => { if (b.disabled) return; const x = strip.scrollLeft; sel.time = b.dataset.time; draw(); host.querySelector(".kd-strip").scrollLeft = x; onChange(); });
    };
    draw(); return { redraw: draw };
  }

  // =================== guest ===================
  const G = { me: null, k: null, at: 0, sig: "", loading: false };
  async function gLoad(force) {
    if (!tok() || G.loading) return; if (!force && Date.now() - G.at < 15000) return;
    G.loading = true; try { G.k = await R().rpc("family_kama", { p_token: tok() }); G.at = Date.now(); } catch (e) { /* keep the last one */ } G.loading = false; gDraw();
  }
  function gApply(r) { if (r && r.kama) { G.k = r.kama; G.at = Date.now(); } if (r && r.member) document.dispatchEvent(new CustomEvent("roru:member", { detail: r.member })); gDraw(true); }
  function bkHtml(b, n) {
    const when = tx("w_" + b.status, { d: dt(b.date, b.time) });
    let sub = "", acts = "", extra = "";
    const px = tx("pax_n", { n: b.seats || n }) + " · "; // f49e
    if (b.status === "requested") { sub = px + tx("s_requested"); acts = '<button type="button" class="kd-btn sec sm" data-kd-cancel="' + b.id + '">' + esc(tx("cancel_req")) + "</button>"; }
    else if (b.status === "suggested") {
      sub = px + tx("s_suggested", { d: dt(b.req_date, b.req_time) });
      if (b.sug_note) extra = '<div class="kd-msg">' + ic("note", 1.8) + "<span><b>" + esc(tx("shop_says")) + "</b> " + esc(b.sug_note) + "</span></div>";
      acts = '<button type="button" class="kd-btn sm" data-kd-accept="' + b.id + '">' + esc(tx("accept")) + '</button><button type="button" class="kd-btn sec sm" data-kd-decline="' + b.id + '">' + esc(tx("decline")) + "</button>";
    } else if (b.status === "confirmed") { sub = tx(b.is_today ? "s_confirmed_today" : "s_confirmed", { n: b.seats || n }); if (!b.is_past) acts = '<button type="button" class="kd-btn sec sm" data-kd-cancel="' + b.id + '">' + esc(tx("cancel_bk")) + "</button>"; }
    else { sub = b.cancelled_by === "staff" ? tx("s_cancel_staff") : b.cancel_reason === "declined the other time" ? tx("s_cancel_decline") : b.confirmed_at ? tx("s_cancel_guest") : tx("s_cancel_req"); }
    const whenTxt = b.status === "suggested" ? tx("w_suggested", { d: dt(b.sug_date, b.sug_time) }) : b.status === "cancelled" ? dt(b.date, b.time) : when;
    return '<div class="kd-bk st-' + b.status + '" data-kd-bk="' + b.id + '"><div class="kd-st">' + pill(b.status) + todayB(b) + '</div><div class="kd-when">' + esc(whenTxt) + '</div><div class="kd-sub"><span class="kd-loc-t">' + ic("pin", 2) + esc(locName(b.shop_id, G.k && G.k.rules)) + "</span> · " + esc(sub) + "</div>" + extra + (acts ? '<div class="kd-acts">' + acts + "</div>" : "") + "</div>";
  }
  const KT = (t) => t === "kama" || t === "tobiko"; // f49b: Tobiko (1 a year) and Kama (2 a year) both book
  function gDraw(force) {
    const host = document.getElementById("kamaHost"); if (!host) return;
    const me = G.me, k = G.k;
    if (!me || !KT(me.tier) || !k || !k.eligible) { host.classList.add("hide"); host.innerHTML = ""; return; }
    const recent = (k.open || []).length ? [] : (k.recent || []).filter(b => b.status === "cancelled" && Date.now() - new Date(b.cancelled_at).getTime() < 48 * 3600e3).slice(0, 1); // a just-cancelled one stays labelled for 2 days, only while nothing else is open
    const sig = JSON.stringify([lk(), k.open, recent.map(b => b.id), k.left, k.can_request, hkToday()]);
    if (!force && sig === G.sig && host.innerHTML) return; G.sig = sig;
    const seats = (k.rules && k.rules.seats) || 2;
    const pend = (k.open || []).filter(b => b.status === "requested" || b.status === "suggested").length; // f55: a waiting request shows as pending, so the guest knows it hasn't counted yet
    const leftTxt = pend && k.left > 0 ? tx("left_pending", { n: k.left }) : k.left > 0 ? tx("left", { n: k.left, m: k.passes }) : tx("none_left", { m: k.passes });
    host.classList.remove("hide");
    host.innerHTML = '<h2 class="ig-h">' + esc(tx("h_t", { t: k.tier === "tobiko" ? "Tobiko" : "Kama" })) + '</h2><div class="ig kd">' +
      '<div class="kd-head"><span class="ig-art kd-art">' + ic("kama", 1.9) + '</span><span class="ig-t"><b>' + esc(tx("h")) + '</b><small class="kd-segs">' + tx("sub2", { n: seats }).split("|").map(x => "<span>" + esc(x) + "</span>").join('<i aria-hidden="true">·</i>') + '</small></span><span class="kd-left' + (k.left > 0 ? "" : " used") + '">' + esc(leftTxt) + "</span></div>" +
      (k.open || []).map(b => bkHtml(b, seats)).join("") + recent.map(b => bkHtml(b, seats)).join("") +
      (k.can_request ? ((k.open || []).length ? '<div class="kd-cta"><button type="button" class="kd-btn sec" id="kdBook">' + ic("cal", 2.2) + esc(tx("book2")) + "</button></div>"
                    : '<div class="kd-cta"><button type="button" class="kd-btn" id="kdBook">' + ic("cal", 2.2) + esc(tx("book")) + "</button><small>" + esc(tx("book_sub")) + "</small></div>") : "") +
      "</div>";
    const bb = host.querySelector("#kdBook"); if (bb) bb.onclick = () => openBook();
    host.querySelectorAll("[data-kd-cancel]").forEach(b => b.onclick = async () => {
      const bk = (k.open || []).find(x => x.id === +b.dataset.kdCancel); if (!bk) return; const conf = bk.status === "confirmed";
      if (!(await ask(tx(conf ? "ask_cancel_bk" : "ask_cancel_req"), tx(conf ? "ask_p_bk" : "ask_p_req", { d: dt(bk.date, bk.time) }), tx("yes_cancel"), true))) return;
      busy(b, true); try { const r = await R().rpc("family_kama_cancel", { p_token: tok(), p_id: bk.id }); gApply(r); R().toast(tx(conf ? "t_cancelled" : "t_req_cancelled"), 2600); } catch (e) { R().toast(errT(e), 3000); busy(b, false); gLoad(true); }
    });
    host.querySelectorAll("[data-kd-accept]").forEach(b => b.onclick = async () => {
      busy(b, true); try { const r = await R().rpc("family_kama_answer", { p_token: tok(), p_id: +b.dataset.kdAccept, p_accept: true }); gApply(r); R().toast(tx("t_accepted"), 2600); } catch (e) { R().toast(errT(e), 3000); busy(b, false); gLoad(true); }
    });
    host.querySelectorAll("[data-kd-decline]").forEach(b => b.onclick = async () => {
      const bk = (k.open || []).find(x => x.id === +b.dataset.kdDecline); if (!bk) return;
      if (!(await ask(tx("ask_decline"), tx("ask_p_decline", { d: dt(bk.sug_date, bk.sug_time) }), tx("yes_decline"), true))) return;
      busy(b, true); try { const r = await R().rpc("family_kama_answer", { p_token: tok(), p_id: bk.id, p_accept: false }); gApply(r); R().toast(tx("t_declined"), 2600); } catch (e) { R().toast(errT(e), 3000); busy(b, false); gLoad(true); }
    });
  }
  function openBook() {
    const k = G.k; if (!k) return; const rules = k.rules || {}, seats = rules.seats || 2;
    const sh = sheet(tx("sheet_nav"), () => gLoad(true));
    const L0 = locs(rules), op = L0.find(l => l.open) || L0[0];
    const maxP = Math.min(2, Math.max(1, +rules.seats || 2));
    const sel = { date: null, time: null, shop: op.id, seats: maxP };
    const locHtml = () => '<div class="kd-lbl">' + esc(tx("loc_l")) + '</div><div class="kd-locs">' + L0.map(l => '<button type="button" class="kd-loc' + (l.id === sel.shop ? " on" : "") + (l.open ? "" : " soon") + '" data-loc="' + esc(l.id) + '"' + (l.open ? "" : " disabled") + ' aria-pressed="' + (l.id === sel.shop) + '">' + ic("pin", 2) + "<b>" + esc(lk() === "zh" ? l.zh : l.en) + "</b>" + (l.open ? "" : '<span class="kd-soon">' + esc(tx("soon")) + "</span>") + "</button>").join("") + "</div>";
    // f49e: party size, a segmented 1 | 2 (default 2). Both use one pass.
    const paxHtml = () => '<div class="kd-lbl" id="kdPaxL">' + esc(tx("pax_l")) + '</div><div class="kd-pax" role="radiogroup" aria-labelledby="kdPaxL">' + [1, 2].filter(n => n <= maxP).map(n => '<button type="button" role="radio" class="kd-px' + (n === sel.seats ? " on" : "") + '" data-pax="' + n + '" aria-checked="' + (n === sel.seats) + '">' + ic(n === 1 ? "person" : "people", 2) + "<b>" + esc(tx("pax_" + n)) + "</b></button>").join("") + '</div><p class="kd-pax-n">' + esc(tx("pax_note")) + "</p>";
    sh.body.innerHTML = '<div class="kd-ttl">' + esc(tx("sheet_t")) + '</div><p class="kd-s">' + ic("kama", 1.9) + esc(tx("sheet_s")) + '</p><div id="kdLoc">' + locHtml() + '</div><div id="kdPax">' + paxHtml() + '</div><div id="kdPick"></div>' +
      '<div class="kd-lbl">' + esc(tx("note_l")) + '</div><textarea id="kdNote" class="kd-note" maxlength="300" rows="2" placeholder="' + esc(tx("note_ph")) + '"></textarea>' +
      '<div class="kd-foot"><div class="kd-sum" id="kdSum"></div><div class="kd-err hide" id="kdErr"></div><button type="button" class="kd-btn big" id="kdSend" disabled>' + esc(tx("send")) + '</button><p class="kd-pass">' + ic("check", 1.8) + esc(tx("pass_note")) + "</p></div>";
    const sum = () => { const s = sh.body.querySelector("#kdSum"), btn = sh.body.querySelector("#kdSend"); const ok = sel.date && sel.time; btn.disabled = !ok;
      s.innerHTML = ok ? ic("cal", 2) + "<b>" + esc(dt(sel.date, sel.time)) + "</b><span>" + esc(locName(sel.shop, rules)) + " · " + esc(tx("pax_n", { n: sel.seats })) + "</span>" : '<span class="muted">' + esc(tx("sum_none")) + "</span>"; };
    const wireLoc = () => sh.body.querySelectorAll("[data-loc]").forEach(b => b.onclick = () => { if (b.disabled) return; sel.shop = b.dataset.loc; sh.body.querySelector("#kdLoc").innerHTML = locHtml(); wireLoc(); sum(); });
    wireLoc();
    const wirePax = () => sh.body.querySelectorAll("[data-pax]").forEach(b => b.onclick = () => { sel.seats = +b.dataset.pax; sh.body.querySelector("#kdPax").innerHTML = paxHtml(); wirePax(); sum(); });
    wirePax();
    picker(sh.body.querySelector("#kdPick"), rules, sel, sum, { dayLabel: tx("pick_day3"), timeLabel: tx("pick_time3") }); sum();
    sh.body.querySelector("#kdSend").onclick = async (e) => {
      const btn = e.currentTarget, er = sh.body.querySelector("#kdErr"); er.classList.add("hide"); busy(btn, true);
      try {
        const r = await R().rpc("family_kama_request", { p_token: tok(), p_date: sel.date, p_time: sel.time, p_shop: sel.shop, p_seats: sel.seats, p_note: sh.body.querySelector("#kdNote").value || null });
        gApply(r); const b = r.booking;
        // f55: one short display line ("Requested"), the details in the body font, what happens next, and something to do (add to calendar)
        sh.body.innerHTML = '<div class="kd-done"><span class="kd-done-ic st-requested">' + ic("clock", 1.8) + '</span><div class="kd-done-t1">' + esc(tx("done_t1")) + '</div><div class="kd-done-s">' + esc(tx("done_s")) + '</div><div class="kd-done-w">' + [dt(b.date, b.time), locName(b.shop_id, rules), tx("pax_n", { n: b.seats || sel.seats })].map(x => "<span>" + esc(x) + "</span>").join(" · ") + "</div>" +
          (b.note ? '<div class="kd-msg">' + ic("note", 1.8) + "<span>" + esc(b.note) + "</span></div>" : "") + '<p class="kd-done-p">' + ic("check", 1.8) + "<span>" + esc(tx("notify")) + " " + esc(tx("done_p").split(". ").slice(1).join(". ") || "") + '</span></p></div><div class="kd-foot kd-foot2"><button type="button" class="kd-btn sec big" id="kdCal">' + ic("cal", 2) + esc(tx("add_cal")) + '</button><button type="button" class="kd-btn big" id="kdDone">' + esc(tx("done_btn")) + "</button></div>";
        sh.body.querySelector("#kdDone").onclick = () => sh.el.querySelector("[data-x]").click();
        sh.body.querySelector("#kdCal").onclick = () => icsDownload(b, rules);
        R().toast(tx("t_requested"), 2200);
      } catch (err) { er.textContent = errT(err); er.classList.remove("hide"); busy(btn, false); }
    };
  }
  function guest(me) { G.me = me; if (!me || !KT(me.tier)) { gDraw(); return; } gDraw(); gLoad(false); }
  document.addEventListener("roru:lang", () => { gDraw(true); sDraw(); });

  // =================== staff ===================
  const S = { token: null, d: null, onCount: null, shop: (function () { try { return sessionStorage.getItem("roru_kama_shop") || "wanchai"; } catch (e) { return "wanchai"; } })() };
  const ago = (iso0) => { const m = Math.max(0, Math.round((Date.now() - new Date(iso0).getTime()) / 60000)); return m < 1 ? tx("k_now") : m < 60 ? tx("k_ago_m", { n: m }) : m < 1440 ? tx("k_ago_h", { n: Math.round(m / 60) }) : tx("k_ago_d", { n: Math.round(m / 1440) }); };
  async function sLoad() { if (!S.token) return; try { S.d = await R().rpc("staff_kama_list", { p_token: S.token() }); } catch (e) { return; } sDraw(); }
  function sCard(b) {
    let acts = "", lines = "";
    const who = '<div class="ks-who"><b>' + esc(b.name) + '</b><span class="ks-tier t-' + esc(b.tier || "kama") + '">' + esc(String(b.tier || "kama").toUpperCase()) + '</span><span class="ks-code">' + esc(b.member_code || "") + "</span></div>" +
      '<div class="ks-meta"><span class="ks-loc">' + ic("pin", 2) + esc(locName(b.shop_id, S.d && S.d.rules)) + '</span><span class="dot">·</span>' + esc(tx("k_passes", { n: b.left, m: b.passes })) + "</div>";
    if (b.note) lines += '<div class="kd-msg">' + ic("note", 1.8) + "<span>" + esc(b.note) + "</span></div>";
    let when = dt(b.date, b.time);
    if (b.status === "requested") acts = '<button type="button" class="kd-btn" data-ks-ok="' + b.id + '">' + ic("check", 2.2) + esc(tx("k_confirm")) + '</button><button type="button" class="kd-btn sec" data-ks-sug="' + b.id + '">' + ic("swap", 2.2) + esc(tx("k_suggest")) + "</button>";
    else if (b.status === "suggested") { when = dt(b.sug_date, b.sug_time); lines = '<div class="ks-line">' + esc(tx("k_asked", { d: dt(b.req_date, b.req_time) })) + (b.by ? " · " + esc(tx("k_by", { s: b.by })) : "") + "</div>" + (b.sug_note ? '<div class="kd-msg">' + ic("note", 1.8) + "<span>" + esc(b.sug_note) + "</span></div>" : "") + lines;
      acts = '<button type="button" class="kd-btn sec" data-ks-sug="' + b.id + '">' + ic("swap", 2.2) + esc(tx("k_suggest")) + '</button><button type="button" class="kd-btn sec danger-t" data-ks-cancel="' + b.id + '">' + esc(tx("k_withdraw")) + "</button>"; }
    else if (b.status === "confirmed") { lines += '<div class="ks-wa">' + ic("clock", 1.8) + "<span>" + esc(tx("k_wa")) + "</span></div>"; acts = '<button type="button" class="kd-btn sec danger-t" data-ks-cancel="' + b.id + '">' + esc(tx("k_cancel")) + "</button>"; }
    else { lines += '<div class="ks-line">' + esc(b.cancelled_by === "staff" ? tx("s_cancel_staff") : b.cancel_reason === "declined the other time" ? tx("s_cancel_decline") : b.confirmed_at ? tx("s_cancel_guest") : tx("s_cancel_req")) + (b.by && b.cancelled_by === "staff" ? " · " + esc(tx("k_by", { s: b.by })) : "") + "</div>"; }
    const t0 = b.status === "cancelled" ? b.cancelled_at : b.status === "confirmed" ? b.confirmed_at : b.status === "suggested" ? b.suggested_at : b.created_at;
    return '<div class="ks-card st-' + b.status + '"><div class="ks-top">' + pill(b.status) + todayB(b) + '<span class="ks-ago">' + esc(ago(t0)) + "</span></div>" +
      '<div class="ks-when"><span>' + esc(when) + '</span><span class="ks-pax">' + ic(+b.seats === 1 ? "person" : "people", 2.2) + esc(tx("k_seats", { n: b.seats || 2 })) + "</span></div>" + who + lines + (acts ? '<div class="ks-acts">' + acts + "</div>" : "") + "</div>";
  }
  function sDraw() {
    const el = document.getElementById("kamaList"); const d = S.d; if (!el || !d) return;
    sCount();
    const L0 = locs(d.rules); if (!L0.find(l => l.id === S.shop)) S.shop = "wanchai";
    const by = (list) => (list || []).filter(b => (b.shop_id || "wanchai") === S.shop), loc = L0.find(l => l.id === S.shop) || L0[0];
    const rq = by(d.requests), sg = by(d.suggested), up = by(d.upcoming), cn = by(d.cancelled), n = rq.length;
    const sec = (h, list, empty) => '<div class="ks-cap">' + esc(h) + "</div>" + (list.length ? '<div class="ks-grid">' + list.map(sCard).join("") + "</div>" : empty ? '<p class="ks-empty">' + esc(empty) + "</p>" : "");
    const tog = '<div class="ks-locs" role="tablist">' + L0.map(l => { const c = (d.requests || []).filter(b => (b.shop_id || "wanchai") === l.id).length; return '<button type="button" role="tab" class="ks-lt' + (l.id === S.shop ? " on" : "") + '" data-ks-loc="' + esc(l.id) + '" aria-selected="' + (l.id === S.shop) + '">' + ic("pin", 2) + esc(lk() === "zh" ? l.zh : l.en) + (c ? '<span class="ks-lc">' + c + "</span>" : "") + (l.open ? "" : '<small>' + esc(tx("soon")) + "</small>") + "</button>"; }).join("") + "</div>";
    const nm = lk() === "zh" ? loc.zh : loc.en, empty = !rq.length && !sg.length && !up.length && !cn.length;
    el.innerHTML = '<div class="ks"><div class="ks-h">' + ic("kama", 1.9) + "<b>" + esc(tx("k_h")) + "</b></div>" + '<p class="ks-info">' + esc(tx("k_foot")) + "</p>" + tog +
      (empty && !loc.open ? '<p class="ks-empty">' + esc(tx("k_soon_loc", { l: nm })) + "</p>" :
      sec(tx("k_req", { n }), rq, tx("k_none_req")) +
      (sg.length ? sec(tx("k_sug", { n: sg.length }), sg) : "") +
      sec(tx("k_up", { n: up.length }), up, tx("k_none_up")) +
      (cn.length ? sec(tx("k_can", { n: cn.length }), cn.slice(0, 6)) : "")) + "</div>";
    el.querySelectorAll("[data-ks-loc]").forEach(b => b.onclick = () => { S.shop = b.dataset.ksLoc; try { sessionStorage.setItem("roru_kama_shop", S.shop); } catch (e) {} sDraw(); sCount(); });
    const all = [].concat(d.requests || [], d.suggested || [], d.upcoming || []);
    el.querySelectorAll("[data-ks-ok]").forEach(b => b.onclick = async () => { busy(b, true); try { await R().rpc("staff_kama_confirm", { p_token: S.token(), p_id: +b.dataset.ksOk }); R().toast(tx("k_confirmed"), 2600); } catch (e) { R().toast(errT(e), 3000); } sLoad(); });
    el.querySelectorAll("[data-ks-cancel]").forEach(b => b.onclick = async () => { const bk = all.find(x => x.id === +b.dataset.ksCancel); if (!bk) return;
      if (!(await ask(tx("k_ask_cancel", { who: bk.name }), tx("k_ask_p", { d: dt(bk.status === "suggested" ? bk.sug_date : bk.date, bk.status === "suggested" ? bk.sug_time : bk.time) }), tx("yes_cancel"), true))) return;
      busy(b, true); try { await R().rpc("staff_kama_cancel", { p_token: S.token(), p_id: bk.id }); R().toast(tx("k_cancelled"), 2600); } catch (e) { R().toast(errT(e), 3000); } sLoad(); });
    el.querySelectorAll("[data-ks-sug]").forEach(b => b.onclick = () => { const bk = all.find(x => x.id === +b.dataset.ksSug); if (bk) openSuggest(bk); });
  }
  function openSuggest(bk) {
    const rules = (S.d && S.d.rules) || {}, sh = sheet(tx("k_tab")); sh.el.classList.add("staff");
    const sel = { date: bk.date, time: null };
    sh.body.innerHTML = '<div class="kd-ttl">' + esc(tx("k_sug_t")) + '</div><p class="kd-s">' + ic("clock", 1.9) + esc(tx("k_sug_s", { who: bk.name, d: dt(bk.req_date, bk.req_time) })) + '</p><div id="ksPick"></div>' +
      '<div class="kd-lbl">' + esc(tx("k_sug_note")) + '</div><textarea id="ksNote" class="kd-note" maxlength="200" rows="2" placeholder="' + esc(tx("k_sug_ph")) + '"></textarea>' +
      '<div class="kd-foot"><div class="kd-sum" id="ksSum"></div><div class="kd-err hide" id="ksErr"></div><button type="button" class="kd-btn big" id="ksSend" disabled>' + esc(tx("k_sug_send")) + "</button></div>";
    const sum = () => { const ok = sel.date && sel.time && !(sel.date === bk.req_date && sel.time === bk.req_time); sh.body.querySelector("#ksSend").disabled = !ok;
      sh.body.querySelector("#ksSum").innerHTML = sel.date && sel.time ? ic("swap", 2) + "<b>" + esc(dt(sel.date, sel.time)) + "</b>" : '<span class="muted">' + esc(tx("sum_none")) + "</span>"; };
    picker(sh.body.querySelector("#ksPick"), rules, sel, sum); sum();
    sh.body.querySelector("#ksSend").onclick = async (e) => {
      const btn = e.currentTarget, er = sh.body.querySelector("#ksErr"); er.classList.add("hide"); busy(btn, true);
      try { await R().rpc("staff_kama_suggest", { p_token: S.token(), p_id: bk.id, p_date: sel.date, p_time: sel.time, p_note: sh.body.querySelector("#ksNote").value || null }); R().toast(tx("k_suggested"), 3000); sh.el.querySelector("[data-x]").click(); sLoad(); }
      catch (err) { er.textContent = errT(err); er.classList.remove("hide"); busy(btn, false); }
    };
  }
  // f49d: the Bookings tab badge counts only the new requests of the location the toggle shows
  function sCount() { if (S.onCount && S.d) S.onCount((S.d.requests || []).filter(b => (b.shop_id || "wanchai") === S.shop).length); }
  function staff(opts) { S.token = opts.token; S.onCount = opts.onCount; sLoad(); }

  window.RORU_KAMA = { guest, refresh: () => gLoad(true), book: () => openBook(), staff, staffLoad: sLoad, tx, _t: { slots, dayOk, dLbl, tLbl } };
})();
