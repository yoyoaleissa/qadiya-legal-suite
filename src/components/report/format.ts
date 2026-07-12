import type { Lang } from "@/lib/app-context";

export function formatDate(dateStr: string | null, lang: Lang): string {
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

export function formatKwd(amount: number | null, lang: Lang): string {
  if (amount === null || amount === undefined) return "—";
  const n = new Intl.NumberFormat(lang === "ar" ? "ar-KW" : "en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
  return lang === "ar" ? `${n} د.ك` : `${n} KWD`;
}
