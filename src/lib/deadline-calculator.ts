/**
 * Kuwaiti Legal Deadline Calculator
 * Calculates appeal deadlines, execution windows, and other legal time limits
 * according to Kuwait Civil & Commercial Procedure Law.
 *
 * Key rules:
 * - Appeal period: 30 days from judgment notification date
 * - Cassation period: 30 days from appeal judgment
 * - Execution period: varies by case type
 * - Fridays and Saturdays are weekends (not counted in some calculations)
 * - Official Kuwaiti public holidays are excluded
 */

/** Kuwaiti public holidays (recurring annually) */
const RECURRING_HOLIDAYS = [
  { month: 1, day: 1, nameAr: "رأس السنة الميلادية", nameEn: "New Year's Day" },
  { month: 2, day: 25, nameAr: "العيد الوطني", nameEn: "National Day" },
  { month: 2, day: 26, nameAr: "يوم التحرير", nameEn: "Liberation Day" },
];

/** Islamic holidays (approximate dates for 2025-2027, need annual update) */
const ISLAMIC_HOLIDAYS_2025 = [
  { date: "2025-03-30", nameAr: "ليلة المعراج", nameEn: "Isra & Mi'raj" },
  { date: "2025-03-31", nameAr: "بداية رمضان", nameEn: "Start of Ramadan" },
  { date: "2025-04-29", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2025-04-30", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2025-05-01", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2025-06-06", nameAr: "يوم عرفة", nameEn: "Day of Arafat" },
  { date: "2025-06-07", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2025-06-08", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2025-06-09", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2025-06-27", nameAr: "رأس السنة الهجرية", nameEn: "Islamic New Year" },
  { date: "2025-09-05", nameAr: "المولد النبوي", nameEn: "Prophet's Birthday" },
];

const ISLAMIC_HOLIDAYS_2026 = [
  { date: "2026-03-20", nameAr: "ليلة المعراج", nameEn: "Isra & Mi'raj" },
  { date: "2026-03-21", nameAr: "بداية رمضان", nameEn: "Start of Ramadan" },
  { date: "2026-04-19", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2026-04-20", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2026-04-21", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2026-05-26", nameAr: "يوم عرفة", nameEn: "Day of Arafat" },
  { date: "2026-05-27", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2026-05-28", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2026-05-29", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2026-06-17", nameAr: "رأس السنة الهجرية", nameEn: "Islamic New Year" },
  { date: "2026-08-25", nameAr: "المولد النبوي", nameEn: "Prophet's Birthday" },
];

const ISLAMIC_HOLIDAYS_2027 = [
  { date: "2027-03-09", nameAr: "ليلة المعراج", nameEn: "Isra & Mi'raj" },
  { date: "2027-03-10", nameAr: "بداية رمضان", nameEn: "Start of Ramadan" },
  { date: "2027-04-08", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2027-04-09", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2027-04-10", nameAr: "عيد الفطر", nameEn: "Eid Al-Fitr" },
  { date: "2027-05-16", nameAr: "يوم عرفة", nameEn: "Day of Arafat" },
  { date: "2027-05-17", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2027-05-18", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2027-05-19", nameAr: "عيد الأضحى", nameEn: "Eid Al-Adha" },
  { date: "2027-06-06", nameAr: "رأس السنة الهجرية", nameEn: "Islamic New Year" },
  { date: "2027-08-15", nameAr: "المولد النبوي", nameEn: "Prophet's Birthday" },
];

function getAllHolidaysForYear(year: number): Set<string> {
  const holidays = new Set<string>();

  // Add recurring holidays
  for (const h of RECURRING_HOLIDAYS) {
    const dateStr = `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
    holidays.add(dateStr);
  }

  // Add Islamic holidays based on year
  const islamicHolidays =
    year === 2025
      ? ISLAMIC_HOLIDAYS_2025
      : year === 2026
        ? ISLAMIC_HOLIDAYS_2026
        : year === 2027
          ? ISLAMIC_HOLIDAYS_2027
          : [];

  for (const h of islamicHolidays) {
    holidays.add(h.date);
  }

  return holidays;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 5 || day === 6; // Friday = 5, Saturday = 6
}

function isHoliday(d: Date): boolean {
  const year = d.getFullYear();
  const holidays = getAllHolidaysForYear(year);
  return holidays.has(formatDate(d));
}

function isWorkingDay(d: Date): boolean {
  return !isWeekend(d) && !isHoliday(d);
}

/**
 * Add calendar days to a date (simple addition)
 */
function addCalendarDays(start: Date, days: number): Date {
  const result = new Date(start);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * If the deadline falls on a weekend or holiday, push to next working day
 * (per Kuwait Civil Procedure Law Article 17)
 */
function adjustToWorkingDay(d: Date): Date {
  const result = new Date(d);
  while (!isWorkingDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

export type DeadlineType =
  | "appeal" // استئناف
  | "cassation" // تمييز
  | "opposition" // معارضة
  | "execution" // تنفيذ
  | "grievance"; // تظلم

export interface DeadlineResult {
  type: DeadlineType;
  typeAr: string;
  typeEn: string;
  startDate: Date;
  rawDeadline: Date;
  adjustedDeadline: Date;
  daysRemaining: number;
  isExpired: boolean;
  isUrgent: boolean; // less than 7 days remaining
  calendarDays: number;
  description: string;
  descriptionAr: string;
}

const DEADLINE_CONFIGS: Record<DeadlineType, { days: number; nameAr: string; nameEn: string }> = {
  appeal: { days: 30, nameAr: "استئناف", nameEn: "Appeal" },
  cassation: { days: 30, nameAr: "تمييز", nameEn: "Cassation" },
  opposition: { days: 7, nameAr: "معارضة", nameEn: "Opposition" },
  execution: { days: 30, nameAr: "تنفيذ", nameEn: "Execution" },
  grievance: { days: 60, nameAr: "تظلم", nameEn: "Grievance" },
};

/**
 * Calculate a legal deadline from a given start date
 * @param startDate - The date from which the deadline starts (e.g., judgment notification date)
 * @param type - The type of deadline to calculate
 * @returns DeadlineResult with all relevant information
 */
export function calculateDeadline(startDate: Date, type: DeadlineType): DeadlineResult {
  const config = DEADLINE_CONFIGS[type];
  const rawDeadline = addCalendarDays(startDate, config.days);
  const adjustedDeadline = adjustToWorkingDay(rawDeadline);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const daysRemaining = Math.ceil(
    (adjustedDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  const isExpired = daysRemaining < 0;
  const isUrgent = !isExpired && daysRemaining <= 7;

  return {
    type,
    typeAr: config.nameAr,
    typeEn: config.nameEn,
    startDate,
    rawDeadline,
    adjustedDeadline,
    daysRemaining: Math.max(0, daysRemaining),
    isExpired,
    isUrgent,
    calendarDays: config.days,
    description: isExpired
      ? `${config.nameEn} deadline EXPIRED ${Math.abs(daysRemaining)} days ago`
      : `${config.nameEn} deadline: ${daysRemaining} days remaining (due ${adjustedDeadline.toLocaleDateString("en-GB")})`,
    descriptionAr: isExpired
      ? `انتهت مهلة ${config.nameAr} منذ ${Math.abs(daysRemaining)} يوم`
      : `مهلة ${config.nameAr}: متبقي ${daysRemaining} يوم (${adjustedDeadline.toLocaleDateString("ar-KW")})`,
  };
}

/**
 * Calculate all possible deadlines from a judgment date
 */
export function calculateAllDeadlines(judgmentDate: Date): DeadlineResult[] {
  const types: DeadlineType[] = ["appeal", "cassation", "opposition", "execution", "grievance"];
  return types.map((type) => calculateDeadline(judgmentDate, type));
}

/**
 * Get the most urgent active deadline
 */
export function getMostUrgentDeadline(judgmentDate: Date): DeadlineResult | null {
  const deadlines = calculateAllDeadlines(judgmentDate).filter((d) => !d.isExpired);
  if (deadlines.length === 0) return null;
  return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
}

/**
 * Generate a Google Calendar event URL for a deadline
 */
export function getDeadlineCalendarUrl(deadline: DeadlineResult, caseTitle?: string): string {
  const title = encodeURIComponent(`⚠️ ${deadline.typeAr} - ${caseTitle || "قضية"}`);
  const details = encodeURIComponent(deadline.descriptionAr);
  const startStr = formatDate(deadline.adjustedDeadline).replace(/-/g, "");
  const endDate = addCalendarDays(deadline.adjustedDeadline, 1);
  const endStr = formatDate(endDate).replace(/-/g, "");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startStr}/${endStr}`;
}
