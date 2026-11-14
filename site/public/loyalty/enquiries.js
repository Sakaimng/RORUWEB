/* RORUBARU enquiries pipeline — PREVIEW ONLY (Nov 14 2026).
   Synthetic storage: sample rows + anything submitted on the /events or /catering
   preview pages, kept in this browser's localStorage. Nothing is sent anywhere.
   Production wiring (Supabase roru_enquiries + RPCs) ships in db/enquiries.sql and
   is applied only after owner approval. */
window.RORU_ENQUIRIES = (function () {
  const LS_KEY = "roru_preview_enquiries_v1";
  const STATUSES = ["new", "in_touch", "agreed", "closed"];
  const ST_LABEL = { new: "New", in_touch: "In touch", agreed: "Agreed", closed: "Closed" };
  const KIND_LABEL = { event: "Event", catering: "Catering" };

  // Sample rows so the pipeline can be reviewed before real enquiries exist.
  const SAMPLE = [
    {
      id: "sample-1", sample: true, kind: "event", status: "new",
      created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
      name: "Sample enquiry", email: "events@example.com", phone: "+852 9000 0000",
      event_date: "", headcount: 24, budget: "Not sure",
      message: "SAMPLE — a private buyout enquiry would appear here with the date, headcount, budget and message the guest typed.",
      notes: ""
    },
    {
      id: "sample-2", sample: true, kind: "catering", status: "in_touch",
      created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
      name: "Sample enquiry", email: "office@example.com", phone: "",
      event_date: "", headcount: 40, budget: "Not sure",
      details: { fulfil: "Delivery", company: "Example Ltd" },
      message: "SAMPLE — a corporate catering enquiry: what they need, when, delivery or pickup, and how to reach them.",
      notes: ""
    }
  ];

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { return []; }
  }
  function writeLocal(rows) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch (e) {}
  }

  function submitLocal(payload) {
    const rows = readLocal();
    const row = Object.assign({}, payload, {
      id: "local-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      status: "new",
      created_at: new Date().toISOString(),
      preview: true,
      notes: ""
    });
    rows.unshift(row);
    writeLocal(rows.slice(0, 50));
    return row;
  }

  function list() {
    return readLocal().concat(SAMPLE);
  }
  function countNew() {
    return list().filter(r => r.status === "new").length;
  }
  function setStatus(id, status) {
    if (STATUSES.indexOf(status) < 0) return;
    const s = SAMPLE.find(r => r.id === id);
    if (s) { s.status = status; return; }
    const rows = readLocal();
    const r = rows.find(x => x.id === id);
    if (r) { r.status = status; writeLocal(rows); }
  }
  function setNotes(id, notes) {
    const s = SAMPLE.find(r => r.id === id);
    if (s) { s.notes = notes; return; }
    const rows = readLocal();
    const r = rows.find(x => x.id === id);
    if (r) { r.notes = notes; writeLocal(rows); }
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function fmtWhen(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-HK", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-HK", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  }

  const CSS = `
.enq-list{display:flex;flex-direction:column;gap:10px}
.enq{background:var(--ink2,rgba(246,243,231,.05));border:1px solid var(--line,rgba(246,243,231,.12));border-radius:14px;padding:12px 14px}
.enq .top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.enq .kind{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:99px;background:rgba(246,69,1,.16);color:#ff8a5c}
.enq .kind.catering{background:rgba(120,180,255,.14);color:#9cc4ff}
.enq .st{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(246,243,231,.1);color:var(--muted,#a8a49a)}
.enq .st.new{background:rgba(246,69,1,.9);color:#fff}
.enq .when{margin-left:auto;font-size:12px;color:var(--muted,#a8a49a)}
.enq .who{font-weight:700;margin-top:6px}
.enq .meta{font-size:13px;color:var(--muted,#a8a49a);margin-top:2px}
.enq .msg{font-size:14px;margin-top:8px;white-space:pre-wrap}
.enq .tag{font-size:10px;font-weight:800;letter-spacing:.05em;padding:1px 6px;border-radius:99px;border:1px dashed rgba(246,69,1,.7);color:#ff8a5c}
.enq .acts2{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.enq .acts2 button{appearance:none;border:1px solid var(--line,rgba(246,243,231,.16));background:transparent;color:inherit;font:inherit;font-size:12px;font-weight:700;padding:6px 12px;border-radius:99px;cursor:pointer}
.enq .acts2 button.on{background:var(--cream,#f6f3e7);color:#16181f;border-color:var(--cream,#f6f3e7)}
.enq textarea{width:100%;margin-top:8px;background:transparent;border:1px solid var(--line,rgba(246,243,231,.16));border-radius:10px;color:inherit;font:inherit;font-size:13px;padding:8px 10px;min-height:34px}
.enq .sample-note{font-size:11px;color:var(--muted,#a8a49a);margin-top:6px}
`;

  function mountView(el, opts) {
    opts = opts || {};
    if (!document.getElementById("enq-css")) {
      const st = document.createElement("style");
      st.id = "enq-css";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    function render() {
      const rows = list();
      let html = '<div class="enq-list">';
      if (!rows.length) html += '<p class="enq .meta" style="color:var(--muted,#a8a49a);font-size:13px">No enquiries yet.</p>';
      rows.forEach(r => {
        const det = r.details || {};
        const bits = [];
        if (det.company) bits.push(esc(det.company));
        if (r.event_date) bits.push("date: " + esc(r.event_date));
        if (r.headcount) bits.push(esc(r.headcount) + " pax");
        if (r.budget) bits.push("budget: " + esc(r.budget));
        if (det.fulfil) bits.push(esc(det.fulfil));
        const contact = [r.email, r.phone].filter(Boolean).map(esc).join(" · ");
        html += '<div class="enq" data-id="' + esc(r.id) + '">'
          + '<div class="top"><span class="kind ' + esc(r.kind) + '">' + esc(KIND_LABEL[r.kind] || r.kind) + '</span>'
          + '<span class="st ' + esc(r.status) + '">' + esc(ST_LABEL[r.status] || r.status) + '</span>'
          + (r.sample ? '<span class="tag">SAMPLE</span>' : '')
          + (r.preview ? '<span class="tag">PREVIEW</span>' : '')
          + '<span class="when">' + esc(fmtWhen(r.created_at)) + '</span></div>'
          + '<div class="who">' + esc(r.name) + '</div>'
          + '<div class="meta">' + contact + (bits.length ? " · " + bits.join(" · ") : "") + '</div>'
          + (r.message ? '<div class="msg">' + esc(r.message) + '</div>' : '')
          + '<div class="acts2">' + STATUSES.map(s => '<button type="button" data-st="' + s + '"' + (r.status === s ? ' class="on"' : '') + '>' + ST_LABEL[s] + '</button>').join("") + '</div>'
          + '<textarea placeholder="Internal note (saved on Save)">' + esc(r.notes || "") + '</textarea>'
          + '<div class="acts2"><button type="button" data-save>Save note</button></div>'
          + (r.sample ? '<div class="sample-note">Sample row for the preview — real enquiries appear here once the pipeline is connected.</div>' : '')
          + '</div>';
      });
      html += "</div>";
      el.innerHTML = html;
      el.querySelectorAll(".enq").forEach(card => {
        const id = card.getAttribute("data-id");
        card.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { setStatus(id, b.getAttribute("data-st")); render(); if (opts.onChange) opts.onChange(); });
        const sv = card.querySelector("[data-save]");
        if (sv) sv.onclick = () => { setNotes(id, card.querySelector("textarea").value); if (opts.toast) opts.toast("Note saved ✓"); };
      });
    }
    render();
    return { refresh: render };
  }

  return { STATUSES, ST_LABEL, submitLocal, list, countNew, setStatus, setNotes, mountView };
})();
