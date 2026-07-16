// Client-only invoice PDF export. Uses the same html2canvas-pro + jsPDF
// pipeline as calendar-export so Arabic shapes correctly and RTL works.

export interface InvoiceExportOptions {
  firmNameEn: string;
  firmNameAr: string;
  lang: "en" | "ar";
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  amount: number;
  currency: string;
  description: string | null;
  description_ar: string | null;
  client_name: string | null;
  client_name_ar: string | null;
  case_number: string | null;
}

const COLORS = {
  navy: "#16233d",
  gold: "#b5893a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#e4e4e7",
  paper: "#ffffff",
  paid: "#166534",
  overdue: "#b91c1c",
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

export async function exportInvoicePdf(opts: InvoiceExportOptions): Promise<void> {
  const isAr = opts.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr
    ? "'IBM Plex Sans Arabic', system-ui, sans-serif"
    : "'Plus Jakarta Sans', system-ui, sans-serif";
  const firmName = isAr ? opts.firmNameAr : opts.firmNameEn;
  const clientName = isAr
    ? opts.client_name_ar ?? opts.client_name ?? ""
    : opts.client_name ?? opts.client_name_ar ?? "";
  const description = isAr
    ? opts.description_ar ?? opts.description ?? ""
    : opts.description ?? opts.description_ar ?? "";

  const tt = (en: string, ar: string) => (isAr ? ar : en);
  const statusColor =
    opts.status === "paid"
      ? COLORS.paid
      : opts.status === "overdue"
        ? COLORS.overdue
        : COLORS.navy;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px"; // A4 width @ 96dpi
  container.style.background = COLORS.paper;
  container.setAttribute("dir", dir);
  container.style.fontFamily = font;
  container.style.color = COLORS.ink;

  container.innerHTML = `
    <div style="padding:56px 48px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${COLORS.navy};padding-bottom:20px;margin-bottom:32px;">
        <div>
          <div style="font-size:22px;font-weight:700;color:${COLORS.navy};">${esc(firmName)}</div>
          <div style="font-size:12px;color:${COLORS.muted};margin-top:4px;">${esc(tt("Tax Invoice", "فاتورة ضريبية"))}</div>
        </div>
        <div style="text-align:${isAr ? "left" : "right"};">
          <div style="font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">${esc(tt("Invoice #", "رقم الفاتورة"))}</div>
          <div style="font-size:20px;font-weight:600;color:${COLORS.navy};margin-top:2px;">${esc(opts.invoice_number)}</div>
          <div style="display:inline-block;margin-top:8px;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:${statusColor};color:#fff;">
            ${esc(opts.status.toUpperCase())}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
        <div>
          <div style="font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${esc(tt("Billed To", "المُرسل إليه"))}</div>
          <div style="font-size:14px;font-weight:600;color:${COLORS.ink};">${esc(clientName || tt("Client", "الموكّل"))}</div>
          ${opts.case_number ? `<div style="font-size:12px;color:${COLORS.muted};margin-top:4px;">${esc(tt("Case", "القضية"))} · ${esc(opts.case_number)}</div>` : ""}
        </div>
        <div style="text-align:${isAr ? "left" : "right"};">
          <div style="display:flex;justify-content:space-between;gap:16px;padding:4px 0;font-size:12px;">
            <span style="color:${COLORS.muted};">${esc(tt("Issue date", "تاريخ الإصدار"))}</span>
            <span style="color:${COLORS.ink};font-weight:500;">${esc(opts.issue_date)}</span>
          </div>
          ${opts.due_date ? `<div style="display:flex;justify-content:space-between;gap:16px;padding:4px 0;font-size:12px;"><span style="color:${COLORS.muted};">${esc(tt("Due date", "تاريخ الاستحقاق"))}</span><span style="color:${COLORS.ink};font-weight:500;">${esc(opts.due_date)}</span></div>` : ""}
          ${opts.paid_date ? `<div style="display:flex;justify-content:space-between;gap:16px;padding:4px 0;font-size:12px;"><span style="color:${COLORS.muted};">${esc(tt("Paid on", "تاريخ السداد"))}</span><span style="color:${COLORS.paid};font-weight:600;">${esc(opts.paid_date)}</span></div>` : ""}
        </div>
      </div>

      <div style="border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;margin-bottom:32px;">
        <div style="background:#f8fafc;padding:12px 16px;font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
          ${esc(tt("Description", "الوصف"))}
        </div>
        <div style="padding:20px 16px;font-size:13px;line-height:1.6;color:${COLORS.ink};min-height:120px;white-space:pre-wrap;">
          ${esc(description || tt("Professional legal services", "خدمات قانونية مهنية"))}
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;">
        <div style="min-width:280px;">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid ${COLORS.border};font-size:13px;">
            <span style="color:${COLORS.muted};">${esc(tt("Subtotal", "المجموع الفرعي"))}</span>
            <span style="color:${COLORS.ink};font-weight:500;">${opts.amount.toFixed(3)} ${esc(opts.currency)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid ${COLORS.navy};font-size:16px;font-weight:700;">
            <span style="color:${COLORS.navy};">${esc(tt("Total", "الإجمالي"))}</span>
            <span style="color:${COLORS.navy};">${opts.amount.toFixed(3)} ${esc(opts.currency)}</span>
          </div>
        </div>
      </div>

      <div style="margin-top:64px;padding-top:20px;border-top:1px solid ${COLORS.border};font-size:10px;color:${COLORS.muted};text-align:center;">
        ${esc(tt("Generated by Qadiya OS", "أُصدرت بواسطة قضية OS"))}
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
    const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
    pdf.save(`invoice-${opts.invoice_number}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
