/* Roru Family · Month-end export (manager + owner). PDF (A4) + CSV of every loyalty event to match against the POS. */
(function () {
  const R = window.RORU;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hk = (iso) => iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Hong_Kong", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "";
  const thisMonth = () => { const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" })); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  const monthName = (m) => new Date(m + "-15T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  let libs = null;
  const load = (src) => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const ensurePdf = () => libs || (libs = load("/loyalty/vendor/jspdf.umd.min.js").then(() => load("/loyalty/vendor/jspdf.plugin.autotable.min.js")));
  const save = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
  const COLS = [["at", "Date/time (HK)"], ["type", "Type"], ["item", "Item"], ["pos_item", "Ring on POS"], ["code", "Code"], ["guest", "Guest"], ["shop", "Shop"], ["redeemed_by", "Handed over by"], ["logged", "Logged on POS"], ["logged_by", "Logged by"], ["logged_at", "Logged at"], ["reversed", "Reversed (not counted)"], ["reversed_by", "Reversed by"], ["reversed_at", "Reversed at"], ["reverse_reason", "Reason"], ["pos_action", "POS action"]];
  const live = (rows) => rows.filter(r => !r.reversed), rev = (rows) => rows.filter(r => r.reversed);
  const cell = (r, k) => k === "reversed" ? (r.reversed ? "REVERSED" : "") : k === "at" || k === "logged_at" || k === "reversed_at" ? hk(r[k]) : k === "logged" ? (r.logged === true ? "Yes" : r.logged === false ? "NO" : "n/a") : (r[k] == null ? "" : String(r[k]));
  function totals(rows) { const t = {}; live(rows).forEach(r => { const k = r.type + " | " + r.item; t[k] = (t[k] || 0) + 1; }); return Object.entries(t).sort((a, b) => b[1] - a[1]); }
  function csv(d) {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [COLS.map(c => q(c[1])).concat([q("Test row")]).join(",")].concat(d.rows.map(r => COLS.map(c => q(cell(r, c[0]))).concat([q(r.is_test ? "test" : "")]).join(",")));
    return new Blob(["\ufeff" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
  }
  function pdf(d) {
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: "mm", format: "a4" }); const W = 210;
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("RORUBARU · Roru Family", 14, 16);
    doc.setFontSize(12); doc.text("Month-end loyalty events for POS matching: " + monthName(d.month), 14, 23);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(90);
    doc.text("Generated " + hk(d.generated_at) + " (HK) by " + d.by + " (" + d.role + ").  " + live(d.rows).length + " events" + (rev(d.rows).length ? " + " + rev(d.rows).length + " reversed (not counted)" : "") + ".  PREVIEW data: rows marked (test) are test members.", 14, 28.5);
    doc.setTextColor(0);
    const not = live(d.rows).filter(r => r.logged === false);
    let y = 35; doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(not.length ? 190 : 30, not.length ? 40 : 120, 40);
    doc.text(not.length ? "Not logged on POS yet: " + not.length : "Everything handed over was logged on POS", 14, y); doc.setTextColor(0);
    if (not.length) doc.autoTable({ startY: y + 2, head: [["Date/time", "Item", "Code", "Guest", "Handed over by"]], body: not.map(r => [hk(r.at), r.item, r.code, r.guest + (r.is_test ? " (test)" : ""), r.redeemed_by || ""]),
      styles: { fontSize: 8, cellPadding: 1.5 }, headStyles: { fillColor: [190, 40, 40] }, margin: { left: 14, right: 14 } });
    y = (doc.lastAutoTable && not.length ? doc.lastAutoTable.finalY : y) + 8;
    const rv = rev(d.rows);
    if (rv.length) { doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(120, 60, 160); doc.text("Reversed (not counted): " + rv.length, 14, y); doc.setTextColor(0);
      doc.autoTable({ startY: y + 2, head: [["Handed over", "Item", "Code", "Guest", "Reversed by / at", "Reason", "POS"]], body: rv.map(r => [hk(r.at), r.item, r.code, r.guest + (r.is_test ? " (test)" : ""), (r.reversed_by || "") + "\n" + hk(r.reversed_at), r.reverse_reason || "", r.pos_action || ""]),
        styles: { fontSize: 8, cellPadding: 1.5 }, headStyles: { fillColor: [120, 60, 160] }, margin: { left: 14, right: 14 } });
      y = doc.lastAutoTable.finalY + 8; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Totals by item", 14, y);
    doc.autoTable({ startY: y + 2, head: [["Type | item", "Count"]], body: totals(d.rows).map(x => [x[0], String(x[1])]), styles: { fontSize: 8, cellPadding: 1.5 }, headStyles: { fillColor: [40, 40, 40] }, columnStyles: { 1: { halign: "right", cellWidth: 20 } }, margin: { left: 14, right: 14 } });
    y = doc.lastAutoTable.finalY + 8; if (y > 260) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("All events", 14, y);
    doc.autoTable({ startY: y + 2, head: [["Date/time", "Type", "Item", "Code", "Guest", "Handed over by", "Logged", "Logged by"]],
      body: d.rows.map(r => [hk(r.at), r.type + (r.reversed ? "\nREVERSED" : ""), r.item + (r.pos_item && r.pos_item !== r.item ? "\nPOS: " + r.pos_item : ""), r.code, r.guest + (r.is_test ? " (test)" : ""), r.redeemed_by || "", (r.reversed ? (r.logged ? "Void on POS" : "n/a") : cell(r, "logged") + (r.logged_at ? "\n" + hk(r.logged_at) : "")), r.logged_by || ""]),
      styles: { fontSize: 7.5, cellPadding: 1.4, valign: "top" }, headStyles: { fillColor: [246, 69, 1] }, margin: { left: 10, right: 10 }, columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 21 }, 3: { cellWidth: 19 }, 4: { cellWidth: 17 }, 5: { cellWidth: 22 }, 6: { cellWidth: 19 }, 7: { cellWidth: 20 } },
      didParseCell: (h) => { if (h.section === "body" && h.column.index === 6 && /^NO/.test(h.cell.raw)) { h.cell.styles.textColor = [190, 40, 40]; h.cell.styles.fontStyle = "bold"; } } });
    const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120); doc.text("Page " + i + " of " + n + "  ·  Roru Family month-end  ·  " + monthName(d.month), W / 2, 290, { align: "center" }); }
    return doc.output("blob");
  }
  window.RORU_MONTHEND = {
    mount(el, token) {
      el.innerHTML = '<h2 style="margin-top:0">📅 Month-end</h2><p class="muted small">Every reward handed over, upgrade, birthday roll, visit reward and gold receipt in the month, to match against the POS. Items not logged on POS are listed first.</p>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input type="month" id="meMonth" value="' + thisMonth() + '" style="font-size:16px;padding:8px;border-radius:10px;color:#111;background:#fff;border:0"><button class="btn sm" id="mePdf">⬇︎ PDF</button><button class="btn sm ghost" id="meCsv">⬇︎ CSV</button></div><div id="meInfo" class="small muted" style="margin-top:10px"></div>';
      const info = el.querySelector("#meInfo");
      const get = async (fmt) => R.rpc("staff_month_end", { p_token: token(), p_month: el.querySelector("#meMonth").value, p_format: fmt });
      const show = (d) => { const not = live(d.rows).filter(r => r.logged === false).length, nr = rev(d.rows).length; info.innerHTML = "<b>" + esc(monthName(d.month)) + ":</b> " + live(d.rows).length + " events · " + (nr ? nr + " reversed (not counted) · " : "") + (not ? '<b style="color:var(--orange)">' + not + " not logged on POS</b>" : "all logged ✓") +
          (d.exports && d.exports.length ? '<div class="tiny" style="margin-top:6px">Recent downloads: ' + d.exports.slice(0, 3).map(x => esc(x.by) + " " + x.format.toUpperCase() + " " + esc(x.month) + " (" + hk(x.at) + ")").join(" · ") + "</div>" : ""); };
      const run = async (fmt, b) => { b.disabled = true; try { const d = await get(fmt); if (fmt === "pdf") { await ensurePdf(); save(pdf(d), "roru-family-month-end-" + d.month + ".pdf"); } else save(csv(d), "roru-family-month-end-" + d.month + ".csv"); show(d); R.toast && R.toast("Downloaded ✓"); } catch (e) { info.textContent = R.errText ? R.errText(e) : String(e.message || e); } b.disabled = false; };
      el.querySelector("#mePdf").onclick = (e) => run("pdf", e.currentTarget); el.querySelector("#meCsv").onclick = (e) => run("csv", e.currentTarget);
      el.querySelector("#meMonth").onchange = async () => { try { show(await get("view")); } catch (e) {} };
      get("view").then(show).catch(() => {});
    }
  };
})();
