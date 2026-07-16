// Client-only PDF export for the Report Bot case report.
// Renders a self-contained, theme-independent printable node (inline hex
// colors so it works in both light/dark themes) and rasterizes it with
// html2canvas-pro — which correctly captures the browser's own Arabic
// shaping and RTL layout — then paginates it into an A4 PDF via jsPDF.
import type { CaseReport } from "@/lib/report-types";
import type { Lang } from "@/lib/app-context";
import { COURT_LEVEL_LABELS } from "@/lib/app-context";

const COLORS = {
  navy: "#16233d",
  gold: "#b5893a",
  ink: "#1a1a1a",
  muted: "#6b7280",
  border: "#e4e4e7",
  deadline: "#b91c1c",
  paper: "#ffffff",
  soft: "#f7f6f2",
};

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

function fmtDate(dateStr: string | null, lang: Lang): string {
  if (!dateStr) return lang === "ar" ? "غير محدد" : "—";
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-KW" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export async function exportCaseReportPdf(report: CaseReport, lang: Lang): Promise<void> {
  const isAr = lang === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const fontStack = isAr
    ? `'IBM Plex Sans Arabic','Noto Naskh Arabic',sans-serif`
    : `'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif`;

  const headline = isAr ? report.status_headline_ar : report.status_headline_en;
  const summary = isAr ? report.summary_ar : report.summary_en;
  const recommendation = isAr ? report.recommendation_ar : report.recommendation_en;
  const stageLabel = report.current_stage ? COURT_LEVEL_LABELS[report.current_stage]?.[lang] : null;
  const caseType = isAr ? (report.case_type_ar ?? report.case_type) : report.case_type;

  const section = (title: string, body: string) => `
    <div style="margin-top:18px;">
      <div style="font-size:13px;font-weight:700;color:${COLORS.navy};border-inline-start:3px solid ${COLORS.gold};padding-inline-start:8px;margin-bottom:8px;">${esc(title)}</div>
      ${body}
    </div>`;

  const chips = [
    stageLabel
      ? `<span style="display:inline-block;font-size:11px;font-weight:600;color:#fff;background:${COLORS.navy};border-radius:999px;padding:3px 12px;">${t("Level", "الدرجة")}: ${esc(stageLabel)}</span>`
      : "",
    caseType
      ? `<span style="display:inline-block;font-size:11px;font-weight:600;color:${COLORS.navy};background:${COLORS.soft};border:1px solid ${COLORS.border};border-radius:999px;padding:3px 12px;">${esc(caseType)}</span>`
      : "",
  ].join(" ");

  const deadlineBlock = report.deadline
    ? `<div style="border:1px solid ${COLORS.border};border-inline-start:4px solid ${COLORS.deadline};border-radius:10px;padding:12px 14px;background:${COLORS.soft};">
        <div style="font-size:14px;font-weight:600;color:${COLORS.ink};">${esc(isAr ? report.deadline.label_ar : report.deadline.label_en)}</div>
        <div style="font-size:12px;color:${COLORS.muted};margin-top:3px;">${esc(fmtDate(report.deadline.date, lang))} · ${report.deadline.days_remaining} ${t("days remaining", "يوماً متبقياً")}</div>
      </div>`
    : `<div style="font-size:13px;color:${COLORS.muted};">${t("No active deadlines — this case is closed.", "لا توجد مواعيد نشطة — القضية مغلقة.")}</div>`;

  const timelineRows = (report.timeline || [])
    .map((e) => {
      const ttl = isAr ? (e.title_ar ?? e.title) : e.title;
      const desc = isAr ? (e.description_ar ?? e.description) : e.description;
      const lvl = e.level ? COURT_LEVEL_LABELS[e.level]?.[lang] : null;
      return `
        <tr>
          <td style="width:96px;vertical-align:top;padding:8px 10px;border-bottom:1px solid ${COLORS.border};font-size:11px;color:${COLORS.muted};">${esc(fmtDate(e.event_date, lang))}${lvl ? `<div style="margin-top:2px;color:${COLORS.navy};font-weight:600;">${esc(lvl)}</div>` : ""}</td>
          <td style="vertical-align:top;padding:8px 10px;border-bottom:1px solid ${COLORS.border};">
            <div style="font-size:13px;font-weight:600;color:${COLORS.ink};">${esc(ttl || "")}</div>
            ${desc ? `<div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">${esc(desc)}</div>` : ""}
          </td>
        </tr>`;
    })
    .join("");

  const timelineBlock = timelineRows
    ? `<table style="width:100%;border-collapse:collapse;">${timelineRows}</table>`
    : `<div style="font-size:12px;color:${COLORS.muted};">${t("No timeline events.", "لا توجد أحداث في الجدول الزمني.")}</div>`;

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
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:2px solid ${COLORS.navy};padding-bottom:16px;">
      <div>
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.gold};font-weight:600;">
          ${t("Qadiya OS — Case Report", "قضية OS — تقرير القضية")}
        </div>
        <div style="font-size:22px;font-weight:700;color:${COLORS.navy};margin-top:4px;" dir="ltr">
          #${esc(report.case_number)}
        </div>
      </div>
      <div style="text-align:${isAr ? "left" : "right"};font-size:11px;color:${COLORS.muted};">
        ${esc(generatedLabel)}
      </div>
    </div>

    <div style="margin-top:16px;background:${COLORS.navy};border-radius:12px;padding:18px 20px;color:#fff;">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.gold};font-weight:600;">${t("Status", "الحالة")}</div>
      <div style="font-size:19px;font-weight:700;margin-top:6px;line-height:1.4;">${esc(headline || "")}</div>
      ${chips ? `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">${chips}</div>` : ""}
    </div>

    ${section(t("Case summary", "ملخص القضية"), `<div style="font-size:13px;line-height:1.7;color:${COLORS.ink};">${esc(summary || "")}</div>`)}
    ${section(t("Next deadline", "الموعد القادم"), deadlineBlock)}
    ${section(t("What this means for you", "ماذا يعني هذا لك"), `<div style="font-size:13px;line-height:1.7;color:${COLORS.ink};background:${COLORS.soft};border:1px solid ${COLORS.border};border-radius:10px;padding:12px 14px;">${esc(recommendation || "")}</div>`)}
    ${section(t("Case timeline", "الجدول الزمني للقضية"), timelineBlock)}

    <div style="margin-top:22px;border-top:1px solid ${COLORS.border};padding-top:12px;font-size:10px;color:${COLORS.muted};line-height:1.6;">
      ${t("This report is procedural guidance generated from case records — it is not legal advice or a verdict.", "هذا التقرير إرشاد إجرائي مُستخرج من سجلات القضية — وليس استشارة قانونية أو حكماً.")} · ${t("Powered by Qadiya OS AI", "مدعوم بذكاء قضية OS")}
    </div>
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

    pdf.save(`qadiya-report-${report.case_number.replace(/\s+/g, "-")}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
