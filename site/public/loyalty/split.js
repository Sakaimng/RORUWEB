/* f47 (Dominic, Oct 21 2026 2:26-2:55 PM HKT; mock v2 approved: "Yes, please build the app"): guest-first bill split, no staff approval.
   A = "Split with friends" right after a receipt scan: pick 2/3/4 -> a QR on the payer's phone -> friends scan it with the phone camera.
   B = "Send a share" from History: pick 2/3/4 -> one WhatsApp link, each person collects one share, 7 days, unclaimed shares come back.
   The server checks every collect and approves it on the spot (family_split_collect); a failed check waits for staff ("Needs a look").
   Replaces the f34/f35 invite-a-friend split (requests, accept/decline banners, inbox) in the guest app. */
(function () {
  // the friend's link: /family/?s=CODE. The preview passcode gate clears the address bar, so keep the code first.
  try { const q = new URLSearchParams(location.search).get("s"); if (q) sessionStorage.setItem("roru_split_code", q.replace(/[^0-9A-Za-z]/g, "").toUpperCase()); } catch (e) {}

  const R = () => window.RORU;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = {
    en: {
      split: "Split", share_nav: "Share", history: "History", split_n: "Split · {n} people",
      split_title: "Split with friends", how_many: "How many people, including you?", each: "each, {n} people",
      you: "You", you_keep: "You keep", rounding: "+{n} from rounding", friend_n: "Friend {n}",
      show_qr: "Show QR code", note_total: "Shares always add up to the bill, never more.",
      send_wa: "Send on WhatsApp", note_link: "One link · one share each · {d} days to collect",
      scan_cap: "Friends scan with their phone camera", scan_sub: "No app needed · HK${h} each",
      in: "In", waiting: "Waiting", member: "Member", new_member: "New member", done: "Done", back_note: "Unclaimed shares come back after {d} days.",
      review_h: "Staff will check this one", review_p: "This receipt is not from today, so staff take a quick look first. Your friends' shares are held for you until then.",
      receipt: "Receipt", bill: "HK${b} · Receipt #{no}",
      sent_title: "Shares sent", kept: "Kept on your card", earned_sent: "{e} earned · {s} sent", kept_lbl: "Kept",
      collected_at: "Collected {t}", not_yet: "Not collected yet", send_again: "Send the link again",
      comes_back: "Not collected by {d}? It comes back to you.", take_back: "Take back the shares nobody collected", taken_back: "Unclaimed shares are back on your card.",
      returned: "Came back to you", undone: "Undone by staff", on_hold: "Waiting for staff",
      wa_msg: "{who} sent you {n} $RORU from RORUBARU. Tap to collect:",
      send_share: "Send a share", shares_sent_btn: "Shares sent", paid_for: "Paid for friends?", paid_sub: "Send them their share of these $RORU. They collect it with a link, no app needed.",
      split_btn: "Split with friends", once: "Each receipt can only be claimed once.",
      // friend
      got_title: "Share received", got_split: "{who} split the bill with you.", got_sent: "{who} sent you a share of the bill.",
      your_share: "Your share", of_bill: "HK${h} of HK${b} · {n} people", added: "added", just_now: "Just now",
      open_card: "Open my card", signed_as: "Signed in as {who} · {ph}", collect_by: "Collect by", collect_n: "Collect {n} $RORU",
      join_title: "Join to collect", join_p: "{who} shared a HK${b} bill with you. Join the Roru Family to collect your share.", waiting_you: "$RORU waiting for you",
      join_btn: "Join with my phone number", join_note: "Free · takes 10 seconds · no app to download",
      welcome: "Welcome in", welcome_p: "You're in at {tier}: {line}", your_roru: "Your $RORU", from_bill: "from {who}'s bill",
      collected_title: "Share collected", collected_p: "{n} $RORU added to your card.",
      hold_title: "On hold", hold_already_claimed: "This receipt is already on your card, so staff check this share first.", hold_no_shares_left: "Every share of this bill is already collected. Staff will take a look.",
      hold_receipt_review: "This receipt is not from today, so staff check it first. Your share lands on your card once they OK it.",
      closed_title: "Link closed", closed_p: "This share is no longer open. Unclaimed shares go back to whoever paid after 7 days.",
      own_title: "Your own split", own_p: "This is the link you sent. Your friends open it to collect their share.",
      banner_join: "{n} $RORU from {who} are waiting. Join below to collect them.",
      e_split_points_spent: "Some of these $RORU are already spent, so this receipt can't be split now.",
      e_split_already: "This receipt is already split.", e_split_already_offered: "This receipt already has a split open.",
      e_split_too_small: "This receipt is too small to split.", e_split_wait_approval: "Staff are still checking this receipt. Split it once it's added.",
      e_split_link_not_found: "This link doesn't work. Ask your friend to send it again.", e_split_own: "This is your own split.",
      e_split_no_shares_left: "Every share is already collected."
    },
    zh: {
      split: "分單", share_nav: "分享", history: "紀錄", split_n: "分單 · {n} 人",
      split_title: "同朋友分單", how_many: "幾多人分（包括你）？", each: "每人，{n} 人",
      you: "你", you_keep: "你保留", rounding: "+{n} 四捨五入餘數", friend_n: "朋友 {n}",
      show_qr: "顯示 QR code", note_total: "每份加埋永遠等於張單，唔會多。",
      send_wa: "用 WhatsApp 傳送", note_link: "一條連結 · 每人一份 · {d} 日內領取",
      scan_cap: "朋友用手機相機掃描", scan_sub: "唔使下載 App · 每人 HK${h}",
      in: "已加入", waiting: "等緊", member: "會員", new_member: "新會員", done: "完成", back_note: "未領取嘅份數 {d} 日後退返俾你。",
      review_h: "職員會先睇一睇", review_p: "呢張收據唔係今日嘅，職員會先快速睇一睇。朋友嗰份會幫你保留住。",
      receipt: "收據", bill: "HK${b} · 收據 #{no}",
      sent_title: "已送出份數", kept: "留喺你張卡", earned_sent: "賺咗 {e} · 送出 {s}", kept_lbl: "保留",
      collected_at: "{t} 已領取", not_yet: "未領取", send_again: "再傳送連結",
      comes_back: "{d} 前未領取？會退返俾你。", take_back: "收返未領取嘅份數", taken_back: "未領取嘅份數已退返你張卡。",
      returned: "已退返俾你", undone: "職員已取消", on_hold: "等職員確認",
      wa_msg: "{who} 喺 RORUBARU 送咗 {n} RORU幣俾你，㩒一下領取：",
      send_share: "送份數俾朋友", shares_sent_btn: "已送出份數", paid_for: "幫朋友埋咗單？", paid_sub: "將呢啲 RORU幣分返俾佢哋。佢哋用連結領取，唔使下載 App。",
      split_btn: "同朋友分單", once: "每張收據只可以領取一次。",
      got_title: "收到份數", got_split: "{who} 同你分咗張單。", got_sent: "{who} 送咗佢張單嘅一份俾你。",
      your_share: "你嗰份", of_bill: "HK${b} 中嘅 HK${h} · {n} 人", added: "已加入", just_now: "啱啱",
      open_card: "打開我張卡", signed_as: "已登入：{who} · {ph}", collect_by: "領取期限", collect_n: "領取 {n} RORU幣",
      join_title: "加入領取", join_p: "{who} 同你分咗一張 HK${b} 嘅單。加入 Roru Family 領取你嗰份。", waiting_you: "RORU幣等緊你",
      join_btn: "用電話號碼加入", join_note: "免費 · 10 秒搞掂 · 唔使下載 App",
      welcome: "歡迎加入", welcome_p: "你由 {tier} 開始：{line}", your_roru: "你嘅 RORU幣", from_bill: "來自 {who} 張單",
      collected_title: "已領取", collected_p: "{n} RORU幣已加入你張卡。",
      hold_title: "等確認", hold_already_claimed: "呢張收據已經喺你張卡度，職員會先睇一睇。", hold_no_shares_left: "呢張單嘅份數已經領晒，職員會睇一睇。",
      hold_receipt_review: "呢張收據唔係今日嘅，職員會先睇一睇，確認後就會加入你張卡。",
      closed_title: "連結已關閉", closed_p: "呢份已經唔可以領取。未領取嘅份數 7 日後退返俾埋單嗰位。",
      own_title: "你自己嘅分單", own_p: "呢條係你送出嘅連結，朋友打開就可以領取。",
      banner_join: "{who} 送咗 {n} RORU幣俾你，喺下面加入就可以領取。",
      e_split_points_spent: "部分 RORU幣已經用咗，呢張收據暫時分唔到。", e_split_already: "呢張收據已經分咗。", e_split_already_offered: "呢張收據已經有一個分單進行緊。",
      e_split_too_small: "呢張收據太細，分唔到。", e_split_wait_approval: "職員仲睇緊呢張收據，加入之後先分。",
      e_split_link_not_found: "呢條連結用唔到，請朋友再傳一次。", e_split_own: "呢個係你自己嘅分單。", e_split_no_shares_left: "份數已經領晒。"
    },
    zhs: {
      split: "分单", share_nav: "分享", history: "记录", split_n: "分单 · {n} 人",
      split_title: "和朋友分单", how_many: "几个人分（包括你）？", each: "每人，{n} 人",
      you: "你", you_keep: "你保留", rounding: "+{n} 四舍五入余数", friend_n: "朋友 {n}",
      show_qr: "显示二维码", note_total: "每份加起来永远等于账单，不会多。",
      send_wa: "用 WhatsApp 发送", note_link: "一个链接 · 每人一份 · {d} 天内领取",
      scan_cap: "朋友用手机相机扫描", scan_sub: "无需下载 App · 每人 HK${h}",
      in: "已加入", waiting: "等待中", member: "会员", new_member: "新会员", done: "完成", back_note: "未领取的份数 {d} 天后退回给你。",
      review_h: "店员会先看一下", review_p: "这张收据不是今天的，店员会先快速看一下。朋友的份数会为你保留。",
      receipt: "收据", bill: "HK${b} · 收据 #{no}",
      sent_title: "已发出份数", kept: "留在你的卡", earned_sent: "赚了 {e} · 发出 {s}", kept_lbl: "保留",
      collected_at: "{t} 已领取", not_yet: "未领取", send_again: "再发送链接",
      comes_back: "{d} 前未领取？会退回给你。", take_back: "收回未领取的份数", taken_back: "未领取的份数已退回你的卡。",
      returned: "已退回给你", undone: "店员已取消", on_hold: "等待店员确认",
      wa_msg: "{who} 在 RORUBARU 送了 {n} RORU币给你，点一下领取：",
      send_share: "发份数给朋友", shares_sent_btn: "已发出份数", paid_for: "帮朋友买了单？", paid_sub: "把这些 RORU币分给他们。他们用链接领取，无需下载 App。",
      split_btn: "和朋友分单", once: "每张收据只能领取一次。",
      got_title: "收到份数", got_split: "{who} 和你分了账单。", got_sent: "{who} 送了账单的一份给你。",
      your_share: "你的份数", of_bill: "HK${b} 中的 HK${h} · {n} 人", added: "已加入", just_now: "刚刚",
      open_card: "打开我的卡", signed_as: "已登录：{who} · {ph}", collect_by: "领取期限", collect_n: "领取 {n} RORU币",
      join_title: "加入领取", join_p: "{who} 和你分了一张 HK${b} 的账单。加入 Roru Family 领取你的份数。", waiting_you: "RORU币在等你",
      join_btn: "用手机号加入", join_note: "免费 · 10 秒完成 · 无需下载 App",
      welcome: "欢迎加入", welcome_p: "你从 {tier} 开始：{line}", your_roru: "你的 RORU币", from_bill: "来自 {who} 的账单",
      collected_title: "已领取", collected_p: "{n} RORU币已加入你的卡。",
      hold_title: "等待确认", hold_already_claimed: "这张收据已经在你的卡上，店员会先看一下。", hold_no_shares_left: "这张账单的份数已经领完，店员会看一下。",
      hold_receipt_review: "这张收据不是今天的，店员会先看一下，确认后就会加入你的卡。",
      closed_title: "链接已关闭", closed_p: "这份已经不能领取。未领取的份数 7 天后退回给买单的人。",
      own_title: "你自己的分单", own_p: "这是你发出的链接，朋友打开就可以领取。",
      banner_join: "{who} 送了 {n} RORU币给你，在下面加入就可以领取。",
      e_split_points_spent: "部分 RORU币已经用了，这张收据暂时不能分。", e_split_already: "这张收据已经分了。", e_split_already_offered: "这张收据已经有一个分单在进行。",
      e_split_too_small: "这张收据太小，不能分。", e_split_wait_approval: "店员还在看这张收据，加入后再分。",
      e_split_link_not_found: "这个链接用不了，请朋友再发一次。", e_split_own: "这是你自己的分单。", e_split_no_shares_left: "份数已经领完。"
    }
  };
  const lk = () => (R().lang() === "zh" ? (R().hans && R().hans() ? "zhs" : "zh") : "en");
  const tx = (k, v) => { let s = L[lk()][k]; if (s == null) s = L.en[k]; if (s == null) s = k; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; };
  const errT = (e) => { const c = e && e.code; return (c && (L[lk()]["e_" + c] || L.en["e_" + c])) || R().errText(e); };
  const IC = {
    back: '<path d="M15 5l-7 7 7 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    shield: '<path d="M12 3l7 3v5.5c0 4.4-3 7.9-7 9.5-4-1.6-7-5.1-7-9.5V6z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', send: '<path d="M4.5 11.5L20 4l-5.5 16-3.2-6.6z"/><path d="M11.3 13.4L20 4"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/>',
    receipt: '<path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>',
    warn: '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10v4.2M12 17.2v.1"/>', undo: '<path d="M9 14.5L4.5 10 9 5.5"/><path d="M4.5 10H15a4.5 4.5 0 010 9h-3"/>'
  };
  const ic = (k, w) => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + "</svg>";
  const m2 = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const m0 = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const int = (n) => Number(n || 0).toLocaleString("en-US");
  const coin = () => R().coin(false);
  const tok = () => { try { return localStorage.getItem("roru_member_token"); } catch (e) { return null; } };
  const days = () => (S.cfg && S.cfg.days) || 7;
  const hm = (iso) => { const d = new Date(iso); return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Hong_Kong" }); };
  const dmy = (iso) => { const d = new Date(iso), p = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Hong_Kong" }).formatToParts(d); const dd = p.find(x => x.type === "day").value, mo = p.find(x => x.type === "month").value;
    if (lk() !== "en") { const mm = new Intl.DateTimeFormat("en-GB", { month: "numeric", timeZone: "Asia/Hong_Kong" }).format(d); return mm + "月" + dd + "日"; } return dd + " " + mo; };
  const recNo = (r) => r.receipt_no || ("" + (r.receipt_id || r.id || ""));
  const billLine = (b, no) => { no = String(no || ""); const tbl = /^(Table|枱|桌)\s/i.test(no) || /^STAFF-/.test(no); return tbl ? "HK$" + b + (no && !/^STAFF-/.test(no) ? " · " + esc(no) : "") : tx("bill", { b, no: esc(no) }); };
  const S = { cfg: null, mine: null, poll: null };

  // ---------- the full-screen sheet (every screen has a way out) ----------
  function sheet(navT, opts) {
    opts = opts || {};
    const o = document.createElement("div"); o.className = "sx" + (opts.cls ? " " + opts.cls : ""); o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
    o.innerHTML = '<div class="sx-in">' + (opts.web
      ? '<div class="sx-nav"><img class="sx-logo" src="/logo-2l.png?v=f47" alt="RORUBARU" width="62" height="32"><span class="nav-t"></span><button type="button" class="cb" data-x aria-label="Close">' + ic("x") + "</button></div>"
      : '<div class="sx-nav"><button type="button" class="cb' + (opts.noBack ? " none" : "") + '" data-back aria-label="Back">' + ic("back") + '</button><span class="nav-t">' + esc(navT || "") + '</span><button type="button" class="cb" data-x aria-label="Close">' + ic("x") + "</button></div>") +
      '<div class="sx-b"></div></div>';
    document.body.appendChild(o); document.documentElement.classList.add("sx-open");
    const api = { el: o, body: o.querySelector(".sx-b"), nav: o.querySelector(".nav-t"),
      close: () => { clearInterval(S.poll); S.poll = null; o.remove(); if (!document.querySelector(".sx")) document.documentElement.classList.remove("sx-open"); if (opts.onClose) opts.onClose(); },
      set: (html) => { api.body.innerHTML = html; api.body.scrollTop = 0; o.scrollTop = 0; } };
    o.querySelector("[data-x]").onclick = () => (opts.onX ? opts.onX(api) : api.close());
    const b = o.querySelector("[data-back]"); if (b) b.onclick = () => (opts.onBack ? opts.onBack(api) : (opts.onX ? opts.onX(api) : api.close()));
    return api;
  }
  const busy = (btn, on) => { if (btn) { btn.disabled = on; btn.classList.toggle("busy", on); } };

  // ---------- picker (A2 / B2): 2, 3 or 4 people, even shares, the payer keeps the rounding ----------
  function pickerHtml(rc, n, mode) {
    const pts = +rc.points, sp = Math.floor(pts / n), keep = pts - sp * (n - 1), each = (Math.round((+rc.total_hkd / n) * 100) / 100), max = (S.cfg && S.cfg.max_people) || 4;
    const rows = ['<div class="ig-row"><span class="av me">' + esc((R().__meName || "Y").slice(0, 1).toUpperCase()) + '</span><span class="ig-t"><b>' + tx(mode === "link" ? "you_keep" : "you") + "</b>" + (keep > sp ? "<small>" + tx("rounding", { n: keep - sp }) + "</small>" : "") + '</span><span class="amt">' + coin() + int(keep) + "</span></div>"];
    for (let i = 2; i <= n; i++) rows.push('<div class="ig-row"><span class="av">' + i + '</span><span class="ig-t"><b>' + tx("friend_n", { n: i }) + '</b></span><span class="amt">' + coin() + int(sp) + "</span></div>");
    let seg = ""; for (let k = 2; k <= Math.min(4, max); k++) seg += '<button type="button" data-n="' + k + '"' + (k === n ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + ">" + k + "</button>";
    return '<div class="ttl">' + tx("split_title") + '</div><p class="sub">' + billLine(m2(rc.total_hkd), recNo(rc)) + "</p>" +
      '<div class="lbl">' + tx("how_many") + '</div><div class="seg seg' + (Math.min(4, max) - 1) + '">' + seg + "</div>" +
      '<div class="each"><span class="big n"><small>HK$</small>' + m2(each) + '</span><span class="x">' + tx("each", { n }) + "</span></div>" +
      '<div class="ig sp">' + rows.join("") + "</div>" +
      '<div class="grow"></div><div class="foot"><div class="err hide" id="sxErr"></div><button type="button" class="mbtn" id="sxGo">' + (mode === "link" ? tx("send_wa") : tx("show_qr")) + "</button>" +
      '<p class="note">' + (mode === "link" ? ic("clock", 1.8) + tx("note_link", { d: days() }) : ic("shield", 1.8) + tx("note_total")) + "</p></div>";
  }
  function openPicker(rc, mode, sh) {
    let n = 3; if (+rc.points < 3) n = 2;
    sh = sh || sheet(tx(mode === "link" ? "share_nav" : "split"));
    sh.nav.textContent = tx(mode === "link" ? "share_nav" : "split");
    const draw = () => {
      sh.set(pickerHtml(rc, n, mode));
      sh.body.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { n = +b.dataset.n; draw(); });
      sh.body.querySelector("#sxGo").onclick = async (e) => {
        const btn = e.currentTarget; busy(btn, true);
        // WhatsApp must open inside the tap (iOS blocks a window opened after an await)
        const wa = mode === "link" ? window.open("", "_blank") : null;
        try {
          const r = await R().rpc("family_split_create", { p_token: tok(), p_receipt_id: rc.id, p_people: n, p_mode: mode });
          document.dispatchEvent(new CustomEvent("roru:member", { detail: r.member }));
          if (mode === "link") { const u = waUrl(r.link); if (wa) wa.location.href = u; else location.href = u; await refreshMine(); showSent(r.link, sh); }
          else showQr(r.link, sh, rc);
        } catch (err) { if (wa) wa.close(); const el = sh.body.querySelector("#sxErr"); el.textContent = errT(err); el.classList.remove("hide"); busy(btn, false); }
      };
    };
    sh.el.querySelector("[data-back]").onclick = () => sh.close();
    draw(); return sh;
  }

  // ---------- links ----------
  function linkUrl(l) {
    let u = location.origin + "/family/?s=" + encodeURIComponent(l.code);
    // preview only: the friend's phone needs the passcode too (the counter QR carries it the same way)
    try { const R0 = R(); if (R0.CFG && R0.CFG.passHash && localStorage.getItem("roru_preview_ok") === R0.CFG.passHash && S.pass) u += "&p=" + encodeURIComponent(S.pass); } catch (e) {}
    return u;
  }
  function waUrl(l) { return "https://wa.me/?text=" + encodeURIComponent(tx("wa_msg", { who: R().__meName || "", n: int(l.share) }) + " " + linkUrl(l)); }

  // ---------- A3: QR on the payer's phone, live list of who is in ----------
  function slotRows(l, mode) {
    const me = R().__meName || tx("you");
    const rows = ['<div class="ig-row"><span class="av me">' + esc(me.slice(0, 1).toUpperCase()) + '</span><span class="ig-t"><b>' + tx("you") + '</b></span>' +
      (mode === "sent" ? '<span class="st out">' + tx("kept_lbl") + "</span>" + '<span class="amt">' + coin() + int(l.keep) + "</span>" : '<span class="st ok">' + ic("check") + tx("in") + "</span>") + "</div>"];
    const got = (l.claims || []).filter(c => c.status === "added");
    got.forEach(c => rows.push('<div class="ig-row"><span class="av ok">' + esc(String(c.first || c.who || "?").slice(0, 1).toUpperCase()) + '</span><span class="ig-t"><b>' + esc(c.who) + "</b><small>" +
      (mode === "sent" ? tx("collected_at", { t: hm(c.decided_at || c.at) }) : (c.new_member ? tx("new_member") : tx("member"))) + "</small></span>" +
      (mode === "sent" ? '<span class="amt">' + coin() + int(c.points) + "</span>" : '<span class="st ok">' + ic("check") + tx("in") + "</span>") + "</div>"));
    for (let i = got.length + 2; i <= l.people; i++) {
      const closed = ["returned", "cancelled", "undone", "rejected"].includes(l.status);
      rows.push('<div class="ig-row"><span class="av wait">' + i + '</span><span class="ig-t"><b>' + tx("friend_n", { n: i }) + "</b>" + (mode === "sent" ? "<small>" + (closed ? tx(l.status === "undone" ? "undone" : "returned") : l.status === "review" ? tx("on_hold") : tx("not_yet")) + "</small>" : "") + "</span>" +
        (mode === "sent" ? '<span class="amt dim">' + coin() + int(l.share) + "</span>" : '<span class="st wait"><span class="dots"><i></i><i></i><i></i></span>' + tx("waiting") + "</span>") + "</div>");
    }
    return rows.join("");
  }
  function showQr(l, sh, rc) {
    window.RORU_SPLIT._last = l;
    sh.nav.textContent = tx("split_n", { n: l.people });
    const back = async () => { if (!+l.collected && (l.status === "open" || l.status === "review")) { try { await R().rpc("family_split_link_cancel", { p_token: tok(), p_link_id: l.id }).then(r => document.dispatchEvent(new CustomEvent("roru:member", { detail: r.member }))); } catch (e) {} } };
    sh.el.querySelector("[data-back]").onclick = async () => { clearInterval(S.poll); await back(); openPicker(rc, "qr", sh); };
    sh.el.querySelector("[data-x]").onclick = async () => { await back(); sh.close(); };
    const draw = () => {
      const review = l.status === "review";
      sh.set((review
        ? '<div class="sx-hold">' + ic("clock", 1.8) + "<b>" + tx("review_h") + "</b><p>" + tx("review_p") + "</p></div>"
        : '<div class="qrbox">' + R().qrSvg(linkUrl(l), 208).replace("<svg ", '<svg class="q" ') + '<span class="qrlogo"><img src="/loyalty/img/roru_logo_128.png" alt=""></span></div>' +
          '<div class="qrcap"><b>' + tx("scan_cap") + "</b><small>" + tx("scan_sub", { h: m2(Math.round(+l.bill / l.people * 100) / 100) }) + "</small></div>") +
        '<div class="ig sp sx-slots">' + slotRows(l, "qr") + "</div>" +
        '<div class="grow"></div><div class="foot"><button type="button" class="mbtn" id="sxDone">' + tx("done") + '</button><p class="note">' + ic("clock", 1.8) + tx("back_note", { d: days() }) + "</p></div>");
      sh.body.querySelector("#sxDone").onclick = () => { refreshMine(); sh.close(); };
    };
    draw();
    clearInterval(S.poll);
    S.poll = setInterval(async () => {
      if (!sh.el.isConnected) return clearInterval(S.poll);
      try { const nl = await R().rpc("family_split_status", { p_token: tok(), p_link_id: l.id }); const ch = nl.collected !== l.collected || nl.status !== l.status; l = nl; if (ch) { draw(); if (+l.collected) R().burst(); } } catch (e) {}
    }, 2500);
  }

  // ---------- B6: shares sent (History) ----------
  function showSent(l, sh) {
    sh = sh || sheet(tx("history"));
    sh.nav.textContent = tx("history");
    sh.el.querySelector("[data-back]").onclick = () => sh.close();
    sh.el.querySelector("[data-x]").onclick = () => sh.close();
    const sent = (+l.points_total) - (+l.keep);
    const live = l.status === "open" || l.status === "review";
    const left = +l.left;
    sh.set('<div class="ttl">' + tx("sent_title") + '</div><p class="sub">' + billLine(m2(l.bill), recNo(l)) + "</p>" +
      '<div class="rc"><div class="rc-k">' + tx("kept") + '</div><div class="rc-total n sx-kept">' + coin() + int(l.keep) + '<small>$RORU</small></div>' +
      '<div class="rc-sub"><span>' + tx("earned_sent", { e: int(l.points_total), s: int(sent) }) + "</span></div></div>" +
      '<div class="ig sp sx-slots">' + slotRows(l, "sent") + "</div>" +
      '<div class="grow"></div><div class="foot">' +
      (live && left > 0 && l.status === "open" ? '<button type="button" class="mbtn" id="sxAgain">' + ic("send") + tx("send_again") + "</button>" : "") +
      '<button type="button" class="mbtn' + (live && left > 0 && l.status === "open" ? " sec" : "") + '" id="sxDone">' + tx("done") + "</button>" +
      (live && left > 0 ? '<p class="note">' + ic("clock", 1.8) + tx("comes_back", { d: dmy(l.expires_at) }) + '</p><p class="note"><a href="#" class="lnk" id="sxTake">' + tx("take_back") + "</a></p>" : "") + "</div>");
    const ag = sh.body.querySelector("#sxAgain"); if (ag) ag.onclick = () => { const u = waUrl(l); const w = window.open(u, "_blank"); if (!w) location.href = u; };
    sh.body.querySelector("#sxDone").onclick = () => sh.close();
    const tk = sh.body.querySelector("#sxTake"); if (tk) tk.onclick = async (e) => { e.preventDefault(); try { const r = await R().rpc("family_split_link_cancel", { p_token: tok(), p_link_id: l.id }); document.dispatchEvent(new CustomEvent("roru:member", { detail: r.member })); R().toast(tx("taken_back"), 3000); await refreshMine(); showSent(r.link, sh); } catch (err) { R().toast(errT(err), 3500); } };
    return sh;
  }

  async function refreshMine() { if (!tok()) return null; try { S.mine = await R().rpc("family_split_mine", { p_token: tok() }); S.cfg = { days: S.mine.days, max_people: S.mine.max_people }; } catch (e) {} document.dispatchEvent(new CustomEvent("roru:splits")); return S.mine; }
  const linkFor = (receiptId) => S.mine && (S.mine.links || []).find(l => +l.receipt_id === +receiptId && l.status !== "cancelled");

  // ---------- friend: the page behind the QR / WhatsApp link ----------
  async function friend(code) {
    const sh = sheet("", { web: true, onX: (api) => { try { sessionStorage.removeItem("roru_split_code"); } catch (e) {} api.close(); } });
    sh.set('<div class="sx-load"><span class="dots"><i></i><i></i><i></i></span></div>');
    let p;
    try { p = await R().rpc("family_split_peek", { p_code: code, p_token: tok() }); }
    catch (e) { return closedView(sh, e.code === "split_link_not_found" ? errT(e) : tx("closed_p")); }
    const signed = '<p class="sx-who">' + (p.me_name ? tx("signed_as", { who: esc(p.me_name), ph: esc(p.me_phone || "") }) : "") + "</p>";
    if (p.me === "payer") { sh.set('<div class="ttl">' + tx("own_title") + '</div><p class="sub">' + tx("own_p") + "</p>" + shareCard(p, false) + '<div class="grow"></div><div class="foot"><button type="button" class="mbtn" data-open>' + tx("open_card") + "</button></div>"); wireOpen(sh); try { sessionStorage.removeItem("roru_split_code"); } catch (e) {} return; }
    if (p.me === "collected") return gotView(sh, p, { status: "already", points: p.my_points }, signed);
    if (p.me === "flagged") return holdView(sh, p, null, signed);
    if (!p.live) return closedView(sh, tx("closed_p"));
    if (p.me === "guest") return joinView(sh, p, code);
    if (p.mode === "qr") return collect(sh, p, code, signed, false);
    // B: the friend taps Collect
    sh.set('<div class="ttl">' + tx("got_title") + '</div><p class="sub">' + tx("got_sent", { who: esc(p.from) }) + "</p>" + shareCard(p, false) +
      '<div class="exp">' + ic("clock", 1.8) + "<span>" + tx("collect_by") + "</span><b>" + dmy(p.expires_at) + "</b></div>" +
      '<div class="grow"></div><div class="foot"><div class="err hide" id="sxErr"></div><button type="button" class="mbtn" id="sxCollect">' + coin() + tx("collect_n", { n: int(p.share) }) + "</button>" + signed + "</div>");
    sh.body.querySelector("#sxCollect").onclick = () => collect(sh, p, code, signed, false, sh.body.querySelector("#sxCollect"));
  }
  function shareCard(p, added, at) {
    return '<div class="share"><div class="who"><span class="av me">' + esc(String(p.from || "?").slice(0, 1).toUpperCase()) + "</span><div><b>" + esc(p.from) + "</b><small>RORUBARU " + (p.shop === "central" ? "Central" : "Wan Chai") + " · " + dmy(p.at) + ", " + hm(p.at) + "</small></div></div>" +
      '<div class="k">' + tx("your_share") + '</div><div class="big n">' + coin() + int(p.share) + "<small>$RORU</small></div>" +
      '<div class="of">' + tx("of_bill", { h: m2(p.share_hkd), b: m2(p.bill), n: p.people }) + "</div>" +
      (added ? '<div class="added">' + ic("check") + "<span><b>+" + int(p.share) + " $RORU</b> " + tx("added") + "</span><em>" + (at || tx("just_now")) + "</em></div>" : "") + "</div>";
  }
  function miniCard(m, p) {
    const tier = (m && m.tier) || "nori", R0 = R(), T = R0.TIERS[tier] || R0.TIERS.nori;
    return '<div class="mini t-' + tier + '"><div class="t"><span class="tier">' + esc(T.en) + '</span><span class="zh">' + esc(T.zh) + '</span><span class="nm">' + esc((m && m.name) || "") + "</span></div>" +
      '<div class="k">' + tx("your_roru") + '</div><div class="b n">' + coin() + int(m ? (m.balance != null ? m.balance : m.shari_balance != null ? m.shari_balance : m.points) : 0) + "<small>$RORU</small></div>" +
      '<div class="p">' + ic("check") + "<b>+" + int(p.share) + "</b>" + tx("from_bill", { who: esc(p.from) }) + "<span>" + tx("added") + "</span></div></div>";
  }
  function wireOpen(sh) { sh.body.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { try { sessionStorage.removeItem("roru_split_code"); } catch (e) {} sh.close(); document.dispatchEvent(new CustomEvent("roru:open-card")); }); }
  async function collect(sh, p, code, signed, isNew, btn) {
    busy(btn, true);
    let r;
    try { r = await R().rpc("family_split_collect", { p_token: tok(), p_code: code, p_new: !!isNew }); }
    catch (e) { busy(btn, false); if (/expired|closed/.test(e.code || "")) return closedView(sh, tx("closed_p")); const el = sh.body.querySelector("#sxErr"); if (el) { el.textContent = errT(e); el.classList.remove("hide"); } else closedView(sh, errT(e)); return; }
    try { sessionStorage.removeItem("roru_split_code"); } catch (e) {}
    document.dispatchEvent(new CustomEvent("roru:member", { detail: r.member }));
    if (r.status === "flagged") return holdView(sh, p, r.reason, signed);
    if (r.status === "added") R().burst();
    gotView(sh, p, r, signed);
  }
  function gotView(sh, p, r, signed) {
    const m = r.member, isNew = !!r.new_member, tier = (m && m.tier) || "nori", T = R().TIERS[tier] || R().TIERS.nori;
    if (isNew) sh.set('<div class="wel"><img src="/loyalty/img/roru_logo_192.png" alt="" width="96" height="96"><div class="ttl">' + tx("welcome") + '</div><p class="sub">' + tx("welcome_p", { tier: esc(T[lk() === "en" ? "en" : "zh"]), line: esc(lk() === "en" ? T.line_en : T.line_zh) }) + "</p></div>" + miniCard(m, p) +
      '<div class="grow"></div><div class="foot"><button type="button" class="mbtn" data-open>' + tx("open_card") + "</button>" + signed + "</div>");
    else if (p.mode === "link" && r.status !== "already") sh.set('<div class="ttl">' + tx("collected_title") + '</div><p class="sub">' + tx("collected_p", { n: int(p.share) }) + "</p>" + miniCard(m, p) +
      '<div class="grow"></div><div class="foot"><button type="button" class="mbtn" data-open>' + tx("open_card") + "</button>" + signed + "</div>");
    else sh.set('<div class="ttl">' + tx("got_title") + '</div><p class="sub">' + tx(p.mode === "link" ? "got_sent" : "got_split", { who: esc(p.from) }) + "</p>" + shareCard(p, true, r.status === "already" && p.my_at ? hm(p.my_at) : null) +
      '<div class="grow"></div><div class="foot"><button type="button" class="mbtn" data-open>' + tx("open_card") + "</button>" + signed + "</div>");
    wireOpen(sh);
  }
  function holdView(sh, p, reason, signed) {
    sh.set('<div class="ttl">' + tx("hold_title") + '</div><p class="sub">' + tx("hold_" + (reason || "receipt_review")) + "</p>" + shareCard(p, false) +
      '<div class="pend">' + ic("clock", 1.8) + tx("on_hold") + "</div>" +
      '<div class="grow"></div><div class="foot"><button type="button" class="mbtn" data-open>' + tx("open_card") + "</button>" + (signed || "") + "</div>");
    wireOpen(sh);
  }
  function closedView(sh, msg) {
    sh.set('<div class="ttl">' + tx("closed_title") + '</div><p class="sub">' + esc(msg) + '</p><div class="grow"></div><div class="foot"><button type="button" class="mbtn" data-open>' + tx("open_card") + "</button></div>");
    wireOpen(sh); try { sessionStorage.removeItem("roru_split_code"); } catch (e) {}
  }
  // A4b: not a member yet -> the normal sign-up (phone number + WhatsApp code), then the share is collected on its own
  function joinView(sh, p, code) {
    sh.set('<div class="ttl">' + tx("join_title") + '</div><p class="sub">' + tx("join_p", { who: esc(p.from), b: m0(p.bill) }) + "</p>" +
      '<div class="share sx-wait"><div class="big n">' + coin() + int(p.share) + "</div><div class=\"of\">" + tx("waiting_you") + "</div></div>" +
      '<div class="grow"></div><div class="foot"><button type="button" class="mbtn" id="sxJoin">' + tx("join_btn") + '</button><p class="note">' + ic("shield", 1.8) + tx("join_note") + "</p></div>");
    sh.body.querySelector("#sxJoin").onclick = () => {
      try { sessionStorage.setItem("roru_split_join", JSON.stringify({ code, who: p.from, n: p.share })); } catch (e) {}
      sh.close(); joinBanner(); const ph = document.querySelector("#phone"); if (ph) setTimeout(() => ph.focus(), 120);
      waitForSignIn(code);
    };
  }
  function joinBanner() {
    let j = null; try { j = JSON.parse(sessionStorage.getItem("roru_split_join") || "null"); } catch (e) {}
    const host = document.querySelector("#signin"); if (!host) return;
    let b = host.querySelector(".sx-joinbar");
    if (!j) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("div"); b.className = "notice sx-joinbar"; host.insertBefore(b, host.querySelector(".card")); }
    b.innerHTML = coin() + "<span>" + esc(tx("banner_join", { n: int(j.n), who: j.who })) + "</span>";
  }
  function waitForSignIn(code) {
    const iv = setInterval(() => {
      if (!tok()) return;
      clearInterval(iv); try { sessionStorage.removeItem("roru_split_join"); } catch (e) {}
      joinBanner();
      setTimeout(async () => {
        const sh = sheet("", { web: true });
        sh.set('<div class="sx-load"><span class="dots"><i></i><i></i><i></i></span></div>');
        let p; try { p = await R().rpc("family_split_peek", { p_code: code, p_token: tok() }); } catch (e) { return closedView(sh, errT(e)); }
        const signed = '<p class="sx-who">' + tx("signed_as", { who: esc(p.me_name || ""), ph: esc(p.me_phone || "") }) + "</p>";
        if (p.me === "payer") return closedView(sh, tx("e_split_own"));
        collect(sh, p, code, signed, true);
      }, 600);
    }, 700);
  }

  // ---------- B1 entry from History ----------
  function historyButton(rc) {
    if (!rc || rc.status !== "approved" || rc.source === "split" || rc.source === "staff_split" || +rc.points < 2) return "";
    const l = linkFor(rc.id);
    if (l) return '<button type="button" class="btn ghost sm sx-hbtn" data-sx-sent="' + rc.id + '">' + tx("shares_sent_btn") + "</button>";
    if (rc.base_key) return "";
    return '<button type="button" class="btn ghost sm sx-hbtn" data-sx-send="' + rc.id + '">' + ic("send") + tx("send_share") + "</button>";
  }
  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-sx-send]"), t = e.target.closest("[data-sx-sent]");
    if (s) { e.preventDefault(); const rc = (window.RORU_SPLIT._receipts || {})[s.dataset.sxSend]; if (rc) openPicker(rc, "link"); }
    if (t) { e.preventDefault(); const l = linkFor(t.dataset.sxSent); if (l) showSent(l); }
  });

  function boot(me) {
    if (me && me.name) R().__meName = String(me.name).split(" ")[0];
    let code = null; try { code = sessionStorage.getItem("roru_split_code"); } catch (e) {}
    if (code && !document.querySelector(".sx")) { friend(code); }
    joinBanner();
    try { const j = JSON.parse(sessionStorage.getItem("roru_split_join") || "null"); if (j && !tok()) waitForSignIn(j.code); } catch (e) {}
    refreshMine();
  }
  // remember the preview passcode from the address bar before the gate clears it (only used on the preview, to carry it in the friend's link)
  try { const q = new URLSearchParams(location.search).get("p"); if (q) localStorage.setItem("roru_pp", q); S.pass = localStorage.getItem("roru_pp"); } catch (e) {}

  window.RORU_SPLIT = { start: (rc) => openPicker(rc, "qr"), send: (rc) => openPicker(rc, "link"), showSent, refreshMine, historyButton, linkFor, boot, friend, tx, _receipts: {} };
})();
