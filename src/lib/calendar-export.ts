// Client-only PDF export for the Court Calendar "Monthly Overview".
// Renders a self-contained, theme-independent printable node (inline hex
// colors so it works in both light/dark themes) and rasterizes it with
// html2canvas-pro — which correctly captures the browser's own Arabic
// shaping and RTL layout — then paginates it into an A4 PDF via jsPDF.

export interface MonthlyExportEvent {
  date: string; // YYYY-MM-DD
  type: "hearing" | "deadline";
  title: string;
  sub: string | null;
  case_number: string | null;
}

export interface MonthlyExportOptions {
  monthName: string;
  year: number;
  lang: "en" | "ar";
  hearings: number;
  deadlines: number;
  events: MonthlyExportEvent[];
}

const COLORS = {
  navy: "#16233d",
  gold: "#b5893a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#e4e4e7",
  deadline: "#b91c1c",
  paper: "#ffffff",
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export async function exportMonthlyOverviewPdf(opts: MonthlyExportOptions): Promise<void> {
  const { monthName, year, lang, hearings, deadlines, events } = opts;
  const isAr = lang === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const fontStack = isAr
    ? `'IBM Plex Sans Arabic','Noto Naskh Arabic',sans-serif`
    : `'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif`;

  const rows = events
    .map((e) => {
      const day = Number(e.date.slice(8, 10));
      const wd = (isAr ? WEEK_AR : WEEK_EN)[new Date(e.date).getDay()];
      const isHearing = e.type === "hearing";
      const badgeColor = isHearing ? COLORS.navy : COLORS.deadline;
      const badgeText = isHearing ? t("Hearing", "جلسة") : t("Deadline", "ميعاد نهائي");
      const title = esc(e.title || "");
      const sub = e.sub ? `<div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">${esc(e.sub)}</div>` : "";
      const caseNo = e.case_number
        ? `<span style="font-size:11px;color:${COLORS.muted};">#${esc(e.case_number)}</span>`
        : "";
      return `
        <tr>
          <td style="width:56px;vertical-align:top;padding:10px 8px;border-bottom:1px solid ${COLORS.border};text-align:center;">
            <div style="font-size:20px;font-weight:700;color:${COLORS.ink};line-height:1;">${day}</div>
            <div style="font-size:10px;text-transform:uppercase;color:${COLORS.muted};margin-top:3px;">${esc(wd)}</div>
          </td>
          <td style="vertical-align:top;padding:10px 12px;border-bottom:1px solid ${COLORS.border};border-inline-start:4px solid ${badgeColor};">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              <span style="display:inline-block;font-size:11px;font-weight:600;color:#fff;background:${badgeColor};border-radius:999px;padding:2px 10px;">${badgeText}</span>
              ${caseNo}
            </div>
            <div style="font-size:15px;font-weight:600;color:${COLORS.ink};">${title}</div>
            ${sub}
          </td>
        </tr>`;
    })
    .join("");

  const emptyState = `
    <div style="text-align:center;padding:48px 0;color:${COLORS.muted};font-size:14px;">
      ${t("Nothing scheduled this month.", "لا يوجد مواعيد هذا الشهر.")}
    </div>`;

  const generatedLabel = t(
    `Generated ${new Date().toLocaleDateString("en-GB")}`,
    `تم الإنشاء ${new Date().toLocaleDateString("en-GB")}`,
  );

  const container = document.createElement("div");
  container.setAttribute("dir", isAr ? "rtl" : "ltr");
  container.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    "width:794px",
    "background:" + COLORS.paper,
    "padding:40px",
    "box-sizing:border-box",
    "font-family:" + fontStack,
    "color:" + COLORS.ink,
  ].join(";");

  container.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:2px solid ${COLORS.navy};padding-bottom:16px;margin-bottom:8px;">
      <div>
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.gold};font-weight:600;">
          ${t("Qadiya OS — Court Calendar", "قضية OS — التقويم القضائي")}
        </div>
        <div style="font-size:26px;font-weight:700;color:${COLORS.navy};margin-top:4px;">
          ${esc(monthName)} ${year}
        </div>
        <div style="font-size:13px;color:${COLORS.muted};margin-top:4px;">
          ${t(`${hearings} hearings · ${deadlines} deadlines`, `${hearings} جلسة · ${deadlines} ميعاد نهائي`)}
        </div>
      </div>
      <div style="text-align:${isAr ? "left" : "right"};font-size:11px;color:${COLORS.muted};">
        ${esc(generatedLabel)}
      </div>
    </div>
    ${
      events.length === 0
        ? emptyState
        : `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${rows}</table>`
    }
  `;

  document.body.appendChild(container);

  try {
    if (document.fonts && "ready" in document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore font readiness errors */
      }
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

    const safeMonth = monthName.replace(/\s+/g, "-");
    pdf.save(`qadiya-calendar-${safeMonth}-${year}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
