/* RORUBARU loyalty (High Rollers) shared: config, preview gate, i18n, RPC, QR, roll icon. Public key only (anon/publishable). */
window.RORU = (function () {
  const CFG = {
    url: "https://gpudggbdwghzsanyvvgt.supabase.co",
    key: "sb_publishable_WbZvV4s9WkKYvdGGlIUBbw_-e6W7Yfk",
    passHash: "156a203791b9b43e682aa45904eee434cc46fab681b2ae1cbb8ee76415df1c68",   // sha256 of the preview passcode (dark phase only)
    build: "f38-preview-2026-10-17"
  };
  // PROGRAMME NAME — the one place to rename the loyalty programme (EN / 繁中). Every string below uses {prog};
  // page titles, headers, the passcode gate, share text and the month-end PDF/CSV read it from here.
  const PROG = { en: "High Rollers", zh: "卷王會" };
  // STAMP STYLE (f33) — the ONE switch for the stamps on the guest's visit plate. Change only this word:
  //   "roll_logo" = option B: salmon hand-roll stamps, the last slot is the RORUBARU logo = the reward slot
  //   "logo"      = option B2 (DEFAULT, Dominic Oct 16 15:37 "Let's go all logo"): every stamp is the RORUBARU logo
  //   "roll"      = option A: every stamp is the salmon hand roll
  // Filled stamps show in full colour; empty ones are a ghost of the same stamp, so the guest sees exactly what is left.
  // Preview only: ?stamps=roll|logo|roll_logo in the address overrides it for a quick compare.
  const STAMP_STYLE = "logo";
  // TIER NAMES + ONE-LINERS — the one place to rename the status tiers (EN / 繁中). Keys are the internal tier ids
  // stored in the database (never shown); change only the words. Every "tier_<id>" / "lad_m_<id>" string and every
  // {t_<id>} placeholder below reads from here. Order = the ladder, lowest first.
  const TIERS = {
    nori:   { en: "Nori",   zh: "紫菜",   line_en: "The seaweed wrap. Every roll starts here.",              line_zh: "包住每條手卷嘅紫菜，人人都由呢度開始。" },
    gohan:  { en: "Gohan",  zh: "壽司飯", line_en: "The rice. You're a regular now.",                        line_zh: "手卷嘅根本，你而家係熟客喇。" },
    tobiko: { en: "Tobiko", zh: "飛魚籽", line_en: "The roe on top. The extras, including the secret menu.", line_zh: "鋪面嘅飛魚籽，有額外著數，包括隱藏餐牌。" },
    kama:   { en: "Kama",   zh: "魚鮫",   line_en: "The collar. The rarest cut, by invitation only.",        line_zh: "最珍貴嘅部位，只限邀請。" }
  };
  const L = {
    en: {
      perks_title: "Your perks", perks_you: "You're here", perks_from: "{t} and up", perks_passes_left: "{n} of {m} left", perks_plus: "Everything in {t}, plus:",
      lad_next: "Next: {name}", lad_kama: "{t_kama} is by invitation", lad_top: "Top tier", lad_you: "You're here", lad_pts: "{x} ROLL",
      tab_card: "Card", tab_rewards: "Rewards", tab_status: "Status", tab_me: "Me", your_status: "Your status", mult_line: "Earns {x} ROLL on every HK$1", year_spend: "{n} spent in the last 12 months", kama_eligible: "{t_kama} eligible — by invitation",
      tier_more: "{n} more this year to {name}", tier_more_kama: "{t_kama}: {n} more this year to be eligible (by invitation)", status_line: "Status = what you spend in a rolling 12 months",
      tier_start: "Start", invite: "invite only", invite_only_tag: "Invite only", per_year: "/yr", visits: "visits", plate_line: "{n} more visits → {r}", plate_line_1: "1 more visit → {r}", stamp_rule: "1 stamp per visit (max 1 a day)",
      plates_done_n: "{n} plates finished", plates_done_n_1: "1 plate finished", stamp_added: "+1 visit stamp 🍣", visit_only_note: "", coming_soon: "Coming soon", soon_tag: "Soon",
      bday_opt: "Birthday (optional) — for a birthday roll",
      hook_mon_double: "Monday: double stamps 🍣🍣", hook_mon_double_sub: "Every visit today = {n} stamps on your plate", hook_tue_friends: "Tuesday: friends night 👯", hook_tue_friends_sub: "Bring-a-friend bonus is {x} today",
      hook_wed_gold: "Wednesday: gold rush ✨\u2060", hook_wed_gold_sub: "About 1 in {o} receipts turns gold today", hook_upgrade_line: "✨ Surprise upgrades more likely Mon–Wed", split_q: "Split a receipt with {who}?", split_new: "New", split_each: "{n} people, about {s} each",
      yes: "Yes, split it", no: "No", split_done: "Split ✓ — shared by {n}", split_declined: "Declined", split_mine: "Shared receipts", split_waiting: "Waiting for the first scanner to confirm the split",
pre_title: "One receipt, one scan", pre_flair: "Like the last hand roll: it only goes once.", pre_once: "Each receipt can be scanned once only. After that nobody can scan it again, not even you.", pre_friend: "Eating with friends who are members too? Split the receipt with up to 5 of them and everyone earns equal ROLL.", pre_scan: "Scan receipt", pre_type: "Type it in", pre_split: "Split with friends", pre_later: "Not now",
      visit2_got: "+{n} come-back bonus", friend_v2: "Your friend gets +{v} more if they come back within {d} days.", visit2_until: "Come back by {d} for +{v} bonus ROLL.", err_roru_day_one_points_reward: "Roru Day: one ROLL reward per bill. The free first drink still counts on top.",
      split_banner: "Splitting with friends: scan first, then pick how many of you and who.", split_title: "Split with friends", split_how: "Everyone gets an equal share of the ROLL (rounded down) and any leftover ROLL stays with you. Each friend says yes in their own app within {h} hours. No answer = that share stays with you.", split_friend_lbl: "Friend's phone number or member code", split_send: "Send to my friend", split_you_friend: "You {a} ROLL · Friend {b} ROLL",
      split_sent: "Sent to {who}. They have {h} hours to say yes.", split_wait_card: "Waiting for {who} · until {t}", split_cancel: "Cancel", split_in_q: "{who} wants to split a receipt with you", split_in_sub: "{no} · HK${bill} → you get {p} ROLL", split_ok_friend: "Split ✓ +{n} ROLL",
      split_out_accepted: "Split ✓ with {who}: you {a} · them {b}", split_out_declined: "{who} said no. Your ROLL stays with you", split_out_expired: "No answer in time. Your ROLL stays with you", split_out_cancelled: "Cancelled", split_hist_with: "split with {who}", split_link: "Split", split_pending_note: "You can split this once staff approve it.", split_title_mine: "Receipts you're splitting",
      err_receipt_scanned_by_friend: "Already scanned. Ask your friend to split it with you.", err_split_wait_approval: "Staff need to approve this receipt first, then you can split it.", err_split_already: "This receipt is already split.", err_split_already_offered: "You've already asked someone to split this one.", err_split_too_late: "This receipt is too old to split.",
      err_split_too_small: "Not enough ROLL on this receipt to split.", err_split_daily_limit: "That's enough split requests for today. Try again tomorrow.", err_split_friend_not_found: "No member with that number or code. Ask your friend to join first.", err_split_not_yourself: "That's you! Enter your friend's number.", err_split_not_available: "This receipt can't be split any more.", err_split_points_spent: "The ROLL on this receipt were already spent, so it can't be split now.",
            split_not_confirmed: "Not confirmed — this receipt stays with the first scanner", deleted_rejoin: "Deleted. You can rejoin from {d}.", err_rejoin: "Welcome back! You can rejoin {prog} from {d}.",
      err_split_full: "This receipt is already shared by 6 people", err_split_expired: "That split request has expired", err_split_not_found: "That split request is gone", err_referral_same_device: "Friend links need your friend's own phone", err_already_reviewed: "Already answered",
      // f35 split with a whole table
      sp_people_lbl: "How many people? (you included)", sp_opt_one: "2 people · you + 1 friend", sp_opt: "{n} people · you + {f} friends", sp_box_lbl: "Friend {i}", sp_code_ph: "Member code", sp_use_code: "Type a member code instead", sp_use_phone: "Type a phone number instead", sp_not_member: "Not a member yet", sp_invite: "Send them your invite", sp_dup: "Already in another box", sp_self: "That's you! Enter a friend's number.", sp_each_friend: "Each friend gets", sp_you_keep: "You keep", sp_pts: "ROLL", split_send_n: "Send to {n} friends", sp_fill_all: "Fill in every box, or pick fewer people.", sp_fix_boxes: "Check the boxes marked in red.", split_sent_one: "Sent! Your friend has {h} hours to say yes.", split_sent_n: "Sent to {n} friends. They have {h} hours to say yes.", gin_alert: "{n} split requests waiting for you", gin_alert_1: "1 split request waiting for you", gin_alert_sub: "A friend scanned the bill. Say yes to get your share.", gin_q: "{who} wants to split a bill {n} ways with you", gin_you_get: "Your share", gin_of: "of HK${bill}", gin_with: "also with {list}", gin_until: "Answer by {t}", gin_yes: "Accept", gin_no: "Decline", gout_ways: "split {n} ways", gout_you: "You", gout_yes: "said yes", gout_wait: "waiting", gout_no: "said no", gout_exp: "no answer", gout_cx: "cancelled", gout_until: "Waiting until {t}", gout_cancel_all: "Cancel all waiting", gout_back: "Shares nobody took came back to you.", gout_done: "All done ✓", gout_cancelled: "Cancelled. Those shares stay with you.", split_hist_n: "split {n} ways with {who}", err_split_people_range: "Pick 2 to 6 people.", err_split_boxes_mismatch: "Fill in one box per friend.", err_split_cancelled: "Your friend cancelled this split.", err_split_too_many: "Up to 5 friends per bill.", err_split_boxes: "Check the boxes marked in red.",
      terms_agree_a: "I agree to the", terms_link: "Terms & Conditions", and: "and", privacy_link: "Privacy Policy", optional_title: "Optional — tick only if you want them:",
      mkt_wa: "Send me rewards and member drops on WhatsApp (optional — stop any time)", mkt_push: "Push notifications on this phone (optional — coming later)",
      priv_title: "Your privacy choices", terms_update: "Please review and accept the Terms & Privacy Policy.", accept: "I agree", unsub_all: "Unsubscribe from all marketing", unsub_done: "Unsubscribed from all marketing ✓",
      terms_on: "Terms accepted {d} ({v})", err_terms_required: "Please tick the Terms & Privacy box", month: "Month", day: "Day", friend_title: "Bring a friend", friend_sub: "Share your link. When a friend joins and their first receipt of {m}+ is approved, you both get +{n} ROLL.",
      share: "Share my link", copy: "Copy", copied: "Link copied ✓", share_text: "Join me in {prog} — RORUBARU's hand-roll club", invited_pending: "Invited by {who} — your first approved receipt of {m}+ gives you both +{n} ROLL", invited_done: "Invited by {who} ✓",
      friend_stats: "Friends joined: {j} · {q} pending · {r} rewarded · +{p} ROLL earned (max {c} a year)", ref_linked: "Friend link saved — +{n} ROLL each after your first receipt",
      bday_title: "Birthday roll", bday_add: "Add your birthday and we'll have a hand roll for you in your birthday week.", save: "Save", bday_now: "Happy birthday week! 🎉 Your birthday roll is ready.", bday_claim: "Claim my birthday roll",
      bday_claimed: "Enjoy your birthday roll! Show the code above at the counter.", bday_claimed_toast: "🎂 Birthday roll unlocked — show the QR at the counter", bday_wait: "Birthday rolls unlock {n} days after a birthday is added — see you next year!", bday_wait_1: "Birthday rolls unlock 1 day after a birthday is added — see you next year!",
      bday_on_file: "Your birthday: {d}", bday_rule: "Gohan and up: in your birthday week a hand roll on us appears here (once a year).", bday_pick: "Pick month and day",
      gold_line2: "✨\u2060 About 1 in {o} receipts turns gold: {x} ROLL + a free highball", gold_hit: "GOLD RECEIPT!",
      err_referral_self: "That's your own link", err_referral_already_set: "You already have a friend link", err_referral_new_members_only: "Friend links only work for brand-new members", err_referral_code_unknown: "That invite link isn't valid", err_birthday_locked: "Birthday already set — ask staff to change it", err_birthday_not_available: "Birthday roll isn't available right now", err_bad_birthday: "Pick month and day",
      family: "{prog}", staff_brand: "{prog} · Staff", owner_brand: "{prog} · Owner", tag: "Every visit puts a hand roll on your plate.", sub: "5 rolls fill the plate. Scratch the nori. Get a reward.",
      phone: "Your mobile number", phone_ph: "9123 5678", send: "Send me a code", code: "6-digit code", code_ph: "••••••", name: "Your name (optional)", name_ph: "e.g. Kiki",
      consent: "I agree that RORUBARU (We Rolling Limited) keeps my mobile number and visit history to run {prog}, and may message me about it. I can delete my data any time below. (PDPO)",
      join: "Join / sign in", test_hint: "Preview mode: no SMS is sent. Use code", resend: "Send again", change: "Change number",
      your_plate: "Your visit plate", rolls_of: "of", rolls: "rolls", plate_full_soon: "One more and the plate is full!", plate_full_soon_r: "One more visit → {r}!", visited_today: "Today's visit is stamped ✓", not_today: "Show this at the counter on your next visit",
      your_code: "Your member code", show_staff: "Show this to staff — or just say your number.", rewards: "Rewards", no_rewards: "Fill the plate to earn your first reward.",
      scratch: "Scratch the nori to reveal", scratch_hint: "← rub here →", reveal_done: "Show this QR at the counter to redeem", redeemed: "Redeemed", earned: "Plate full! Scratch to reveal",
      streak: "Visit streak", streak_line: "{n} of {t} visits in the last {d} days → +1 bonus roll", gold: "Gold roll!", gold_line: "A gold roll landed today — ask staff for the gold treat 🎉",
      history: "Recent visits", tier: "Level", signout: "Sign out", delete: "Delete my data", delete_confirm: "Delete your {prog} record, ROLL and visits? This cannot be undone, and this number can only rejoin after a cool-off period.",
      privacy: "Privacy: we keep your mobile number, optional name and birthday, language, receipts, visits and rewards in RORUBARU's own database to run {prog}. We never sell it. See the Privacy Policy; delete everything any time with the button below.",
      preview_note: "Dark preview — rewards shown are placeholders until Dominic sets them.", err_bad_phone: "Please enter a valid mobile number", err_wrong_code: "Wrong code, try again", err_code_expired: "Code expired — send a new one",
      err_consent: "Please tick the consent box to join", err_too_many: "Too many tries, wait a bit", err_net: "Connection problem, try again", member_since: "Member since",
      gate_title: "Preview", gate_sub: "Enter the preview passcode", gate_btn: "Enter", gate_err: "Wrong passcode", lang_zh: "繁中", lang_en: "EN",
      plates_done: "plates finished", next_level: "Next level at {n} plates", top_level: "{t_kama} — top level, thank you ❤",
      roll_added: "+1 hand roll!", reward_unlocked: "Plate full — reward unlocked!",
      p_tag: "ROLL for every dollar. A stamp for every visit.", p_sub: "{r} ROLL per HK$1 at RORUBARU, plus a hand-roll stamp each visit — 5 stamps fill the plate for a visit reward. Spend more, climb the levels, earn faster.",
      points: "ROLL", your_points: "Your ROLL", scan: "Scan receipt", scan_sub: "Take a photo of the printed receipt — we read the total for you.", type_instead: "Type it instead", reading: "Reading your receipt…", read_ok: "Check and confirm", read_fail: "Couldn't read it clearly — please check the details",
      receipt_no: "Receipt / bill number", total: "Bill total (HK$)", when: "Date & time on the receipt", shop: "Shop", confirm_add: "Confirm & add ROLL", retake: "Retake photo", table: "Table no. (on the receipt)", r_read: "Read from your receipt", r_items: "What you had", r_done: "Done", r_adds: "adds up", r_server: "Server", seats_n: "{n} seats", seat_1: "1 seat", claim_q: "Use {n} ROLL for {r}?", c_ok: "Confirm", c_cancel: "Cancel", undo: "Undo", undo_q: "Cancel this reward and get {n} ROLL back?", undone: "Cancelled · {n} ROLL back", err_already_redeemed: "Staff already used this reward. A manager can reverse it at the counter.", err_reward_void: "This reward was already cancelled", err_nothing_to_refund: "Nothing to refund on this one", err_reason_required: "Please write a short reason", err_manager_only: "Manager or owner only", s_rev: "Reverse", s_rev_reason: "Reason (required)", s_rev_ok: "Reverse & refund", s_rev_done: "Reversed · {n} ROLL back", s_rev_pos: "It was logged on the POS: void it there too", s_rev_code: "Reverse a used reward (code)", r_pending: "Sent to staff to check",
      added_points: "+{n} ROLL!", queued: "Sent to staff to check — ROLL lands once approved (usually same day).", pending_hint: "{n} receipts waiting for staff approval", pending_hint_1: "1 receipt waiting for staff approval",
      ladder: "Rewards", ladder_sub: "Use your ROLL on any reward you've unlocked. ROLL comes off when you tap Use; show the code at the counter. ROLL expires on 31 Dec each year.", lad_unlocked: "Unlocked", lad_locked: "Locked", lad_use: "Use", claim: "Use {n} ROLL", need_more: "{n} more", claimed: "Reward unlocked — scratch to reveal", upgrade: "Upgraded! The nori hid something better 🎉",
      receipts: "Your receipts", tier_line: "{spend} spent · {next}", tier_next: "{n} to {name}", kama_note: "{t_kama} is by invitation only",
      err_receipt_already_used: "This receipt has already been added", err_receipt_photo_already_used: "You've already sent this photo", err_receipt_too_old: "Receipts count within {h} hours", err_daily_receipt_limit: "Daily receipt limit reached — staff can add it for you", err_receipt_no_required: "Please add the date & time and table no. from the receipt", err_bad_total: "Please check the total", err_not_enough_points: "Not enough ROLL yet", err_receipt_in_future: "That date is in the future",
      install_tip: "Tip: add this page to your home screen"
    },
    zh: {
      perks_title: "你的會員禮遇", perks_you: "你的等級", perks_from: "{t} 或以上", perks_passes_left: "尚餘 {n}/{m} 張", perks_plus: "{t} 全部權益，再加：",
      lad_next: "下一級：{name}", lad_kama: "{t_kama}只限邀請", lad_top: "最高級別", lad_you: "你而家喺度", lad_pts: "{x} 卷幣",
      tab_card: "會員卡", tab_rewards: "獎賞", tab_status: "級別", tab_me: "我的", your_status: "你的會員級別", mult_line: "每 HK$1 可得 {x} 卷幣", year_spend: "過去 12 個月消費 {n}", kama_eligible: "已符合{t_kama}資格 — 只限邀請",
      tier_more: "今年再消費 {n} 升至 {name}", tier_more_kama: "{t_kama}：今年再消費 {n} 即符合資格（只限邀請）", status_line: "級別按過去 12 個月消費計算",
      tier_start: "起步", invite: "只限邀請", invite_only_tag: "只限邀請", per_year: "／年", visits: "次到訪", plate_line: "再到訪 {n} 次 → {r}", stamp_rule: "每次到訪蓋 1 個印（每日最多 1 個）",
      plates_done_n: "已集齊 {n} 碟", stamp_added: "+1 到訪印 🍣", visit_only_note: "", coming_soon: "即將推出", soon_tag: "即將推出",
      bday_opt: "生日（可選）— 生日手卷用",
      hook_mon_double: "星期一：雙倍印章 🍣🍣", hook_mon_double_sub: "今日每次到訪 = {n} 個印", hook_tue_friends: "星期二：朋友之夜 👯", hook_tue_friends_sub: "今日帶朋友獎賞 {x}",
      hook_wed_gold: "星期三：金色狂熱 ✨\u2060", hook_wed_gold_sub: "今日大約每 {o} 張收據有一張變金色", hook_upgrade_line: "✨ 星期一至三，驚喜升級機會更高", split_q: "與 {who} 平分一張收據？", split_new: "新", split_each: "{n} 人，每人約 {s}",
      yes: "好，平分", no: "不了", split_done: "已平分 ✓ — 共 {n} 人", split_declined: "已拒絕", split_mine: "共享收據", split_waiting: "等待首位掃描者確認平分",
pre_title: "一張收據，掃一次", pre_flair: "就好似最後一條手卷，冇得食兩次。", pre_once: "每張收據只可以掃描一次。掃咗之後，任何人都唔可以再掃，包括你自己。", pre_friend: "同幾個都係會員嘅朋友一齊食？可以同最多 5 位朋友分單，人人攞一樣嘅卷幣。", pre_scan: "掃描收據", pre_type: "手動輸入", pre_split: "同朋友分單", pre_later: "遲啲先",
      visit2_got: "+{n} 回訪獎賞", friend_v2: "朋友 {d} 日內再嚟，再多 +{v} 卷幣。", visit2_until: "{d} 前再嚟，送你 +{v} 卷幣。", err_roru_day_one_points_reward: "Roru Day：每張單只可以用一個卷幣獎賞，免費第一杯照送。",
      split_banner: "同朋友分單：先掃收據，再揀幾多人同係邊個。", split_title: "同朋友分單", split_how: "卷幣人人平分（去尾），餘數歸你。每位朋友要喺 {h} 個鐘內喺自己嘅 app 確認，冇確認嘅份就留返俾你。", split_friend_lbl: "朋友嘅電話號碼或會員編號", split_send: "傳俾朋友", split_you_friend: "你 {a} 卷幣 · 朋友 {b} 卷幣",
      split_sent: "已傳俾 {who}。佢有 {h} 個鐘確認。", split_wait_card: "等緊 {who} 確認 · 直到 {t}", split_cancel: "取消", split_in_q: "{who} 想同你分一張收據", split_in_sub: "{no} · HK${bill} → 你會攞到 {p} 卷幣", split_ok_friend: "分單完成 ✓ +{n} 卷幣",
      split_out_accepted: "已同 {who} 分單 ✓：你 {a} · 佢 {b}", split_out_declined: "{who} 拒絕咗，卷幣留返俾你", split_out_expired: "冇喺時限內確認，卷幣留返俾你", split_out_cancelled: "已取消", split_hist_with: "同 {who} 分單", split_link: "分單", split_pending_note: "店員批核之後就可以分單。", split_title_mine: "你嘅分單",
      err_receipt_scanned_by_friend: "呢張收據已經有人掃咗。請叫你朋友同你分單。", err_split_wait_approval: "要等店員批核咗呢張收據先可以分單。", err_split_already: "呢張收據已經分咗單。", err_split_already_offered: "你已經邀請咗人分呢張單。", err_split_too_late: "呢張收據太舊，唔可以再分單。",
      err_split_too_small: "呢張收據嘅卷幣太少，分唔到。", err_split_daily_limit: "今日分單邀請夠晒喇，聽日再試。", err_split_friend_not_found: "搵唔到用呢個號碼或編號嘅會員，請朋友先加入。", err_split_not_yourself: "呢個係你自己！請輸入朋友嘅號碼。", err_split_not_available: "呢張收據已經唔可以分單。", err_split_points_spent: "呢張收據嘅卷幣已經用咗，所以分唔到單。",
            split_not_confirmed: "未獲確認 — 此收據仍屬首位掃描者", deleted_rejoin: "已刪除。你可於 {d} 起重新加入。", err_rejoin: "歡迎回來！你可於 {d} 起重新加入{prog}。",
      err_split_full: "此收據已由 6 人共享", err_split_expired: "平分請求已過期", err_split_not_found: "平分請求已不存在", err_referral_same_device: "朋友連結須用朋友自己的手機", err_already_reviewed: "已經回覆",
      // f35 split with a whole table
      sp_people_lbl: "幾多人分？（包埋你）", sp_opt_one: "2 人 · 你 + 1 位朋友", sp_opt: "{n} 人 · 你 + {f} 位朋友", sp_box_lbl: "朋友 {i}", sp_code_ph: "會員編號", sp_use_code: "改為輸入會員編號", sp_use_phone: "改為輸入電話號碼", sp_not_member: "未係會員", sp_invite: "傳你嘅邀請俾佢", sp_dup: "呢個號碼已經喺另一格", sp_self: "呢個係你自己！請輸入朋友嘅號碼。", sp_each_friend: "每位朋友攞", sp_you_keep: "你留", sp_pts: "卷幣", split_send_n: "傳俾 {n} 位朋友", sp_fill_all: "請填晒每一格，或者揀少啲人。", sp_fix_boxes: "請檢查紅色嗰幾格。", split_sent_one: "已傳送！朋友有 {h} 個鐘確認。", split_sent_n: "已傳俾 {n} 位朋友。佢哋有 {h} 個鐘確認。", gin_alert: "有 {n} 個分單邀請等緊你", gin_alert_1: "有 1 個分單邀請等緊你", gin_alert_sub: "朋友已經掃咗張單，確認就攞到你嗰份。", gin_q: "{who} 想同你 {n} 個人分一張單", gin_you_get: "你嗰份", gin_of: "總數 HK${bill}", gin_with: "仲有 {list}", gin_until: "請喺 {t} 前回覆", gin_yes: "接受", gin_no: "拒絕", gout_ways: "{n} 人分", gout_you: "你", gout_yes: "已確認", gout_wait: "等緊", gout_no: "拒絕咗", gout_exp: "冇回覆", gout_cx: "已取消", gout_until: "等到 {t}", gout_cancel_all: "取消所有未回覆", gout_back: "冇人攞嘅份已經留返俾你。", gout_done: "全部完成 ✓", gout_cancelled: "已取消，嗰幾份留返俾你。", split_hist_n: "同 {who} {n} 人分單", err_split_people_range: "請揀 2 至 6 人。", err_split_boxes_mismatch: "每位朋友填一格。", err_split_cancelled: "朋友已取消呢次分單。", err_split_too_many: "每張單最多 5 位朋友。", err_split_boxes: "請檢查紅色嗰幾格。",
      terms_agree_a: "我同意", terms_link: "條款及細則", and: "及", privacy_link: "私隱政策", optional_title: "可選 — 如想收取才剔選：",
      mkt_wa: "透過 WhatsApp 向我發送獎賞及會員優惠（可選 — 可隨時停止）", mkt_push: "在此手機接收推送通知（可選 — 稍後推出）",
      priv_title: "你的私隱選擇", terms_update: "請細閱並同意條款及私隱政策。", accept: "我同意", unsub_all: "取消所有推廣訊息", unsub_done: "已取消所有推廣訊息 ✓",
      terms_on: "已於 {d} 同意條款（{v}）", err_terms_required: "請剔選同意條款及私隱政策", month: "月", day: "日", friend_title: "帶朋友來", friend_sub: "分享你的連結。朋友加入後，首張 {m} 或以上的收據批核時，你們各得 +{n} 卷幣。",
      share: "分享我的連結", copy: "複製", copied: "已複製連結 ✓", share_text: "一齊加入 RORUBARU {prog}", invited_pending: "由 {who} 邀請 — 你首張 {m} 或以上的收據批核後，你們各得 +{n} 卷幣", invited_done: "由 {who} 邀請 ✓",
      friend_stats: "已加入 {j} 位 · 待定 {q} 位 · 已獎勵 {r} 位 · 共得 +{p} 卷幣（每年最多 {c} 位）", ref_linked: "已記錄朋友連結 — 首張收據後各得 +{n} 卷幣",
      bday_title: "生日手卷", bday_add: "加入你的生日，生日週我們請你食一個手卷。", save: "儲存", bday_now: "生日週快樂！🎉 你的生日手卷已準備好。", bday_claim: "領取生日手卷",
      bday_claimed: "請享用生日手卷！在櫃檯出示上方的碼。", bday_claimed_toast: "🎂 生日手卷已解鎖 — 在櫃檯出示 QR", bday_wait: "生日須於加入 {n} 日後才可領取 — 明年見！",
      bday_on_file: "你的生日：{d}", bday_rule: "壽司飯或以上：生日週會在這裡出現一個免費手卷（每年一次）。", bday_pick: "請選擇月份及日子",
      gold_line2: "✨\u2060 大約每 {o} 張收據有一張變金色：{x} 卷幣 + 免費 Highball 一杯", gold_hit: "金色收據！",
      err_referral_self: "這是你自己的連結", err_referral_already_set: "你已有朋友連結", err_referral_new_members_only: "朋友連結只適用於新會員", err_referral_code_unknown: "邀請連結無效", err_birthday_locked: "生日已設定 — 如需更改請找店員", err_birthday_not_available: "暫時未能領取生日手卷", err_bad_birthday: "請選擇月份及日子",
      family: "{prog}", staff_brand: "{prog} · 員工", owner_brand: "{prog} · 東主", tag: "每次光臨，碟上多一個手卷。", sub: "集齊 5 個手卷，刮開紫菜，獲得獎賞。",
      phone: "你的手機號碼", phone_ph: "9123 5678", send: "發送驗證碼", code: "6 位驗證碼", code_ph: "••••••", name: "你的名字（可選）", name_ph: "例如：Kiki",
      consent: "我同意 RORUBARU（We Rolling Limited）保存我的手機號碼及到訪紀錄以運作{prog}，並可就此向我發送訊息。我可隨時在下方刪除我的資料。（私隱條例 PDPO）",
      join: "加入 / 登入", test_hint: "預覽模式：不會發送短訊。請輸入驗證碼", resend: "重新發送", change: "更改號碼",
      your_plate: "你的到訪碟", rolls_of: "／", rolls: "個手卷", plate_full_soon: "再多一個就集齊！", plate_full_soon_r: "再到訪 1 次 → {r}！", visited_today: "今日到訪已蓋印 ✓", not_today: "下次光臨時在櫃檯出示",
      your_code: "你的會員碼", show_staff: "向店員出示，或直接說出你的電話號碼。", rewards: "獎賞", no_rewards: "集齊一碟即可獲得第一份獎賞。",
      scratch: "刮開紫菜，看看獎賞", scratch_hint: "← 在此刮開 →", reveal_done: "在櫃檯出示此 QR 以兌換", redeemed: "已兌換", earned: "集齊一碟！刮開看看",
      streak: "連續到訪", streak_line: "最近 {d} 日內到訪 {n}／{t} 次 → 額外 +1 手卷", gold: "金色手卷！", gold_line: "今日出現金色手卷 — 向店員領取金色小禮 🎉",
      history: "最近到訪", tier: "等級", signout: "登出", delete: "刪除我的資料", delete_confirm: "刪除你的{prog}紀錄、卷幣及到訪？此操作無法復原，而此號碼須於冷靜期後才可重新加入。",
      privacy: "私隱：我們把你的手機號碼、名字及生日（可選）、語言、收據、到訪及獎賞儲存在 RORUBARU 自己的資料庫，只用於運作{prog}，絕不出售。詳見私隱政策；可隨時按下方按鈕刪除所有資料。",
      preview_note: "內部預覽 — 獎賞內容為佔位，待 Dominic 決定。", err_bad_phone: "請輸入有效的手機號碼", err_wrong_code: "驗證碼錯誤，請再試", err_code_expired: "驗證碼已過期，請重新發送",
      err_consent: "請勾選同意方可加入", err_too_many: "嘗試次數過多，請稍後再試", err_net: "連線問題，請再試", member_since: "加入日期",
      gate_title: "預覽", gate_sub: "請輸入預覽密碼", gate_btn: "進入", gate_err: "密碼錯誤", lang_zh: "繁中", lang_en: "EN",
      plates_done: "已集齊碟數", next_level: "集齊 {n} 碟升級", top_level: "{t_kama} — 最高級別，多謝你 ❤",
      roll_added: "+1 手卷！", reward_unlocked: "集齊一碟 — 獎賞解鎖！",
      p_tag: "消費儲卷幣，到訪集手卷印。", p_sub: "在 RORUBARU 每消費 HK$1 得 {r} 卷幣，每次到訪再蓋一個手卷印 — 集齊 5 個印換到訪獎賞。消費越多，級別越高，卷幣越快。",
      points: "卷幣", your_points: "你的卷幣", scan: "掃描收據", scan_sub: "影一張收據相片 — 我們會自動讀取總額。", type_instead: "改為手動輸入", reading: "正在讀取收據…", read_ok: "請核對後確認", read_fail: "未能清楚讀取 — 請核對資料",
      receipt_no: "收據／單號", total: "總額 (HK$)", when: "收據上的日期及時間", shop: "分店", confirm_add: "確認並加卷幣", retake: "重新拍攝", table: "枱號（收據上）", r_read: "從收據讀到", r_items: "你食咗", r_done: "完成", r_adds: "金額吻合", r_server: "服務員", seats_n: "{n} 位", seat_1: "1 位", claim_q: "用 {n} 卷幣換「{r}」？", c_ok: "確認", c_cancel: "取消", undo: "取消兌換", undo_q: "取消此獎賞並退回 {n} 卷幣？", undone: "已取消 · 退回 {n} 卷幣", err_already_redeemed: "店員已使用此獎賞，可請經理在櫃檯退回。", err_reward_void: "此獎賞已取消", err_nothing_to_refund: "此獎賞沒有卷幣可退回", err_reason_required: "請寫下簡短原因", err_manager_only: "只限經理或東主", s_rev: "退回", s_rev_reason: "原因（必填）", s_rev_ok: "退回並退卷幣", s_rev_done: "已退回 · 退還 {n} 卷幣", s_rev_pos: "此項已記入 POS：請同時在 POS 作廢", s_rev_code: "退回已使用的獎賞（碼）", r_pending: "已交由店員核實",
      added_points: "+{n} 卷幣！", queued: "已交由店員核實 — 批核後卷幣即到（通常當日）。", pending_hint: "{n} 張收據等待店員批核",
      ladder: "獎賞", ladder_sub: "已解鎖的獎賞可隨時用卷幣換領。按「換領」即扣卷幣，到櫃枱出示代碼即可。卷幣每年 12 月 31 日到期。", lad_unlocked: "已解鎖", lad_locked: "未解鎖", lad_use: "換領", claim: "用 {n} 卷幣", need_more: "尚差 {n} 卷幣", claimed: "獎賞解鎖 — 刮開紫菜看看", upgrade: "升級了！紫菜下有更好的 🎉",
      receipts: "你的收據", tier_line: "已消費 {spend} · {next}", tier_next: "再 {n} 升至 {name}", kama_note: "{t_kama}只限邀請",
      err_receipt_already_used: "此收據已經加過卷幣", err_receipt_photo_already_used: "你已經上載過這張相", err_receipt_too_old: "收據須於 {h} 小時內", err_daily_receipt_limit: "已達每日收據上限 — 可請店員代為加入", err_receipt_no_required: "請填上收據上的日期時間及枱號", err_bad_total: "請核對總額", err_not_enough_points: "卷幣尚未足夠", err_receipt_in_future: "日期在未來",
      install_tip: "提示：可將此頁加到主畫面"
    }
  };
  for (const k in TIERS) { L.en["tier_" + k] = TIERS[k].en; L.zh["tier_" + k] = TIERS[k].zh; L.en["lad_m_" + k] = TIERS[k].line_en; L.zh["lad_m_" + k] = TIERS[k].line_zh; }
  // f37: 简中. "zhs" is stored as the choice; inside the app it is lang "zh" (every 繁中 string and branch is reused) plus hans = true,
  // which converts what is on screen character by character (Traditional -> Simplified). Text written for 简中 (drinks passport) is used directly.
  const nav0 = (navigator.language || "").toLowerCase();
  const stored0 = localStorage.getItem("roru_lang") || (nav0.startsWith("zh") ? (/^zh-(cn|sg|hans)/.test(nav0) ? "zhs" : "zh") : "en");
  let hans = stored0 === "zhs";
  let lang = hans ? "zh" : (stored0 === "zh" ? "zh" : "en");
  const T2S_K = "㑯㑳㑶㓨㘚㜄㜏㠏㥮㩜㩳㩵䁻䃮䊷䋙䋚䋹䋻䍦䎱䙡䜀䝼䥇䥑䥱䦛䦟䯀䰾䱷䱽䲁䲘䴉丟並乾亂亙亞佇佈佔併來侖侶侷俁係俔俠俥俬倀倆倈倉個們倖倫倲偉偑側偵偽傌傑傖傘備傢傭傯傳傴債傷傾僂僅僉僑僕僞僥僨僱價儀儁儂億儈儉儎儐儔儕儘償優儲儷儸儺儻儼兇兌兒兗內兩冊冑冪凈凍凜凱別刪剄則剋剎剗剛剝剮剴創剷劃劇劉劊劌劍劏劑劚勁動務勛勝勞勢勩勱勳勵勸勻匭匯匱區協卹卻卽厙厠厤厭厲厴參叄叢吒吳吶呂咼員唄唸問啓啞啟啢喎喚喪喫喬單喲嗆嗇嗊嗎嗚嗩嗶嘆嘍嘓嘔嘖嘗嘜嘩嘮嘯嘰嘵嘸嘽噁噓噚噝噠噥噦噯噲噴噸噹嚀嚇嚌嚐嚕嚙嚥嚦嚨嚮嚲嚳嚴嚶囀囁囂囅囈囉囌囑囪圇國圍園圓圖團垻埡埰執堅堊堖堝堯報場塊塋塏塒塗塚塢塤塵塹墊墜墮墰墳墶墻墾壇壋壎壓壘壙壚壜壞壟壠壢壩壪壯壺壼壽夠夢夥夾奐奧奩奪奬奮奼妝姍姦娛婁婦婭媧媯媰媼媽嫋嫗嫵嫺嫻嫿嬀嬃嬈嬋嬌嬙嬡嬤嬪嬰嬸孃孋孌孫學孿宮寀寢實寧審寫寬寵寶將專尋對導尷屆屍屓屜屢層屨屬岡峯峴島峽崍崑崗崙崢崬嵐嵗嵾嶁嶄嶇嶔嶗嶠嶢嶧嶨嶮嶸嶺嶼嶽巋巒巔巖巰巹帥師帳帶幀幃幓幗幘幟幣幫幬幹幾庫廁廂廄廈廎廕廚廝廟廠廡廢廣廩廬廳弒弔弳張強彆彈彌彎彔彙彠彥彫彲彿後徑從徠復徵徹恆恥悅悞悵悶悽惡惱惲惻愛愜愨愴愷愾慄態慍慘慚慟慣慤慪慫慮慳慶慺慼慾憂憊憐憑憒憖憚憤憫憮憲憶懇應懌懍懞懟懣懤懨懲懶懷懸懺懼懾戀戇戔戧戩戰戱戲戶拋挩挱挾捨捫捱捲掃掄掆掗掙掛採揀揚換揮揯損搖搗搵搶摑摜摟摯摳摶摺摻撈撏撐撓撝撟撣撥撫撲撳撻撾撿擁擄擇擊擋擓擔據擠擣擬擯擰擱擲擴擷擺擻擼擽擾攄攆攏攔攖攙攛攜攝攢攣攤攪攬敎敓敗敘敵數斂斃斆斕斬斷於旂旣昇時晉晝暈暉暘暢暫曄曆曇曉曏曖曠曨曬書會朧朮東枴柵柺査桿梔梘條梟梲棄棊棖棗棟棡棧棲棶椏椲楊楓楨業極榘榦榪榮榲榿構槍槓槤槧槨槮槳槶槼樁樂樅樑樓標樞樢樣樧樫樳樸樹樺樿橈橋機橢橫檁檉檔檜檟檢檣檮檯檳檸檻櫃櫓櫚櫛櫝櫞櫟櫥櫧櫨櫪櫫櫬櫱櫳櫸櫻欄欅權欏欒欖欞欽歎歐歟歡歲歷歸歿殘殞殤殨殫殭殮殯殰殲殺殻殼毀毆毿氂氈氌氣氫氬氳氾汎汙決沒沖況泝洩洶浹涇涗涼淒淚淥淨淩淪淵淶淺渙減渢渦測渾湊湞湧湯溈準溝溫溮溳溼滄滅滌滎滙滬滯滲滷滸滻滾滿漁漊漚漢漣漬漲漵漸漿潁潑潔潙潚潛潤潯潰潷潿澀澆澇澐澗澠澤澦澩澮澱澾濁濃濄濕濘濚濛濜濟濤濧濫濰濱濺濼濾瀂瀅瀆瀇瀉瀋瀏瀕瀘瀝瀟瀠瀦瀧瀨瀰瀲瀾灃灄灑灕灘灝灡灣灤灧灩災為烏烴無煉煒煙煢煥煩煬煱熅熒熗熱熲熾燁燈燉燒燙燜營燦燬燭燴燶燻燼燾爍爐爛爭爲爺爾牀牆牘牽犖犛犢犧狀狹狽猙猶猻獁獃獄獅獎獨獪獫獮獰獱獲獵獷獸獺獻獼玀現琱琺琿瑋瑒瑣瑤瑩瑪瑲璉璡璣璦璫璯環璵璸璽璿瓊瓏瓔瓚甌甕產産甦甯畝畢畫異畵當疇疊痙痠痾瘂瘋瘍瘓瘞瘡瘧瘮瘲瘺瘻療癆癇癉癒癘癟癡癢癤癥癧癩癬癭癮癰癱癲發皁皚皰皸皺盃盜盞盡監盤盧盪眞眥眾睏睜睞瞘瞜瞞瞶瞼矇矓矚矯硃硜硤硨硯碕碩碭碸確碼碽磑磚磠磣磧磯磽磾礄礆礎礙礦礪礫礬礱祕祿禍禎禕禡禦禪禮禰禱禿秈稅稈稏稜稟種稱穀穇穌積穎穠穡穢穩穫穭窩窪窮窯窵窶窺竄竅竇竈竊竪競筆筍筧筴箇箋箏節範築篋篔篠篤篩篳簀簍簑簞簡簣簫簹簽簾籃籌籔籙籛籜籟籠籤籩籪籬籮籲粵糉糝糞糧糰糲糴糶糹糾紀紂約紅紆紇紈紉紋納紐紓純紕紖紗紘紙級紛紜紝紡紬紮細紱紲紳紵紹紺紼紿絀終絃組絅絆絎結絕絛絝絞絡絢給絨絰統絲絳絶絹綁綃綆綈綉綌綏綐綑經綜綞綠綢綣綫綬維綯綰綱網綳綴綵綸綹綺綻綽綾綿緄緇緊緋緑緒緓緔緗緘緙線緝緞締緡緣緦編緩緬緯緱緲練緶緹緻緼縈縉縊縋縐縑縕縗縛縝縞縟縣縧縫縭縮縱縲縳縴縵縶縷縹總績繃繅繆繒織繕繚繞繡繢繩繪繫繭繮繯繰繳繸繹繼繽繾繿纇纈纊續纍纏纓纔纖纘纜缽罃罈罌罎罰罵罷羅羆羈羋羣羥羨義羶習翫翬翹翽耬耮聖聞聯聰聲聳聵聶職聹聽聾肅脅脈脛脣脩脫脹腎腖腡腦腫腳腸膃膕膚膞膠膩膽膾膿臉臍臏臘臚臟臠臢臥臨臺與興舉舊舘艙艤艦艫艱艷芻苧茲荊莊莖莢莧華菴菸萇萊萬萴萵葉葒葤葦葯葷蒐蒓蒔蒕蒞蒼蓀蓆蓋蓮蓯蓴蓽蔔蔘蔞蔣蔥蔦蔭蕁蕆蕎蕒蕓蕕蕘蕢蕩蕪蕭蕷薀薈薊薌薑薔薘薟薦薩薳薴薵薹薺藍藎藝藥藪藭藴藶藹藺蘀蘄蘆蘇蘊蘋蘚蘞蘢蘭蘺蘿虆處虛虜號虧虯蛺蛻蜆蝕蝟蝦蝨蝸螄螞螢螮螻螿蟄蟈蟎蟣蟬蟯蟲蟶蟻蠁蠅蠆蠍蠐蠑蠔蠟蠣蠨蠱蠶蠻衆衊術衕衚衛衝衹袞裊裏補裝裡製複褌褘褲褳褸褻襇襉襏襖襝襠襤襪襬襯襲襴覈見覎規覓視覘覡覥覦親覬覯覲覷覺覽覿觀觴觶觸訁訂訃計訊訌討訐訒訓訕訖託記訛訝訟訢訣訥訩訪設許訴訶診註証詁詆詎詐詒詔評詖詗詘詛詞詠詡詢詣試詩詫詬詭詮詰話該詳詵詼詿誄誅誆誇誌認誑誒誕誘誚語誠誡誣誤誥誦誨說説誰課誶誹誼誾調諂諄談諉請諍諏諑諒論諗諛諜諝諞諡諢諤諦諧諫諭諮諱諳諶諷諸諺諼諾謀謁謂謄謅謊謎謐謔謖謗謙謚講謝謠謡謨謫謬謭謳謹謾譁證譎譏譖識譙譚譜譟譫譭譯議譴護譸譽譾讀讅變讋讌讎讒讓讕讖讚讜讞豈豎豐豔豬豶貓貙貝貞貟負財貢貧貨販貪貫責貯貰貲貳貴貶買貸貺費貼貽貿賀賁賂賃賄賅資賈賊賑賒賓賕賙賚賜賞賠賡賢賣賤賦賧質賫賬賭賰賴賵賺賻購賽賾贄贅贇贈贊贋贍贏贐贓贔贖贗贛贜赬趕趙趨趲跡踐踰踴蹌蹕蹟蹠蹣蹤蹺躂躉躊躋躍躎躑躒躓躕躚躡躥躦躪軀車軋軌軍軑軒軔軛軟軤軫軲軸軹軺軻軼軾較輅輇輈載輊輒輓輔輕輛輜輝輞輟輥輦輩輪輬輯輳輸輻輼輾輿轀轂轄轅轆轉轍轎轔轟轡轢轤辦辭辮辯農迴逕這連週進遊運過達違遙遜遞遠遡適遲遷選遺遼邁還邇邊邏邐郟郵鄆鄉鄒鄔鄖鄧鄭鄰鄲鄴鄶鄺酇酈醃醖醜醞醟醣醫醬醱釀釁釃釅釋釐釒釓釔釕釗釘釙針釣釤釦釧釩釵釷釹釺釾鈀鈁鈃鈄鈅鈈鈉鈍鈎鈐鈑鈒鈔鈕鈞鈡鈣鈥鈦鈧鈮鈰鈳鈴鈷鈸鈹鈺鈽鈾鈿鉀鉅鉆鉈鉉鉋鉍鉑鉕鉗鉚鉛鉞鉢鉤鉦鉬鉭鉳鉶鉸鉺鉻鉿銀銃銅銍銑銓銖銘銚銛銜銠銣銥銦銨銩銪銫銬銱銳銷銹銻銼鋁鋃鋅鋇鋌鋏鋒鋙鋝鋟鋣鋤鋥鋦鋨鋩鋪鋭鋮鋯鋰鋱鋶鋸鋼錁錄錆錇錈錏錐錒錕錘錙錚錛錟錠錡錢錦錨錩錫錮錯録錳錶錸錼鍀鍁鍃鍅鍆鍇鍈鍊鍋鍍鍔鍘鍚鍛鍠鍤鍥鍩鍬鍰鍵鍶鍺鍼鍾鎂鎄鎇鎊鎌鎔鎖鎘鎚鎛鎡鎢鎣鎦鎧鎩鎪鎬鎭鎮鎰鎲鎳鎵鎶鎸鎿鏃鏇鏈鏌鏍鏐鏑鏗鏘鏜鏝鏞鏟鏡鏢鏤鏨鏰鏵鏷鏹鏺鏽鐃鐋鐐鐒鐓鐔鐘鐙鐝鐠鐥鐦鐧鐨鐫鐮鐯鐲鐳鐵鐶鐸鐺鐿鑄鑊鑌鑑鑒鑔鑕鑞鑠鑣鑥鑭鑰鑱鑲鑷鑹鑼鑽鑾鑿钁钂長門閂閃閆閈閉開閌閎閏閑閒間閔閘閡閣閤閥閨閩閫閬閭閱閲閶閹閻閼閽閾閿闃闆闇闈闊闋闌闍闐闒闓闔闕闖關闞闠闡闢闤闥陘陝陞陣陰陳陸陽隉隊階隕際隨險隯隱隴隸隻雋雖雙雛雜雞離難雲電霑霢霧霽靂靄靆靈靉靚靜靝靦靨鞏鞝鞦鞽韁韃韆韉韋韌韍韓韙韜韝韞韻響頁頂頃項順頇須頊頌頎頏預頑頒頓頗領頜頡頤頦頭頮頰頲頴頷頸頹頻頽顆題額顎顏顒顓顔願顙顛類顢顥顧顫顬顯顰顱顳顴風颭颮颯颱颳颶颸颺颻颼飀飄飆飈飛飠飢飣飥飩飪飫飭飯飱飲飴飼飽飾飿餃餄餅餈餉養餌餎餏餑餒餓餕餖餘餚餛餜餞餡館餬餱餳餵餶餷餺餼餾餿饁饃饅饈饉饊饋饌饑饒饗饜饞饢馬馭馮馱馳馴馹駁駐駑駒駔駕駘駙駛駝駟駡駢駭駰駱駸駿騁騂騅騌騍騎騏騖騙騤騧騫騭騮騰騶騷騸騾驀驁驂驃驄驅驊驌驍驏驕驗驚驛驟驢驤驥驦驪驫骯髏髒體髕髖髮鬆鬍鬚鬢鬥鬧鬨鬩鬮鬱鬹魎魘魚魛魢魨魯魴魷魺鮁鮃鮊鮋鮍鮎鮐鮑鮒鮓鮚鮜鮝鮞鮣鮦鮪鮫鮭鮮鮳鮶鮺鯀鯁鯇鯉鯊鯒鯔鯕鯖鯗鯛鯝鯡鯢鯤鯧鯨鯪鯫鯰鯴鯷鯽鯿鰁鰂鰃鰆鰈鰉鰌鰍鰏鰐鰒鰓鰛鰜鰟鰠鰣鰥鰧鰨鰩鰭鰮鰱鰲鰳鰵鰷鰹鰺鰻鰼鰾鱂鱅鱈鱉鱒鱔鱖鱗鱘鱝鱟鱠鱣鱤鱧鱨鱭鱯鱷鱸鱺鳥鳧鳩鳬鳲鳳鳴鳶鳾鴆鴇鴉鴒鴕鴛鴝鴞鴟鴣鴦鴨鴯鴰鴴鴷鴻鴿鵁鵂鵃鵐鵑鵒鵓鵜鵝鵠鵡鵪鵬鵮鵯鵰鵲鵷鵾鶄鶇鶉鶊鶓鶖鶘鶚鶡鶥鶩鶪鶬鶯鶲鶴鶹鶺鶻鶼鶿鷀鷁鷂鷄鷉鷊鷓鷖鷗鷙鷚鷥鷦鷫鷯鷲鷳鷴鷸鷹鷺鷽鸂鸇鸊鸌鸏鸕鸘鸚鸛鸝鸞鹵鹹鹺鹼鹽麗麥麩麪麫麯麴麵麼麽黃黌點黨黲黴黶黷黽黿鼂鼉鼕鼴齊齋齎齏齒齔齕齗齙齜齟齠齡齣齦齧齪齬齲齶齷龍龎龐龑龔龕龜鿁鿓枱";
  const T2S_V = "㑔㑇㐹刾㘎㚯㛣㟆㤘㨫㧐擜䀥鿎䌶䌺䌻䌿䌾䍠䎬䙌䜧䞍䦂鿏䥾䦶䦷䯅鲃䲣䲝鳚鳤鹮丢并干乱亘亚伫布占并来仑侣局俣系伣侠伡私伥俩俫仓个们幸伦㑈伟㐽侧侦伪㐷杰伧伞备家佣偬传伛债伤倾偻仅佥侨仆伪侥偾雇价仪俊侬亿侩俭傤傧俦侪尽偿优储俪㑩傩傥俨凶兑儿兖内两册胄幂净冻凛凯别删刭则克刹刬刚剥剐剀创铲划剧刘刽刿剑㓥剂㔉劲动务勋胜劳势勚劢勋励劝匀匦汇匮区协恤却即厍厕历厌厉厣参叁丛咤吴呐吕呙员呗念问启哑启唡㖞唤丧吃乔单哟呛啬唝吗呜唢哔叹喽啯呕啧尝唛哗唠啸叽哓呒啴恶嘘㖊咝哒哝哕嗳哙喷吨当咛吓哜尝噜啮咽呖咙向亸喾严嘤啭嗫嚣冁呓啰苏嘱囱囵国围园圆图团坝垭采执坚垩垴埚尧报场块茔垲埘涂冢坞埙尘堑垫坠堕坛坟垯墙垦坛垱埙压垒圹垆坛坏垄垅坜坝塆壮壶壸寿够梦伙夹奂奥奁夺奖奋姹妆姗奸娱娄妇娅娲妫㛀媪妈袅妪妩娴娴婳妫媭娆婵娇嫱嫒嬷嫔婴婶娘㛤娈孙学孪宫采寝实宁审写宽宠宝将专寻对导尴届尸屃屉屡层屦属冈峰岘岛峡崃昆岗仑峥岽岚岁㟥嵝崭岖嵚崂峤峣峄峃崄嵘岭屿岳岿峦巅岩巯卺帅师帐带帧帏㡎帼帻帜币帮帱干几库厕厢厩厦庼荫厨厮庙厂庑废广廪庐厅弑吊弪张强别弹弥弯录汇彟彦雕彨佛后径从徕复征彻恒耻悦悮怅闷凄恶恼恽恻爱惬悫怆恺忾栗态愠惨惭恸惯悫怄怂虑悭庆㥪戚欲忧惫怜凭愦慭惮愤悯怃宪忆恳应怿懔蒙怼懑㤽恹惩懒怀悬忏惧慑恋戆戋戗戬战戯戏户抛捝挲挟舍扪挨卷扫抡㧏挜挣挂采拣扬换挥搄损摇捣揾抢掴掼搂挚抠抟折掺捞挦撑挠㧑挢掸拨抚扑揿挞挝捡拥掳择击挡㧟担据挤捣拟摈拧搁掷扩撷摆擞撸㧰扰摅撵拢拦撄搀撺携摄攒挛摊搅揽教敚败叙敌数敛毙敩斓斩断于旗既升时晋昼晕晖旸畅暂晔历昙晓向暧旷昽晒书会胧术东拐栅拐查杆栀枧条枭棁弃棋枨枣栋㭎栈栖梾桠㭏杨枫桢业极矩干杩荣榅桤构枪杠梿椠椁椮桨椢椝桩乐枞梁楼标枢㭤样榝㭴桪朴树桦椫桡桥机椭横檩柽档桧槚检樯梼台槟柠槛柜橹榈栉椟橼栎橱槠栌枥橥榇蘖栊榉樱栏榉权椤栾榄棂钦叹欧欤欢岁历归殁残殒殇㱮殚僵殓殡㱩歼杀壳壳毁殴毵牦毡氇气氢氩氲泛泛污决没冲况溯泄汹浃泾涚凉凄泪渌净凌沦渊涞浅涣减沨涡测浑凑浈涌汤沩准沟温浉涢湿沧灭涤荥汇沪滞渗卤浒浐滚满渔溇沤汉涟渍涨溆渐浆颍泼洁沩㴋潜润浔溃滗涠涩浇涝沄涧渑泽滪泶浍淀㳠浊浓㳡湿泞溁蒙浕济涛㳔滥潍滨溅泺滤澛滢渎㲿泻沈浏濒泸沥潇潆潴泷濑弥潋澜沣滠洒漓滩灏㳕湾滦滟滟灾为乌烃无炼炜烟茕焕烦炀㶽煴荧炝热颎炽烨灯炖烧烫焖营灿毁烛烩㶶熏烬焘烁炉烂争为爷尔床墙牍牵荦牦犊牺状狭狈狰犹狲犸呆狱狮奖独狯猃狝狞㺍获猎犷兽獭献猕猡现雕珐珲玮玚琐瑶莹玛玱琏琎玑瑷珰㻅环玙瑸玺璇琼珑璎瓒瓯瓮产产苏宁亩毕画异画当畴叠痉酸疴痖疯疡痪瘗疮疟瘆疭瘘瘘疗痨痫瘅愈疠瘪痴痒疖症疬癞癣瘿瘾痈瘫癫发皂皑疱皲皱杯盗盏尽监盘卢荡真眦众困睁睐眍䁖瞒瞆睑蒙眬瞩矫朱硁硖砗砚埼硕砀砜确码䂵硙砖硵碜碛矶硗䃅硚硷础碍矿砺砾矾砻秘禄祸祯祎祃御禅礼祢祷秃籼税秆䅉棱禀种称谷䅟稣积颖秾穑秽稳获穞窝洼穷窑窎窭窥窜窍窦灶窃竖竞笔笋笕䇲个笺筝节范筑箧筼筿笃筛筚箦篓蓑箪简篑箫筜签帘篮筹䉤箓篯箨籁笼签笾簖篱箩吁粤粽糁粪粮团粝籴粜纟纠纪纣约红纡纥纨纫纹纳纽纾纯纰纼纱纮纸级纷纭纴纺䌷扎细绂绁绅纻绍绀绋绐绌终弦组䌹绊绗结绝绦绔绞络绚给绒绖统丝绛绝绢绑绡绠绨绣绤绥䌼捆经综缍绿绸绻线绶维绹绾纲网绷缀彩纶绺绮绽绰绫绵绲缁紧绯绿绪绬绱缃缄缂线缉缎缔缗缘缌编缓缅纬缑缈练缏缇致缊萦缙缢缒绉缣缊缞缚缜缟缛县绦缝缡缩纵缧䌸纤缦絷缕缥总绩绷缫缪缯织缮缭绕绣缋绳绘系茧缰缳缲缴䍁绎继缤缱䍀颣缬纩续累缠缨才纤缵缆钵䓨坛罂坛罚骂罢罗罴羁芈群羟羡义膻习玩翚翘翙耧耢圣闻联聪声耸聩聂职聍听聋肃胁脉胫唇修脱胀肾胨脶脑肿脚肠腽腘肤䏝胶腻胆脍脓脸脐膑腊胪脏脔臜卧临台与兴举旧馆舱舣舰舻艰艳刍苎兹荆庄茎荚苋华庵烟苌莱万荝莴叶荭荮苇药荤搜莼莳蒀莅苍荪席盖莲苁莼荜卜参蒌蒋葱茑荫荨蒇荞荬芸莸荛蒉荡芜萧蓣蕰荟蓟芗姜蔷荙莶荐萨䓕苧䓓苔荠蓝荩艺药薮䓖蕴苈蔼蔺萚蕲芦苏蕴苹藓蔹茏兰蓠萝蔂处虚虏号亏虬蛱蜕蚬蚀猬虾虱蜗蛳蚂萤䗖蝼螀蛰蝈螨虮蝉蛲虫蛏蚁蚃蝇虿蝎蛴蝾蚝蜡蛎蟏蛊蚕蛮众蔑术同胡卫冲只衮袅里补装里制复裈袆裤裢褛亵裥裥袯袄裣裆褴袜摆衬袭襕核见觃规觅视觇觋觍觎亲觊觏觐觑觉览觌观觞觯触讠订讣计讯讧讨讦讱训讪讫托记讹讶讼䜣诀讷讻访设许诉诃诊注证诂诋讵诈诒诏评诐诇诎诅词咏诩询诣试诗诧诟诡诠诘话该详诜诙诖诔诛诓夸志认诳诶诞诱诮语诚诫诬误诰诵诲说说谁课谇诽谊訚调谄谆谈诿请诤诹诼谅论谂谀谍谞谝谥诨谔谛谐谏谕咨讳谙谌讽诸谚谖诺谋谒谓誊诌谎谜谧谑谡谤谦谥讲谢谣谣谟谪谬谫讴谨谩哗证谲讥谮识谯谭谱噪谵毁译议谴护诪誉谫读谉变詟䜩雠谗让谰谶赞谠谳岂竖丰艳猪豮猫䝙贝贞贠负财贡贫货贩贪贯责贮贳赀贰贵贬买贷贶费贴贻贸贺贲赂赁贿赅资贾贼赈赊宾赇赒赉赐赏赔赓贤卖贱赋赕质赍账赌䞐赖赗赚赙购赛赜贽赘赟赠赞赝赡赢赆赃赑赎赝赣赃赪赶赵趋趱迹践逾踊跄跸迹跖蹒踪跷跶趸踌跻跃䟢踯跞踬蹰跹蹑蹿躜躏躯车轧轨军轪轩轫轭软轷轸轱轴轵轺轲轶轼较辂辁辀载轾辄挽辅轻辆辎辉辋辍辊辇辈轮辌辑辏输辐辒辗舆辒毂辖辕辘转辙轿辚轰辔轹轳办辞辫辩农回迳这连周进游运过达违遥逊递远溯适迟迁选遗辽迈还迩边逻逦郏邮郓乡邹邬郧邓郑邻郸邺郐邝酂郦腌酝丑酝蒏糖医酱酦酿衅酾酽释厘钅钆钇钌钊钉钋针钓钐扣钏钒钗钍钕钎䥺钯钫钘钭钥钚钠钝钩钤钣钑钞钮钧钟钙钬钛钪铌铈钶铃钴钹铍钰钸铀钿钾巨钻铊铉铇铋铂钷钳铆铅钺钵钩钲钼钽锫铏铰铒铬铪银铳铜铚铣铨铢铭铫铦衔铑铷铱铟铵铥铕铯铐铞锐销锈锑锉铝锒锌钡铤铗锋铻锊锓铘锄锃锔锇铓铺锐铖锆锂铽锍锯钢锞录锖锫锩铔锥锕锟锤锱铮锛锬锭锜钱锦锚锠锡锢错录锰表铼镎锝锨锪钫钔锴锳炼锅镀锷铡钖锻锽锸锲锘锹锾键锶锗针钟镁锿镅镑镰镕锁镉锤镈镃钨蓥镏铠铩锼镐镇镇镒镋镍镓鿔镌镎镞旋链镆镙镠镝铿锵镗镘镛铲镜镖镂錾镚铧镤镪䥽锈铙铴镣铹镦镡钟镫镢镨䦅锎锏镄镌镰䦃镯镭铁镮铎铛镱铸镬镔鉴鉴镲锧镴铄镳镥镧钥镵镶镊镩锣钻銮凿镢镋长门闩闪闫闬闭开闶闳闰闲闲间闵闸阂阁合阀闺闽阃阆闾阅阅阊阉阎阏阍阈阌阒板暗闱阔阕阑阇阗阘闿阖阙闯关阚阓阐辟阛闼陉陕升阵阴陈陆阳陧队阶陨际随险陦隐陇隶只隽虽双雏杂鸡离难云电沾霡雾霁雳霭叇灵叆靓静靔腼靥巩绱秋鞒缰鞑千鞯韦韧韨韩韪韬鞲韫韵响页顶顷项顺顸须顼颂颀颃预顽颁顿颇领颌颉颐颏头颒颊颋颕颔颈颓频颓颗题额颚颜颙颛颜愿颡颠类颟颢顾颤颥显颦颅颞颧风飐飑飒台刮飓飔飏飖飕飗飘飙飚飞饣饥饤饦饨饪饫饬饭飧饮饴饲饱饰饳饺饸饼糍饷养饵饹饻饽馁饿馂饾余肴馄馃饯馅馆糊糇饧喂馉馇馎饩馏馊馌馍馒馐馑馓馈馔饥饶飨餍馋馕马驭冯驮驰驯驲驳驻驽驹驵驾骀驸驶驼驷骂骈骇骃骆骎骏骋骍骓骔骒骑骐骛骗骙䯄骞骘骝腾驺骚骟骡蓦骜骖骠骢驱骅骕骁骣骄验惊驿骤驴骧骥骦骊骉肮髅脏体髌髋发松胡须鬓斗闹哄阋阄郁鬶魉魇鱼鱽鱾鲀鲁鲂鱿鲄鲅鲆鲌鲉鲏鲇鲐鲍鲋鲊鲒鲘鲞鲕䲟鲖鲔鲛鲑鲜鲓鲪鲝鲧鲠鲩鲤鲨鲬鲻鲯鲭鲞鲷鲴鲱鲵鲲鲳鲸鲮鲰鲶鲺鳀鲫鳊鳈鲗鳂䲠鲽鳇䲡鳅鲾鳄鳆鳃鳁鳒鳑鳋鲥鳏䲢鳎鳐鳍鳁鲢鳌鳓鳘鲦鲣鲹鳗鳛鳔鳉鳙鳕鳖鳟鳝鳜鳞鲟鲼鲎鲙鳣鳡鳢鲿鲚鳠鳄鲈鲡鸟凫鸠凫鸤凤鸣鸢䴓鸩鸨鸦鸰鸵鸳鸲鸮鸱鸪鸯鸭鸸鸹鸻䴕鸿鸽䴔鸺鸼鹀鹃鹆鹁鹈鹅鹄鹉鹌鹏鹐鹎雕鹊鹓鹍䴖鸫鹑鹒鹋鹙鹕鹗鹖鹛鹜䴗鸧莺鹟鹤鹠鹡鹘鹣鹚鹚鹢鹞鸡䴘鹝鹧鹥鸥鸷鹨鸶鹪鹔鹩鹫鹇鹇鹬鹰鹭鸴㶉鹯䴙鹱鹲鸬鹴鹦鹳鹂鸾卤咸鹾碱盐丽麦麸面面曲曲面么么黄黉点党黪霉黡黩黾鼋鼌鼍冬鼹齐斋赍齑齿龀龁龂龅龇龃龆龄出龈啮龊龉龋腭龌龙厐庞䶮龚龛龟䜤鿒台";
  let T2S = null;
  const toS = (s) => { if (!T2S) { T2S = {}; for (let i = 0; i < T2S_K.length; i++) T2S[T2S_K[i]] = T2S_V[i]; } return String(s).replace(/[\u3400-\u9fff\uf900-\ufaff]/g, c => T2S[c] || c); };
  const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
  const hansNode = (n) => {
    if (!n) return;
    if (n.nodeType === 3) { const v = n.nodeValue; if (v && CJK.test(v)) { const s = toS(v); if (s !== v) n.nodeValue = s; } return; }
    if (n.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(n.tagName)) return;
    for (const a of ["placeholder", "title", "aria-label"]) { const v = n.getAttribute(a); if (v && CJK.test(v)) { const s = toS(v); if (s !== v) n.setAttribute(a, s); } }
    for (let c = n.firstChild; c; c = c.nextSibling) hansNode(c);
  };
  const hansAll = () => { if (!hans) return; hansNode(document.body); if (CJK.test(document.title)) document.title = toS(document.title); };
  let hansObs = null;
  const hansStart = () => { if (hansObs || typeof MutationObserver === "undefined") return; hansObs = new MutationObserver((ms) => { if (!hans) return; for (const m of ms) { if (m.type === "characterData") hansNode(m.target); else m.addedNodes.forEach(hansNode); } if (CJK.test(document.title)) { const s = toS(document.title); if (s !== document.title) document.title = s; } });
    hansObs.observe(document.documentElement, { childList: true, subtree: true, characterData: true }); hansAll(); };
  if (typeof document !== "undefined") { if (document.body) hansStart(); else document.addEventListener("DOMContentLoaded", hansStart); }
  const prog = (l) => PROG[(l || lang) === "zh" ? "zh" : "en"];
  const t = (k, vars) => { const one = vars && +vars.n === 1 && L[lang] && L[lang][k + "_1"]; let s = one || (L[lang] && L[lang][k]) || L.en[k] || k; if (vars) for (const v in vars) s = s.replace("{" + v + "}", vars[v]); return s.split("{prog}").join(prog()).replace(/\{t_(nori|gohan|tobiko|kama)\}/g, (_, k) => TIERS[k][lang === "zh" ? "zh" : "en"]); };
  // Static pages: <title data-tt="{prog} — …">, <span data-prog> (current language) or data-prog="en"/"zh" (fixed language).
  const applyProg = () => { document.querySelectorAll("[data-prog]").forEach(el => { el.textContent = prog(el.dataset.prog || lang); }); const tt = document.querySelector("title[data-tt]"); if (tt) document.title = tt.dataset.tt.split("{prog}").join(prog()); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyProg); else applyProg();
  document.addEventListener("roru:lang", applyProg);
  const setLang = (l) => { const was = hans; hans = l === "zhs"; lang = hans ? "zh" : (l === "zh" ? "zh" : "en"); localStorage.setItem("roru_lang", hans ? "zhs" : lang); document.documentElement.lang = hans ? "zh-Hans" : lang === "zh" ? "zh-Hant" : "en";
    if (was && !hans && document.body) { location.reload(); return; }   // text already shown in 简中 is put back by a reload
    document.dispatchEvent(new Event("roru:lang")); hansAll(); };
  const applyI18n = () => { applyProg(); document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); }); document.querySelectorAll("[data-tp]").forEach(el => { el.placeholder = t(el.dataset.tp); }); document.querySelectorAll(".langs button").forEach(b => b.classList.toggle("on", b.dataset.lang === (hans ? "zhs" : lang))); hansAll(); };

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
  // v46: one small icon per tier (seaweed sheet, rice, roe, fish collar) for the guest tier ladder
  const TIER_ICON = {
    nori: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="6" width="20" height="20" rx="2.5" fill="#26301f" stroke="#5a6456" stroke-width="1.4"/><path d="M9 13h14M9 18h14M9 23h9" stroke="#3f4c38" stroke-width="1.2" stroke-linecap="round"/></svg>',
    gohan: '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="#F6F3E7" stroke="#bdb7a3" stroke-width=".9"><ellipse cx="11" cy="22" rx="2.6" ry="4.4" transform="rotate(-35 11 22)"/><ellipse cx="17" cy="23" rx="2.6" ry="4.4" transform="rotate(10 17 23)"/><ellipse cx="22.5" cy="21" rx="2.6" ry="4.4" transform="rotate(40 22.5 21)"/><ellipse cx="14" cy="15" rx="2.6" ry="4.4" transform="rotate(-10 14 15)"/><ellipse cx="20" cy="14.5" rx="2.6" ry="4.4" transform="rotate(25 20 14.5)"/><ellipse cx="17" cy="8.5" rx="2.4" ry="4" transform="rotate(5 17 8.5)"/></g></svg>',
    tobiko: '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="#F64501" stroke="#ff9a6b" stroke-width=".7"><circle cx="16" cy="16" r="3.6"/><circle cx="9.6" cy="13.5" r="3.6"/><circle cx="22.4" cy="13.5" r="3.6"/><circle cx="12" cy="21.5" r="3.6"/><circle cx="20" cy="21.5" r="3.6"/><circle cx="16" cy="9.5" r="3.6"/></g><g fill="#fff" opacity=".85"><circle cx="15" cy="15" r=".9"/><circle cx="8.6" cy="12.5" r=".9"/><circle cx="21.4" cy="12.5" r=".9"/><circle cx="11" cy="20.5" r=".9"/><circle cx="19" cy="20.5" r=".9"/><circle cx="15" cy="8.5" r=".9"/></g></svg>',
    kama: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 25C7.5 14 15 6.5 27 6c-4 5-6 11.5-5 20-6 .5-11 .2-16-1z" fill="#E8B84A" stroke="#b9862a" stroke-width="1.2" stroke-linejoin="round"/><path d="M22 26c-3-4-7-6.5-12-7.5M22.5 19c-3.5-2-7-2.8-10.5-2.7M24 12.5c-3-.8-6-.6-8.5.4" stroke="#8a6420" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>'
  };
  const tierIcon = (k) => TIER_ICON[k] || TIER_ICON.nori;
  // f33: visit-plate stamps drawn with the custom Roru emoji (see STAMP_STYLE above); the old generic rollSvg stays for reference only.
  const STAMP_MODES = { roll: 1, logo: 1, roll_logo: 1 };
  const stampStyle = (() => { try { const q = new URLSearchParams(location.search).get("stamps"); if (q && STAMP_MODES[q]) return q; } catch (e) {} return STAMP_MODES[STAMP_STYLE] ? STAMP_STYLE : "roll_logo"; })();
  const stampImg = (n, cls, alt) => '<img class="stamp ' + cls + '" src="/loyalty/img/' + n + '_64.png" srcset="/loyalty/img/' + n + '_64.png 1x, /loyalty/img/' + n + '_128.png 2x, /loyalty/img/' + n + '_192.png 3x" alt="' + alt + '" draggable="false">';
  // stamp(i, per, on, gold): slot i of a plate of `per`; on = stamped; gold = a gold-receipt stamp (gets a gold glow)
  function stamp(i, per, on, gold) {
    const reward = stampStyle === "roll_logo" && i === per - 1, logo = stampStyle === "logo" || reward;
    const n = logo ? (on ? "roru_logo" : reward ? "roru_logo_ghost" : "roru_logo_ghost_plain") : (on ? "handroll" : "handroll_ghost");
    const alt = on ? (logo ? "RORUBARU stamp" : "hand roll stamp") : (reward ? "reward stamp, still to go" : "empty stamp");
    return stampImg(n, (logo ? "s-logo" : "s-roll") + (reward ? " s-reward" : "") + (on && gold ? " s-gold" : ""), alt);
  }
  const rollSvg = (gold) => '<svg class="roll" viewBox="0 0 64 64"><defs><linearGradient id="nori' + (gold ? "g" : "") + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="' + (gold ? "#F3D27A" : "#3d463a") + '"/><stop offset="1" stop-color="' + (gold ? "#C9952E" : "#161c15") + '"/></linearGradient></defs><path d="M8 20 L40 8 L52 46 L20 58 Z" fill="url(#nori' + (gold ? "g" : "") + ')" stroke="' + (gold ? "#E8B84A" : "#5a6456") + '" stroke-width="1.5"/><ellipse cx="34" cy="12" rx="13" ry="7" fill="#F6F3E7"/><path d="M26 9 q8 -9 16 -1 q-4 -3 -8 -1 q-4 -2 -8 2z" fill="#F64501"/><path d="M30 6 q4 -8 10 -4 q-3 0 -4 4z" fill="#4CC38A"/><ellipse cx="34" cy="12" rx="13" ry="7" fill="none" stroke="#e2dfd2" stroke-width="1"/></svg>';

  function toast(msg, ms) { let el = document.querySelector(".toast"); if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); } if (TOK_RE.test(String(msg))) { el.innerHTML = coin(true, "rc-toast"); el.appendChild(document.createTextNode(" " + msg)); } else el.textContent = msg; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), ms || 2200); }
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
  // v48 (f26): approved perks, Today line, Me tab
  Object.assign(L.en, {"today_k": "Today", "today_none": "ROLL + a visit stamp", "today_show": "Show this screen when you sit down", "perk_avail": "Available", "perk_used_month": "Used this month", "perk_used_year": "Used · back {d}", "perk_back": "back {d}", "perk_bday_claimed": "Ready, show staff", "perk_bday_used": "Used this year", "perk_bday_later": "In your birthday week", "perk_bday_none": "Add your birthday in Me", "perk_bday_new": "Available after {n} more days on file", "perk_bday_avail": "Your birthday week!", "me_profile": "Your details", "me_name": "Name", "me_name_ph": "What should we call you?", "me_bday": "Birthday", "me_bday_lock": "Locked once saved, so the birthday roll stays fair. Typo? Ask us in store.", "me_bday_once": "You can set this once.", "me_saved": "Saved ✓", "me_progress": "Your progress", "prog_to": "{n} to {name}", "prog_top": "You're at the top tier", "invite_title": "Invite a friend", "invite_sub": "Send your link. They sign up in a minute.", "invite_btn": "Share my link", "del_title": "Delete my account", "del_body": "This deletes your name, birthday, ROLL, receipts, visits and rewards for good. We keep only a one-way code of your phone number and the date you deleted, so rewards can't be claimed twice. This number can rejoin after a cool-off.", "del_go": "Delete for good", "del_keep": "Keep my account", "gold_highball": "a free highball", "gold_won": "2× ROLL + a free highball! It's in Rewards: show staff.", "gold_see": "See my highball", "show_staff_btn": "Show staff (full screen)", "tap_close": "Tap anywhere to go back", "close_x": "Close", "st_today": "Today", "st_mark": "Mark used", "st_marked": "Marked used", "st_undo": "Undo", "st_undone": "Undone", "st_undo_reason": "Reason for the undo (manager):", "st_show_card": "Guest shows this on their phone", "err_bad_name": "Please use letters for your name (max 30)", "err_perk_used_up": "Already used", "err_perk_not_for_tier": "Not part of this guest's tier", "err_already_undone": "Already undone"});
  Object.assign(L.zh, {"today_k": "今日", "today_none": "卷幣 + 到訪印章", "today_show": "坐低時出示此畫面", "perk_avail": "可使用", "perk_used_month": "本月已使用", "perk_used_year": "已使用 · {d} 再有", "perk_back": "{d} 再有", "perk_bday_claimed": "已領取，出示給員工", "perk_bday_used": "今年已使用", "perk_bday_later": "生日週可用", "perk_bday_none": "喺「我的」加入生日", "perk_bday_new": "生日登記滿 {n} 日後可用", "perk_bday_avail": "生日週快樂！", "me_profile": "你的資料", "me_name": "名字", "me_name_ph": "我們點稱呼你？", "me_bday": "生日", "me_bday_lock": "儲存後會鎖定，確保生日禮遇公平。輸入錯誤？請到店內告訴我們。", "me_bday_once": "只可設定一次。", "me_saved": "已儲存 ✓", "me_progress": "你的進度", "prog_to": "再消費 {n} 升至{name}", "prog_top": "你已是最高級別", "invite_title": "邀請朋友", "invite_sub": "傳送你的連結，一分鐘就加入到。", "invite_btn": "分享我的連結", "del_title": "刪除我的帳戶", "del_body": "會永久刪除你的名字、生日、卷幣、收據、到訪及獎賞紀錄。我們只保留你電話號碼的單向編碼及刪除日期，以防重複領取獎賞。冷靜期過後此號碼可重新加入。", "del_go": "永久刪除", "del_keep": "保留帳戶", "gold_highball": "免費 Highball 一杯", "gold_won": "雙倍卷幣 + 免費 Highball 一杯！喺「獎賞」出示給員工。", "gold_see": "查看我的 Highball", "show_staff_btn": "出示給員工（全螢幕）", "tap_close": "輕觸任何位置返回", "close_x": "關閉", "st_today": "今日", "st_mark": "標記已用", "st_marked": "已標記使用", "st_undo": "取消", "st_undone": "已取消", "st_undo_reason": "取消原因（經理）：", "st_show_card": "客人會喺手機出示", "err_bad_name": "名字請用文字（最多 30 個字）", "err_perk_used_up": "已用完", "err_perk_not_for_tier": "此等級不包括此禮遇", "err_already_undone": "已經取消"});

  // f39 ROLL of the week
  Object.assign(L.en, {"rw_chip": "ROLL of the week: {item} · {m}x", "rw_now": "New ROLL of the week: {item} · {m}x", "rw_short": "{m}x ROLL", "rw_hist": "ROLL of the week {m}x: +{n}", "rw_earned": "+{n} ROLL · {item} {m}x", "rw_info": "Order {item} this week and it earns {m}x ROLL. Scan your receipt as usual: we spot it on the bill."});
  Object.assign(L.zh, {"rw_chip": "本週卷幣：{item} · {m}倍", "rw_now": "新一週卷幣：{item} · {m}倍", "rw_short": "{m}倍卷幣", "rw_hist": "本週卷幣 {m}倍：+{n}", "rw_earned": "+{n} 卷幣 · {item} {m}倍", "rw_info": "呢個星期叫 {item}，可以賺 {m}倍卷幣。照常掃描收據，系統會喺單上認出佢。"});
  setLang(hans ? "zhs" : lang);

  // f27: first-open walkthrough (Dominic 17:31 Oct 15: "a tutorial guide walk through for first time users so they know what to expect").
  // tour(key, steps, opts): highlights the real element of each step, one short line each (EN / 繁中 by page language), Next / Skip and a step counter.
  // Shows once per device (localStorage "roru_tour_<key>"); opts.force replays it. Steps whose element is missing or hidden are skipped.
  function tour(key, steps, opts) {
    opts = opts || {}; const LS = "roru_tour_" + key;
    try { if (!opts.force && localStorage.getItem(LS)) return false; } catch (e) {}
    const old = document.querySelector(".tour"); if (old) old.remove();
    const zh = (opts.lang || lang) === "zh", hs = zh && hans, W = { next: zh ? "下一步" : "Next", back: zh ? "返回" : "Back", skip: zh ? (hs ? "跳过" : "略過") : "Skip", done: zh ? "明白" : "Got it" };
    const ov = document.createElement("div"); ov.className = "tour"; ov.innerHTML = '<div class="tour-ring"></div><div class="tour-tip" role="dialog" aria-live="polite"><div class="tour-n"></div><div class="tour-t"></div><div class="tour-b"><button type="button" class="tour-skip"></button><div class="tour-nav"><button type="button" class="tour-back"></button><button type="button" class="tour-next"></button></div></div></div>';
    document.body.appendChild(ov);
    const ring = ov.querySelector(".tour-ring"), tip = ov.querySelector(".tour-tip");
    const find = (s) => { try { const el = typeof s.el === "function" ? s.el() : document.querySelector(s.el); return el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" ? el : null; } catch (e) { return null; } };
    let list = steps.slice(), i = 0;
    const end = () => { try { localStorage.setItem(LS, String(Date.now())); } catch (e) {} ov.remove(); window.removeEventListener("resize", place); if (opts.onEnd) opts.onEnd(); };
    function place() {
      const s = list[i], el = s && s._el; if (!el) return;
      const r = el.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, p = 6;
      const top = Math.max(4, r.top - p), left = Math.max(4, r.left - p), w = Math.min(vw - 8, r.width + 2 * p), h = Math.min(vh - 8, r.height + 2 * p);
      Object.assign(ring.style, { top: top + "px", left: left + "px", width: Math.max(0, Math.min(w, vw - left - 4)) + "px", height: h + "px" });
      const tw = Math.min(340, vw - 24); tip.style.width = tw + "px";
      tip.style.left = Math.max(12, Math.min(vw - tw - 12, r.left + r.width / 2 - tw / 2)) + "px";
      const th = tip.offsetHeight || 130, below = top + h + 12;
      if (below + th < vh - 8) { tip.style.top = below + "px"; } else if (top - th - 12 > 8) { tip.style.top = (top - th - 12) + "px"; } else { tip.style.top = Math.max(8, vh - th - 16) + "px"; }
    }
    // f29: a step whose screen loads data (e.g. the owner Passport) gets up to ~2.4 s for its element to appear before it is skipped
    let gen = 0;
    function show() {
      const my = ++gen;
      const step = () => {
        if (my !== gen || !ov.isConnected) return;
        if (i >= list.length) { end(); return; }
        const s = list[i];
        if (!s._ran) { s._ran = 1; s._t0 = Date.now(); if (s.before) { try { s.before(); } catch (e) {} } }
        s._el = find(s);
        if (!s._el) { if (Date.now() - s._t0 < (opts.wait || 2400)) { setTimeout(step, 150); return; } list.splice(i, 1); step(); return; }
        paint(s);
      };
      step();
    }
    function paint(s) {
      s._el.scrollIntoView({ block: "center", behavior: "auto" });
      ov.querySelector(".tour-n").textContent = (i + 1) + " / " + list.length;
      ov.querySelector(".tour-t").textContent = zh ? ((hs && s.zhs) || s.zh || s.en) : s.en; // f38: hand-written 简中 when a step has one
      ov.querySelector(".tour-skip").textContent = W.skip; ov.querySelector(".tour-skip").style.visibility = i === list.length - 1 ? "hidden" : "visible";
      ov.querySelector(".tour-next").textContent = i === list.length - 1 ? W.done : W.next;
      const bk = ov.querySelector(".tour-back"); bk.textContent = W.back; bk.style.visibility = i === 0 ? "hidden" : "visible"; bk.disabled = i === 0; // f33: Back (Dominic Oct 16), hidden on step 1
      requestAnimationFrame(() => { place(); setTimeout(place, 120); });
    }
    ov.querySelector(".tour-next").onclick = () => { i++; show(); };
    // f33: Back = previous step, same place in the walkthrough; its setup (e.g. switching to that tab) runs again
    ov.querySelector(".tour-back").onclick = () => { if (i <= 0) return; i--; for (let j = i; j < list.length; j++) list[j]._ran = 0; show(); };
    ov.querySelector(".tour-skip").onclick = end;
    window.addEventListener("resize", place);
    show(); return true;
  }

  // f28: the custom hand-roll emoji replaces every 🍣 the app renders (guest, staff and owner), including text set later
  // f32: the same swap for the other custom Roru emoji: 🍶 sake, 🥃 highball, 🍽️ stamp card, and ✨+U+2060 (word joiner) = gold receipt.
  //      A plain ✨ stays a stock sparkle; plain-text spots (inputs, options, titles) keep the stock glyph, which never shows as a box.
  const HRI = (n, alt) => '<img class="hr-emoji" src="/loyalty/img/' + n + '_32.png" srcset="/loyalty/img/' + n + '_32.png 1x, /loyalty/img/' + n + '_64.png 2x, /loyalty/img/' + n + '_128.png 3x" alt="' + alt + '" draggable="false">';
  const HR = HRI("handroll", "hand roll");
  const HR_MAP = { "🍣": HR, "🍶": HRI("sake", "sake"), "🥃": HRI("highball", "highball"), "🍽\uFE0F": HRI("stampcard", "stamp card"), "🍽": HRI("stampcard", "stamp card"), "✨\u2060": HRI("goldreceipt", "gold receipt") };
  const HR_RX = /🍣|🍶|🥃|🍽\uFE0F?|✨\u2060/;
  const HR_SPLIT = /(🍣|🍶|🥃|🍽\uFE0F?|✨\u2060)/;
  const HR_SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 1, TITLE: 1, INPUT: 1, SELECT: 1, SVG: 1, TEXT: 1, TSPAN: 1 };
  function hrNode(tn) {
    const p = tn.parentNode; if (!p || HR_SKIP[(p.nodeName || "").toUpperCase()] || (p.closest && p.closest("svg"))) return;
    const parts = tn.nodeValue.split(HR_SPLIT); if (parts.length < 2) return;
    const frag = document.createDocumentFragment();
    parts.forEach((s, i) => { if (!s) return; if (i % 2) { const t = document.createElement("template"); t.innerHTML = HR_MAP[s] || HR; frag.appendChild(t.content.firstChild); } else frag.appendChild(document.createTextNode(s)); });
    p.replaceChild(frag, tn);
  }
  function hrScan(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (HR_RX.test(root.nodeValue)) hrNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (!HR_RX.test(root.textContent || "")) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), hits = []; let n;
    while ((n = w.nextNode())) if (HR_RX.test(n.nodeValue)) hits.push(n);
    hits.forEach(hrNode);
  }
  function hrStart() {
    hrScan(document.body);
    new MutationObserver((ms) => { for (const m of ms) { if (m.type === "characterData") hrScan(m.target); else m.addedNodes.forEach(hrScan); } }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (typeof document !== "undefined") { if (document.body) hrStart(); else document.addEventListener("DOMContentLoaded", hrStart); }

  // f38 (Dominic Oct 17 19:15 "across all the apps there should be dark and light"): one theme switch for the guest and staff apps.
  // "A" = dark (the original look), "B" = light. Follows the phone's light/dark setting until someone taps the switch, then remembers it.
  // body.lt carries the light palette (loyalty.css); the owner page keeps its own A/B switch (thA/thB) and is not touched by this.
  const theme = (function () {
    let key = "roru_theme", cur = "A";
    const sysLight = () => { try { return window.matchMedia("(prefers-color-scheme: light)").matches; } catch (e) { return false; } };
    function set(th, save) {
      cur = th === "B" ? "B" : "A";
      document.documentElement.classList.toggle("lt", cur === "B"); if (document.body) document.body.classList.toggle("lt", cur === "B");
      document.documentElement.style.colorScheme = cur === "B" ? "light" : "dark";
      const mc = document.querySelector('meta[name="theme-color"]'); if (mc) mc.setAttribute("content", cur === "B" ? "#F4F0E4" : "#0b0d12");
      if (save) { try { localStorage.setItem(key, cur); } catch (e) {} }
      document.querySelectorAll("[data-theme-btn]").forEach(b => { const i = b.querySelector("i"); if (i) i.textContent = cur === "B" ? "🌙" : "☀️"; const lb = cur === "B" ? (lang === "zh" ? "轉深色" : "Dark mode") : (lang === "zh" ? "轉淺色" : "Light mode"); b.setAttribute("aria-label", lb); b.title = lb; });
      try { document.dispatchEvent(new CustomEvent("roru:theme", { detail: cur })); } catch (e) {}
    }
    function init(k) {
      key = k || key; let q = null; try { q = new URLSearchParams(location.search).get("theme"); } catch (e) {}
      let saved = null; try { saved = localStorage.getItem(key); } catch (e) {}
      const pick = q ? (/^(b|light)$/i.test(q) ? "B" : "A") : saved ? saved : (sysLight() ? "B" : "A");
      set(pick, false);
      if (!document.body) document.addEventListener("DOMContentLoaded", () => set(cur, false));
      try { window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { let s = null; try { s = localStorage.getItem(key); } catch (e) {} if (!s) set(sysLight() ? "B" : "A", false); }); } catch (e) {}
      document.addEventListener("click", (e) => { const b = e.target.closest("[data-theme-btn]"); if (b) set(cur === "B" ? "A" : "B", true); });
    }
    return { init, set, get: () => cur };
  })();

  // f39 (Oct 19 2026): ROLL token. The coin is drawn here (SVG, gold with an R) so it looks the same in dark and light;
  // coin(spin) returns markup, coinSpin(el) replays the 1 s rotateY spin (CSS .roll-coin.spin, off under prefers-reduced-motion).
  // TOKEN holds the name: a rename is this object plus the copy (grep ROLL / 卷幣).
  const TOKEN = { en: "ROLL", zh: "卷幣" };
  let coinN = 0;
  function coinSvg() {
    const a = "rcA" + (++coinN), b = "rcB" + coinN;
    return '<svg viewBox="0 0 40 40" focusable="false"><defs><linearGradient id="' + a + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9A6"/><stop offset=".42" stop-color="#F3C24F"/><stop offset="1" stop-color="#B7790F"/></linearGradient>' +
      '<linearGradient id="' + b + '" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFE29A"/><stop offset=".55" stop-color="#E9B23C"/><stop offset="1" stop-color="#C08419"/></linearGradient></defs>' +
      '<circle cx="20" cy="20" r="19" fill="url(#' + a + ')" stroke="#7E5208" stroke-width="1.2"/>' +
      '<circle cx="20" cy="20" r="16.6" fill="none" stroke="#FFF4C9" stroke-opacity=".55" stroke-width="1.3" stroke-dasharray="1.1 2.15"/>' +
      '<circle cx="20" cy="20" r="14.2" fill="url(#' + b + ')" stroke="#8F5E0C" stroke-opacity=".6" stroke-width="1"/>' +
      '<text x="20.6" y="27.9" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="19" fill="#FFF0B5" fill-opacity=".85">R</text>' +
      '<text x="20" y="27.1" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="19" fill="#7A4A04">R</text></svg>';
  }
  function coin(spin, cls) { return '<span class="roll-coin' + (spin ? " spin" : "") + (cls ? " " + cls : "") + '" aria-hidden="true">' + coinSvg() + "</span>"; }
  function coinSpin(el) { if (!el) return; el.classList.remove("spin"); void el.offsetWidth; el.classList.add("spin"); }
  // a "+188 ROLL" style message gets the spinning coin in front of it (toasts and staff confirmations)
  const TOK_RE = /(^|\s)\+\s?[\d,]+\s?(ROLL|卷幣|卷币)/;
  // ROLL of the week: current pick from family_roll_week + Supabase realtime on loyalty_roll_week (postgres_changes over the
  // realtime websocket, no library), a 30 s poll while the page is visible as the fallback, and a refresh when the app comes back.
  function rollWeek(onChange, getToken) {
    let cur = null, ws = null, ref = 1, hb = null, retry = 0, dead = false;
    async function fetchNow() {
      try { const tk = getToken ? getToken() : null; const d = await rpc("family_roll_week", tk ? { p_token: tk } : {});
        const k = JSON.stringify([d.on, d.id || 0, d.multiplier || 0]); const first = !cur, changed = first || cur._k !== k; d._k = k; cur = d; onChange(d, changed && !first, first); } catch (e) {}
    }
    function connect() {
      if (dead || typeof WebSocket === "undefined") return;
      try { ws = new WebSocket(CFG.url.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(CFG.key) + "&vsn=1.0.0"); } catch (e) { return; }
      ws.onopen = () => { retry = 0; ws.send(JSON.stringify({ topic: "realtime:roll_week", event: "phx_join", ref: String(ref++), payload: { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public", table: "loyalty_roll_week" }] }, access_token: CFG.key } }));
        clearInterval(hb); hb = setInterval(() => { try { ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(ref++) })); } catch (e) {} }, 25000); };
      ws.onmessage = (e) => { try { const m = JSON.parse(e.data); if (m.event === "postgres_changes") { clearTimeout(ws._d); ws._d = setTimeout(fetchNow, 250); } } catch (er) {} };
      ws.onclose = () => { clearInterval(hb); if (!dead) setTimeout(connect, Math.min(30000, 2000 * Math.pow(2, retry++))); };
    }
    fetchNow(); connect();
    setInterval(() => { if (!document.hidden) fetchNow(); }, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) fetchNow(); });
    return { refresh: fetchNow, get: () => cur, stop: () => { dead = true; try { ws && ws.close(); } catch (e) {} } };
  }
  function rwName(d, l) { if (!d) return ""; const zh = (l || lang) === "zh"; const n = zh ? (d.name_zh || d.name_en) : d.name_en; return hans && zh ? toS(n) : n; }
  return { theme, HR, HRI, CFG, PROG, prog, t, lang: () => lang, hans: () => hans, toS, setLang, applyI18n, rpc, errText, gate, qrSvg, rollSvg, stamp, stampStyle, tierIcon, TIERS, tierName: (k, l) => (TIERS[k] || TIERS.nori)[(l || lang) === "zh" ? "zh" : "en"], toast, burst, fmtDay, fmtTime, tour, TOKEN, coin, coinSpin, rollWeek, rwName };
})();
