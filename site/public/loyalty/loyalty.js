/* RORUBARU loyalty (High Rollers) shared: config, preview gate, i18n, RPC, QR, roll icon. Public key only (anon/publishable). */
window.RORU = (function () {
  const CFG = {
    url: "https://gpudggbdwghzsanyvvgt.supabase.co",
    key: "sb_publishable_WbZvV4s9WkKYvdGGlIUBbw_-e6W7Yfk",
    passHash: "156a203791b9b43e682aa45904eee434cc46fab681b2ae1cbb8ee76415df1c68",   // sha256 of the preview passcode (dark phase only)
    build: "v1d-preview-2026-10-14"
  };
  // PROGRAMME NAME — the one place to rename the loyalty programme (EN / 繁中). Every string below uses {prog};
  // page titles, headers, the passcode gate, share text and the month-end PDF/CSV read it from here.
  const PROG = { en: "High Rollers", zh: "卷王會" };
  const L = {
    en: {
      perks_title: "Your perks", perks_you: "You're here", perks_from: "{t} and up", perks_passes_left: "{n} of {m} left", perks_plus: "Everything in {t}, plus:",
      your_status: "Your status", mult_line: "Earns {x} points on every HK$1", year_spend: "{n} spent in the last 12 months", kama_eligible: "Kama eligible — by invitation",
      tier_more: "{n} more this year to {name}", tier_more_kama: "Kama: {n} more this year to be eligible (by invitation)", status_line: "Status = what you spend in a rolling 12 months",
      tier_start: "Start", invite: "invite only", invite_only_tag: "Invite only", per_year: "/yr", visits: "visits", plate_line: "{n} more visit(s) → {r}", stamp_rule: "1 stamp per visit (max 1 a day)",
      plates_done_n: "{n} plate(s) finished", stamp_added: "+1 visit stamp 🍣", visit_only_note: "", coming_soon: "Coming soon", soon_tag: "Soon",
      bday_opt: "Birthday (optional) — for a birthday roll",
      hook_mon_double: "Monday: double stamps 🍣🍣", hook_mon_double_sub: "Every visit today = {n} stamps on your plate", hook_tue_friends: "Tuesday: friends night 👯", hook_tue_friends_sub: "Bring-a-friend bonus is {x} today",
      hook_wed_gold: "Wednesday: gold rush ✨", hook_wed_gold_sub: "About 1 in {o} receipts turns gold today", hook_upgrade_line: "✨ Surprise upgrades more likely Mon–Wed", split_q: "Split a receipt with {who}?", split_new: "New", split_each: "{n} people, about {s} each",
      yes: "Yes, split it", no: "No", split_done: "Split ✓ — shared by {n}", split_declined: "Declined", split_mine: "Shared receipts", split_waiting: "Waiting for the first scanner to confirm the split",
      split_not_confirmed: "Not confirmed — this receipt stays with the first scanner", deleted_rejoin: "Deleted. You can rejoin from {d}.", err_rejoin: "Welcome back! You can rejoin {prog} from {d}.",
      err_split_full: "This receipt is already shared by 6 people", err_split_expired: "That split request has expired", err_split_not_found: "That split request is gone", err_referral_same_device: "Friend links need your friend's own phone", err_already_reviewed: "Already answered",
      terms_agree_a: "I agree to the", terms_link: "Terms & Conditions", and: "and", privacy_link: "Privacy Policy", optional_title: "Optional — tick only if you want them:",
      mkt_wa: "Send me rewards and member drops on WhatsApp (optional — stop any time)", mkt_push: "Push notifications on this phone (optional — coming later)",
      priv_title: "Your privacy choices", terms_update: "Please review and accept the Terms & Privacy Policy.", accept: "I agree", unsub_all: "Unsubscribe from all marketing", unsub_done: "Unsubscribed from all marketing ✓",
      terms_on: "Terms accepted {d} ({v})", err_terms_required: "Please tick the Terms & Privacy box", month: "Month", day: "Day", friend_title: "Bring a friend", friend_sub: "Share your link. When a friend joins and their first receipt of {m}+ is approved, you both get +{n} points.",
      share: "Share my link", copy: "Copy", copied: "Link copied ✓", share_text: "Join me in {prog} — RORUBARU's hand-roll club", invited_pending: "Invited by {who} — your first approved receipt of {m}+ gives you both +{n} points", invited_done: "Invited by {who} ✓",
      friend_stats: "{j} friend(s) joined · {q} pending · {r} rewarded · +{p} pts earned (max {c} a year)", ref_linked: "Friend link saved — +{n} pts each after your first receipt",
      bday_title: "Birthday roll", bday_add: "Add your birthday and we'll have a hand roll for you in your birthday week.", save: "Save", bday_now: "Happy birthday week! 🎉 Your birthday roll is ready.", bday_claim: "Claim my birthday roll",
      bday_claimed: "Enjoy your birthday roll! Show the code above at the counter.", bday_claimed_toast: "🎂 Birthday roll unlocked — show the QR at the counter", bday_wait: "Birthday rolls unlock {n} day(s) after a birthday is added — see you next year!",
      bday_on_file: "Your birthday: {d}", bday_rule: "In your birthday week a hand roll on us appears here (once a year).", bday_pick: "Pick month and day",
      gold_line2: "✨ About 1 in {o} receipts turns gold: {x} points", gold_hit: "GOLD RECEIPT!",
      err_referral_self: "That's your own link", err_referral_already_set: "You already have a friend link", err_referral_new_members_only: "Friend links only work for brand-new members", err_referral_code_unknown: "That invite link isn't valid", err_birthday_locked: "Birthday already set — ask staff to change it", err_birthday_not_available: "Birthday roll isn't available right now", err_bad_birthday: "Pick month and day",
      family: "{prog}", staff_brand: "{prog} · Staff", owner_brand: "{prog} · Owner", tag: "Every visit puts a hand roll on your plate.", sub: "5 rolls fill the plate. Scratch the nori. Get a reward.",
      phone: "Your mobile number", phone_ph: "9123 5678", send: "Send me a code", code: "6-digit code", code_ph: "••••••", name: "Your name (optional)", name_ph: "e.g. Kiki",
      consent: "I agree that RORUBARU (We Rolling Limited) keeps my mobile number and visit history to run {prog}, and may message me about it. I can delete my data any time below. (PDPO)",
      join: "Join / sign in", test_hint: "Preview mode: no SMS is sent. Use code", resend: "Send again", change: "Change number",
      your_plate: "Your visit plate", rolls_of: "of", rolls: "rolls", plate_full_soon: "One more and the plate is full!", visited_today: "Today's visit is stamped ✓", not_today: "Show this at the counter on your next visit",
      your_code: "Your member code", show_staff: "Show this to staff — or just say your number.", rewards: "Rewards", no_rewards: "Fill the plate to earn your first reward.",
      scratch: "Scratch the nori to reveal", scratch_hint: "← rub here →", reveal_done: "Show this QR at the counter to redeem", redeemed: "Redeemed", earned: "Plate full! Scratch to reveal",
      streak: "Visit streak", streak_line: "{n} of {t} visits in the last {d} days → +1 bonus roll", gold: "Gold roll!", gold_line: "A gold roll landed today — ask staff for the gold treat 🎉",
      history: "Recent visits", tier: "Level", signout: "Sign out", delete: "Delete my data", delete_confirm: "Delete your {prog} record, points and visits? This cannot be undone, and this number can only rejoin after a cool-off period.",
      privacy: "Privacy: we keep your mobile number, optional name and birthday, language, receipts, visits and rewards in RORUBARU's own database to run {prog}. We never sell it. See the Privacy Policy; delete everything any time with the button below.",
      preview_note: "Dark preview — rewards shown are placeholders until Dominic sets them.", err_bad_phone: "Please enter a valid mobile number", err_wrong_code: "Wrong code, try again", err_code_expired: "Code expired — send a new one",
      err_consent: "Please tick the consent box to join", err_too_many: "Too many tries, wait a bit", err_net: "Connection problem, try again", member_since: "Member since",
      gate_title: "Preview", gate_sub: "Enter the preview passcode", gate_btn: "Enter", gate_err: "Wrong passcode", lang_zh: "繁中", lang_en: "EN",
      tier_nori: "Nori", tier_gohan: "Gohan", tier_tobiko: "Tobiko", tier_kama: "Kama", plates_done: "plates finished", next_level: "Next level at {n} plates", top_level: "Kama — top level, thank you ❤",
      roll_added: "+1 hand roll!", reward_unlocked: "Plate full — reward unlocked!",
      p_tag: "Points for every dollar. A stamp for every visit.", p_sub: "{r} point per HK$1 at RORUBARU, plus a hand-roll stamp each visit — 5 stamps fill the plate for a visit reward. Spend more, climb the levels, earn faster.",
      points: "points", your_points: "Your points", scan: "Scan receipt", scan_sub: "Take a photo of the printed receipt — we read the total for you.", type_instead: "Type it instead", reading: "Reading your receipt…", read_ok: "Check and confirm", read_fail: "Couldn't read it clearly — please check the details",
      receipt_no: "Receipt / bill number", total: "Bill total (HK$)", when: "Date & time on the receipt", shop: "Shop", confirm_add: "Confirm & add points", retake: "Retake photo", table: "Table no. (on the receipt)", r_read: "Read from your receipt", r_items: "What you had", r_done: "Done", r_adds: "adds up", r_server: "Server", seats_n: "{n} seats", seat_1: "1 seat", claim_q: "Use {n} points for {r}?", c_ok: "Confirm", c_cancel: "Cancel", undo: "Undo", undo_q: "Cancel this reward and get {n} points back?", undone: "Cancelled · {n} points back", err_already_redeemed: "Staff already used this reward. A manager can reverse it at the counter.", err_reward_void: "This reward was already cancelled", err_nothing_to_refund: "Nothing to refund on this one", err_reason_required: "Please write a short reason", err_manager_only: "Manager or owner only", s_rev: "Reverse", s_rev_reason: "Reason (required)", s_rev_ok: "Reverse & refund", s_rev_done: "Reversed · {n} points back", s_rev_pos: "It was logged on the POS: void it there too", s_rev_code: "Reverse a used reward (code)", r_pending: "Sent to staff to check",
      added_points: "+{n} points!", queued: "Sent to staff to check — points land once approved (usually same day).", pending_hint: "{n} receipt(s) waiting for staff approval",
      ladder: "Rewards", ladder_sub: "Use your points on any reward you've unlocked. Points come off when you tap Use; show the code at the counter.", lad_unlocked: "Unlocked", lad_locked: "Locked", lad_use: "Use", claim: "Use {n} pts", need_more: "{n} more", claimed: "Reward unlocked — scratch to reveal", upgrade: "Upgraded! The nori hid something better 🎉",
      receipts: "Your receipts", tier_line: "{spend} spent · {next}", tier_next: "{n} to {name}", kama_note: "Kama is by chef's invitation only",
      err_receipt_already_used: "This receipt has already been added", err_receipt_photo_already_used: "You've already sent this photo", err_receipt_too_old: "Receipts count within {h} hours", err_daily_receipt_limit: "Daily receipt limit reached — staff can add it for you", err_receipt_no_required: "Please add the date & time and table no. from the receipt", err_bad_total: "Please check the total", err_not_enough_points: "Not enough points yet", err_receipt_in_future: "That date is in the future",
      install_tip: "Tip: add this page to your home screen"
    },
    zh: {
      perks_title: "你的會員禮遇", perks_you: "你的等級", perks_from: "{t} 或以上", perks_passes_left: "尚餘 {n}/{m} 張", perks_plus: "{t} 全部權益，再加：",
      your_status: "你的會員級別", mult_line: "每 HK$1 可得 {x} 積分", year_spend: "過去 12 個月消費 {n}", kama_eligible: "已符合 Kama 資格 — 只限邀請",
      tier_more: "今年再消費 {n} 升至 {name}", tier_more_kama: "Kama：今年再消費 {n} 即符合資格（只限邀請）", status_line: "級別按過去 12 個月消費計算",
      tier_start: "起步", invite: "只限邀請", invite_only_tag: "只限邀請", per_year: "／年", visits: "次到訪", plate_line: "再到訪 {n} 次 → {r}", stamp_rule: "每次到訪蓋 1 個印（每日最多 1 個）",
      plates_done_n: "已集齊 {n} 碟", stamp_added: "+1 到訪印 🍣", visit_only_note: "", coming_soon: "即將推出", soon_tag: "即將推出",
      bday_opt: "生日（可選）— 生日手卷用",
      hook_mon_double: "星期一：雙倍印章 🍣🍣", hook_mon_double_sub: "今日每次到訪 = {n} 個印", hook_tue_friends: "星期二：朋友之夜 👯", hook_tue_friends_sub: "今日帶朋友獎賞 {x}",
      hook_wed_gold: "星期三：金色狂熱 ✨", hook_wed_gold_sub: "今日大約每 {o} 張收據有一張變金色", hook_upgrade_line: "✨ 星期一至三，驚喜升級機會更高", split_q: "與 {who} 平分一張收據？", split_new: "新", split_each: "{n} 人，每人約 {s}",
      yes: "好，平分", no: "不了", split_done: "已平分 ✓ — 共 {n} 人", split_declined: "已拒絕", split_mine: "共享收據", split_waiting: "等待首位掃描者確認平分",
      split_not_confirmed: "未獲確認 — 此收據仍屬首位掃描者", deleted_rejoin: "已刪除。你可於 {d} 起重新加入。", err_rejoin: "歡迎回來！你可於 {d} 起重新加入{prog}。",
      err_split_full: "此收據已由 6 人共享", err_split_expired: "平分請求已過期", err_split_not_found: "平分請求已不存在", err_referral_same_device: "朋友連結須用朋友自己的手機", err_already_reviewed: "已經回覆",
      terms_agree_a: "我同意", terms_link: "條款及細則", and: "及", privacy_link: "私隱政策", optional_title: "可選 — 如想收取才剔選：",
      mkt_wa: "透過 WhatsApp 向我發送獎賞及會員優惠（可選 — 可隨時停止）", mkt_push: "在此手機接收推送通知（可選 — 稍後推出）",
      priv_title: "你的私隱選擇", terms_update: "請細閱並同意條款及私隱政策。", accept: "我同意", unsub_all: "取消所有推廣訊息", unsub_done: "已取消所有推廣訊息 ✓",
      terms_on: "已於 {d} 同意條款（{v}）", err_terms_required: "請剔選同意條款及私隱政策", month: "月", day: "日", friend_title: "帶朋友來", friend_sub: "分享你的連結。朋友加入後，首張 {m} 或以上的收據批核時，你們各得 +{n} 分。",
      share: "分享我的連結", copy: "複製", copied: "已複製連結 ✓", share_text: "一齊加入 RORUBARU {prog}", invited_pending: "由 {who} 邀請 — 你首張 {m} 或以上的收據批核後，你們各得 +{n} 分", invited_done: "由 {who} 邀請 ✓",
      friend_stats: "已加入 {j} 位 · 待定 {q} 位 · 已獎勵 {r} 位 · 共得 +{p} 分（每年最多 {c} 位）", ref_linked: "已記錄朋友連結 — 首張收據後各得 +{n} 分",
      bday_title: "生日手卷", bday_add: "加入你的生日，生日週我們請你食一個手卷。", save: "儲存", bday_now: "生日週快樂！🎉 你的生日手卷已準備好。", bday_claim: "領取生日手卷",
      bday_claimed: "請享用生日手卷！在櫃檯出示上方的碼。", bday_claimed_toast: "🎂 生日手卷已解鎖 — 在櫃檯出示 QR", bday_wait: "生日須於加入 {n} 日後才可領取 — 明年見！",
      bday_on_file: "你的生日：{d}", bday_rule: "生日週會在這裡出現一個免費手卷（每年一次）。", bday_pick: "請選擇月份及日子",
      gold_line2: "✨ 大約每 {o} 張收據有一張變金色：{x} 積分", gold_hit: "金色收據！",
      err_referral_self: "這是你自己的連結", err_referral_already_set: "你已有朋友連結", err_referral_new_members_only: "朋友連結只適用於新會員", err_referral_code_unknown: "邀請連結無效", err_birthday_locked: "生日已設定 — 如需更改請找店員", err_birthday_not_available: "暫時未能領取生日手卷", err_bad_birthday: "請選擇月份及日子",
      family: "{prog}", staff_brand: "{prog} · 員工", owner_brand: "{prog} · 東主", tag: "每次光臨，碟上多一個手卷。", sub: "集齊 5 個手卷，刮開紫菜，獲得獎賞。",
      phone: "你的手機號碼", phone_ph: "9123 5678", send: "發送驗證碼", code: "6 位驗證碼", code_ph: "••••••", name: "你的名字（可選）", name_ph: "例如：Kiki",
      consent: "我同意 RORUBARU（We Rolling Limited）保存我的手機號碼及到訪紀錄以運作{prog}，並可就此向我發送訊息。我可隨時在下方刪除我的資料。（私隱條例 PDPO）",
      join: "加入 / 登入", test_hint: "預覽模式：不會發送短訊。請輸入驗證碼", resend: "重新發送", change: "更改號碼",
      your_plate: "你的到訪碟", rolls_of: "／", rolls: "個手卷", plate_full_soon: "再多一個就集齊！", visited_today: "今日到訪已蓋印 ✓", not_today: "下次光臨時在櫃檯出示",
      your_code: "你的會員碼", show_staff: "向店員出示，或直接說出你的電話號碼。", rewards: "獎賞", no_rewards: "集齊一碟即可獲得第一份獎賞。",
      scratch: "刮開紫菜，看看獎賞", scratch_hint: "← 在此刮開 →", reveal_done: "在櫃檯出示此 QR 以兌換", redeemed: "已兌換", earned: "集齊一碟！刮開看看",
      streak: "連續到訪", streak_line: "最近 {d} 日內到訪 {n}／{t} 次 → 額外 +1 手卷", gold: "金色手卷！", gold_line: "今日出現金色手卷 — 向店員領取金色小禮 🎉",
      history: "最近到訪", tier: "等級", signout: "登出", delete: "刪除我的資料", delete_confirm: "刪除你的{prog}紀錄、積分及到訪？此操作無法復原，而此號碼須於冷靜期後才可重新加入。",
      privacy: "私隱：我們把你的手機號碼、名字及生日（可選）、語言、收據、到訪及獎賞儲存在 RORUBARU 自己的資料庫，只用於運作{prog}，絕不出售。詳見私隱政策；可隨時按下方按鈕刪除所有資料。",
      preview_note: "內部預覽 — 獎賞內容為佔位，待 Dominic 決定。", err_bad_phone: "請輸入有效的手機號碼", err_wrong_code: "驗證碼錯誤，請再試", err_code_expired: "驗證碼已過期，請重新發送",
      err_consent: "請勾選同意方可加入", err_too_many: "嘗試次數過多，請稍後再試", err_net: "連線問題，請再試", member_since: "加入日期",
      gate_title: "預覽", gate_sub: "請輸入預覽密碼", gate_btn: "進入", gate_err: "密碼錯誤", lang_zh: "繁中", lang_en: "EN",
      tier_nori: "Nori 紫菜", tier_gohan: "Gohan 飯", tier_tobiko: "Tobiko 飛魚籽", tier_kama: "Kama", plates_done: "已集齊碟數", next_level: "集齊 {n} 碟升級", top_level: "Kama — 最高級別，多謝你 ❤",
      roll_added: "+1 手卷！", reward_unlocked: "集齊一碟 — 獎賞解鎖！",
      p_tag: "消費儲積分，到訪集手卷印。", p_sub: "在 RORUBARU 每消費 HK$1 得 {r} 分，每次到訪再蓋一個手卷印 — 集齊 5 個印換到訪獎賞。消費越多，級別越高，積分越快。",
      points: "分", your_points: "你的積分", scan: "掃描收據", scan_sub: "影一張收據相片 — 我們會自動讀取總額。", type_instead: "改為手動輸入", reading: "正在讀取收據…", read_ok: "請核對後確認", read_fail: "未能清楚讀取 — 請核對資料",
      receipt_no: "收據／單號", total: "總額 (HK$)", when: "收據上的日期及時間", shop: "分店", confirm_add: "確認並加積分", retake: "重新拍攝", table: "枱號（收據上）", r_read: "從收據讀到", r_items: "你食咗", r_done: "完成", r_adds: "金額吻合", r_server: "服務員", seats_n: "{n} 位", seat_1: "1 位", claim_q: "用 {n} 分換「{r}」？", c_ok: "確認", c_cancel: "取消", undo: "取消兌換", undo_q: "取消此獎賞並退回 {n} 分？", undone: "已取消 · 退回 {n} 分", err_already_redeemed: "店員已使用此獎賞，可請經理在櫃檯退回。", err_reward_void: "此獎賞已取消", err_nothing_to_refund: "此獎賞沒有積分可退回", err_reason_required: "請寫下簡短原因", err_manager_only: "只限經理或東主", s_rev: "退回", s_rev_reason: "原因（必填）", s_rev_ok: "退回並退分", s_rev_done: "已退回 · 退還 {n} 分", s_rev_pos: "此項已記入 POS：請同時在 POS 作廢", s_rev_code: "退回已使用的獎賞（碼）", r_pending: "已交由店員核實",
      added_points: "+{n} 分！", queued: "已交由店員核實 — 批核後積分即到（通常當日）。", pending_hint: "{n} 張收據等待店員批核",
      ladder: "獎賞", ladder_sub: "已解鎖的獎賞可隨時用積分換領。按「換領」即扣分，到櫃枱出示代碼即可。", lad_unlocked: "已解鎖", lad_locked: "未解鎖", lad_use: "換領", claim: "用 {n} 分", need_more: "尚差 {n} 分", claimed: "獎賞解鎖 — 刮開紫菜看看", upgrade: "升級了！紫菜下有更好的 🎉",
      receipts: "你的收據", tier_line: "已消費 {spend} · {next}", tier_next: "再 {n} 升至 {name}", kama_note: "Kama 只限主廚邀請",
      err_receipt_already_used: "此收據已經加過積分", err_receipt_photo_already_used: "你已經上載過這張相", err_receipt_too_old: "收據須於 {h} 小時內", err_daily_receipt_limit: "已達每日收據上限 — 可請店員代為加入", err_receipt_no_required: "請填上收據上的日期時間及枱號", err_bad_total: "請核對總額", err_not_enough_points: "積分尚未足夠", err_receipt_in_future: "日期在未來",
      install_tip: "提示：可將此頁加到主畫面"
    }
  };
  let lang = localStorage.getItem("roru_lang") || ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
  const prog = (l) => PROG[(l || lang) === "zh" ? "zh" : "en"];
  const t = (k, vars) => { let s = (L[lang] && L[lang][k]) || L.en[k] || k; if (vars) for (const v in vars) s = s.replace("{" + v + "}", vars[v]); return s.split("{prog}").join(prog()); };
  // Static pages: <title data-tt="{prog} — …">, <span data-prog> (current language) or data-prog="en"/"zh" (fixed language).
  const applyProg = () => { document.querySelectorAll("[data-prog]").forEach(el => { el.textContent = prog(el.dataset.prog || lang); }); const tt = document.querySelector("title[data-tt]"); if (tt) document.title = tt.dataset.tt.split("{prog}").join(prog()); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyProg); else applyProg();
  document.addEventListener("roru:lang", applyProg);
  const setLang = (l) => { lang = l; localStorage.setItem("roru_lang", l); document.documentElement.lang = l === "zh" ? "zh-Hant" : "en"; document.dispatchEvent(new Event("roru:lang")); };
  const applyI18n = () => { applyProg(); document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); }); document.querySelectorAll("[data-tp]").forEach(el => { el.placeholder = t(el.dataset.tp); }); document.querySelectorAll(".langs button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang)); };

  async function rpc(fn, args) {
    const r = await fetch(CFG.url + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: CFG.key, Authorization: "Bearer " + CFG.key, "Content-Type": "application/json" }, body: JSON.stringify(args || {}) });
    let body = null; try { body = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error((body && body.message) || ("http_" + r.status)); e.code = (body && body.message) || ("http_" + r.status); throw e; }
    return body;
  }
  const errText = (e) => { const m = { bad_phone: "err_bad_phone", wrong_code: "err_wrong_code", code_expired: "err_code_expired", consent_required: "err_consent", too_many_codes: "err_too_many", too_many_attempts: "err_too_many", receipt_already_used: "err_receipt_already_used", receipt_photo_already_used: "err_receipt_photo_already_used", receipt_too_old: "err_receipt_too_old", daily_receipt_limit: "err_daily_receipt_limit", receipt_no_required: "err_receipt_no_required", bad_total: "err_bad_total", not_enough_points: "err_not_enough_points", receipt_in_future: "err_receipt_in_future" }; if (e.code && /^rejoin_after:/.test(e.code)) return t("err_rejoin", { d: fmtDay(e.code.split(":")[1]) }); if (!m[e.code] && e.code && (L[lang]["err_" + e.code] || L.en["err_" + e.code])) return t("err_" + e.code); return m[e.code] ? t(m[e.code], { h: 72 }) : (e.code && !/^http_|fetch/i.test(e.code) ? e.code : t("err_net")); };

  async function sha256(s) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join(""); }
  // Preview gate: the pages stay hidden behind a passcode during the dark phase. Resolves when open.
  function gate() {
    return new Promise(async (resolve) => {
      if (!CFG.passHash || localStorage.getItem("roru_preview_ok") === CFG.passHash) return resolve();
      const q = new URLSearchParams(location.search).get("p");
      if (q && (await sha256(q.trim().toLowerCase())) === CFG.passHash) { localStorage.setItem("roru_preview_ok", CFG.passHash); history.replaceState(null, "", location.pathname); return resolve(); }
      const g = document.createElement("div"); g.className = "gate"; g.lang = document.documentElement.lang;
      g.innerHTML = '<div class="card"><div class="brand" style="margin-bottom:10px"><img src="/logo.png" alt="RORUBARU"><span class="fam">' + PROG[lang === "zh" ? "zh" : "en"] + '</span></div><h2 style="margin-top:4px">' + t("gate_title") + '</h2><p class="muted small">' + t("gate_sub") + '</p><label class="field"><input id="gpass" type="password" autocomplete="off" autocapitalize="off" inputmode="text"></label><div class="err hide" id="gerr">' + t("gate_err") + '</div><button class="btn" id="gbtn">' + t("gate_btn") + '</button></div>';
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
  // no zoom on double-tap / pinch (iOS ignores user-scalable=no): block gesture zoom, and turn a fast second tap
  // into a plain click so rapid keypad taps still register (Dominic 14:11)
  (function noZoom() {
    document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
    let last = 0;
    document.addEventListener("touchend", (e) => {
      const now = Date.now(), tg = e.target;
      if (now - last < 350 && e.changedTouches && e.changedTouches.length === 1 && !(tg.closest && tg.closest("input,textarea,select,canvas,video"))) {
        e.preventDefault();
        const el = tg.closest && tg.closest("button,a,label,[onclick],.member");
        if (el && !el.disabled) el.click();
      }
      last = now;
    }, { passive: false });
  })();
  setLang(lang);
  return { CFG, PROG, prog, t, lang: () => lang, setLang, applyI18n, rpc, errText, gate, qrSvg, rollSvg, toast, burst, fmtDay, fmtTime };
})();
