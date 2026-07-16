// Client-only monthly trust reconciliation PDF for Kuwait Bar compliance.
// Same html2canvas-pro + jsPDF pipeline as calendar-export for correct Arabic
// shaping and RTL layout.

export interface TrustLine {
  entry_date: string;
  entry_type: "deposit" | "drawdown" | "refund" | "adjustment";
  client_name: string;
  case_number: string | null;
  reference_number: string | null;
  description: string;
  amount: number;
}

export interface TrustReconciliationOptions {
  firmNameEn: string;
  firmNameAr: string;
  lang: "en" | "ar";
  monthName: string;   // e.g. "November"
  year: number;
  currency: string;    // usually "KWD"
  openingBalance: number;
  entries: TrustLine[]; // filtered to the month, chronological
}

const COLORS = {
  navy: "#16233d",
  gold: "#b5893a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#e4e4e7",
  paper: "#ffffff",
  credit: "#166534",
  debit: "#b91c1c",
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

function fmt(n: number, currency: string) {
  return `${n.toFixed(3)} ${currency}`;
}

export async function exportTrustReconciliationPdf(
  opts: TrustReconciliationOptions,
): Promise<void> {
  const isAr = opts.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr
    ? "'IBM Plex Sans Arabic', system-ui, sans-serif"
    : "'Plus Jakarta Sans', system-ui, sans-serif";
  const firmName = isAr ? opts.firmNameAr : opts.firmNameEn;
  const tt = (en: string, ar: string) => (isAr ? ar : en);

  let deposits = 0;
  let drawdowns = 0;
  let refunds = 0;
  let adjustments = 0;
  for (const e of opts.entries) {
    if (e.entry_type === "deposit") deposits += e.amount;
    else if (e.entry_type === "drawdown") drawdowns += e.amount;
    else if (e.entry_type === "refund") refunds += e.amount;
    else adjustments += e.amount;
  }
  const closing = opts.openingBalance + deposits + adjustments - drawdowns - refunds;

  const rowsHtml = opts.entries
    .map((e) => {
      const isCredit = e.entry_type === "deposit" || e.entry_type === "adjustment";
      const sign = isCredit ? "+" : "-";
      const color = isCredit ? COLORS.credit : COLORS.debit;
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};font-size:11px;color:${COLORS.muted};white-space:nowrap;">${esc(e.entry_date)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};font-size:11px;"><span style="display:inline-block;padding:1px 8px;border-radius:9999px;background:#f1f5f9;color:${COLORS.ink};font-weight:500;">${esc(e.entry_type)}</span></td>
          <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.ink};">${esc(e.client_name)}${e.case_number ? ` · <span style="color:${COLORS.muted};">${esc(e.case_number)}</span>` : ""}</td>
          <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};font-size:11px;color:${COLORS.muted};">${esc(e.reference_number ?? "")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};font-size:11px;color:${COLORS.ink};max-width:180px;">${esc(e.description)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};font-size:12px;font-weight:600;text-align:${isAr ? "left" : "right"};white-space:nowrap;color:${color};">${sign}${fmt(e.amount, opts.currency)}</td>
        </tr>
      `;
    })
    .join("");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "1100px"; // A4 landscape @ ~96dpi
  container.style.background = COLORS.paper;
  container.setAttribute("dir", dir);
  container.style.fontFamily = font;
  container.style.color = COLORS.ink;

  container.innerHTML = `
    <div style="padding:40px 44px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid ${COLORS.navy};padding-bottom:16px;margin-bottom:24px;">
        <div>
          <div style="font-size:20px;font-weight:700;color:${COLORS.navy};">${esc(firmName)}</div>
          <div style="font-size:14px;color:${COLORS.ink};margin-top:6px;font-weight:600;">${esc(tt("Client Trust Account · Monthly Reconciliation", "حساب أمانة الموكّلين · التسوية الشهرية"))}</div>
        </div>
        <div style="text-align:${isAr ? "left" : "right"};">
          <div style="font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(tt("Period", "الفترة"))}</div>
          <div style="font-size:16px;font-weight:600;color:${COLORS.navy};margin-top:2px;">${esc(opts.monthName)} ${opts.year}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;">
        ${[
          [tt("Opening balance", "الرصيد الافتتاحي"), fmt(opts.openingBalance, opts.currency), COLORS.navy],
          [tt("Deposits", "الإيداعات"), "+" + fmt(deposits, opts.currency), COLORS.credit],
          [tt("Drawdowns", "المسحوبات"), "-" + fmt(drawdowns, opts.currency), COLORS.debit],
          [tt("Refunds", "المستردات"), "-" + fmt(refunds, opts.currency), COLORS.debit],
          [tt("Closing balance", "الرصيد الختامي"), fmt(closing, opts.currency), COLORS.gold],
        ]
          .map(
            ([label, value, color]) => `
          <div style="border:1px solid ${COLORS.border};border-radius:8px;padding:12px 14px;">
            <div style="font-size:10px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(label as string)}</div>
            <div style="font-size:14px;font-weight:700;color:${color};margin-top:4px;">${esc(value as string)}</div>
          </div>
        `,
          )
          .join("")}
      </div>

      <table style="width:100%;border-collapse:collapse;border:1px solid ${COLORS.border};border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 10px;text-align:${isAr ? "right" : "left"};font-size:10px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(tt("Date", "التاريخ"))}</th>
            <th style="padding:8px 10px;text-align:${isAr ? "right" : "left"};font-size:10px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(tt("Type", "النوع"))}</th>
            <th style="padding:8px 10px;text-align:${isAr ? "right" : "left"};font-size:10px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(tt("Client / Case", "الموكّل / القضية"))}</th>
            <th style="padding:8px 10px;text-align:${isAr ? "right" : "left"};font-size:10px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(tt("Ref #", "المرجع"))}</th>
            <th style="padding:8px 10px;text-align:${isAr ? "right" : "left"};font-size:10px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(tt("Description", "الوصف"))}</th>
            <th style="padding:8px 10px;text-align:${isAr ? "left" : "right"};font-size:10px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(tt("Amount", "المبلغ"))}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="6" style="padding:24px;text-align:center;font-size:12px;color:${COLORS.muted};">${esc(tt("No activity in this period.", "لا يوجد نشاط خلال هذه الفترة."))}</td></tr>`}
        </tbody>
      </table>

      <div style="margin-top:32px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="font-size:10px;color:${COLORS.muted};">${esc(tt("Generated by Qadiya OS on ", "أُصدرت بواسطة قضية OS في "))}${new Date().toISOString().slice(0, 10)}</div>
        <div style="text-align:${isAr ? "left" : "right"};">
          <div style="font-size:11px;color:${COLORS.muted};margin-bottom:24px;">${esc(tt("Authorized signature", "توقيع المخوّل"))}</div>
          <div style="width:220px;border-top:1px solid ${COLORS.ink};"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  try {
    if (document.fonts && "ready" in document.fonts) {
      try { await document.fonts.ready; } catch { /* ignore */ }
    }
    const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: COLORS.paper,
      useCORS: true,
      logging: false,
    });
    const pdf = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/png");
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    const safeMonth = opts.monthName.replace(/\s+/g, "-");
    pdf.save(`trust-reconciliation-${safeMonth}-${opts.year}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
