/**
 * Kuwaiti Statute of Limitations Calculator
 * Based on Kuwait Civil Code, Commercial Code, and Labour Law
 */

export type CaseCategory =
  | "labor_wrongful_dismissal"
  | "labor_wages"
  | "labor_end_of_service"
  | "commercial_general"
  | "commercial_cheque"
  | "civil_general"
  | "civil_tort"
  | "civil_contract"
  | "civil_rent"
  | "personal_status"
  | "criminal_misdemeanor"
  | "criminal_felony";

export interface LimitationInfo {
  category: CaseCategory;
  titleAr: string;
  titleEn: string;
  periodYears: number;
  periodMonths?: number;
  legalBasisAr: string;
  legalBasisEn: string;
  notes?: string;
}

export const LIMITATION_PERIODS: LimitationInfo[] = [
  {
    category: "labor_wrongful_dismissal",
    titleAr: "فصل تعسفي",
    titleEn: "Wrongful Dismissal",
    periodYears: 1,
    legalBasisAr: "المادة 144 من قانون العمل رقم 6 لسنة 2010",
    legalBasisEn: "Article 144, Labour Law No. 6/2010",
    notes: "من تاريخ انتهاء العلاقة العمالية",
  },
  {
    category: "labor_wages",
    titleAr: "مطالبة أجور",
    titleEn: "Wage Claims",
    periodYears: 1,
    legalBasisAr: "المادة 144 من قانون العمل رقم 6 لسنة 2010",
    legalBasisEn: "Article 144, Labour Law No. 6/2010",
  },
  {
    category: "labor_end_of_service",
    titleAr: "مكافأة نهاية الخدمة",
    titleEn: "End of Service Benefits",
    periodYears: 1,
    legalBasisAr: "المادة 144 من قانون العمل رقم 6 لسنة 2010",
    legalBasisEn: "Article 144, Labour Law No. 6/2010",
  },
  {
    category: "commercial_general",
    titleAr: "دعوى تجارية عامة",
    titleEn: "General Commercial Claim",
    periodYears: 10,
    legalBasisAr: "المادة 219 من القانون المدني",
    legalBasisEn: "Article 219, Civil Code",
  },
  {
    category: "commercial_cheque",
    titleAr: "شيك بدون رصيد",
    titleEn: "Bounced Cheque",
    periodYears: 3,
    legalBasisAr: "المادة 604 من قانون التجارة",
    legalBasisEn: "Article 604, Commercial Code",
    notes: "من تاريخ تقديم الشيك للبنك",
  },
  {
    category: "civil_general",
    titleAr: "دعوى مدنية عامة",
    titleEn: "General Civil Claim",
    periodYears: 15,
    legalBasisAr: "المادة 438 من القانون المدني",
    legalBasisEn: "Article 438, Civil Code",
  },
  {
    category: "civil_tort",
    titleAr: "تعويض عن ضرر (مسؤولية تقصيرية)",
    titleEn: "Tort / Damages",
    periodYears: 3,
    legalBasisAr: "المادة 253 من القانون المدني",
    legalBasisEn: "Article 253, Civil Code",
    notes: "من تاريخ العلم بالضرر والمسؤول عنه",
  },
  {
    category: "civil_contract",
    titleAr: "مسؤولية عقدية",
    titleEn: "Contractual Liability",
    periodYears: 15,
    legalBasisAr: "المادة 438 من القانون المدني",
    legalBasisEn: "Article 438, Civil Code",
  },
  {
    category: "civil_rent",
    titleAr: "إيجارات",
    titleEn: "Rent Claims",
    periodYears: 5,
    legalBasisAr: "المادة 440 من القانون المدني",
    legalBasisEn: "Article 440, Civil Code",
  },
  {
    category: "personal_status",
    titleAr: "أحوال شخصية",
    titleEn: "Personal Status",
    periodYears: 0,
    legalBasisAr: "لا تسقط بالتقادم",
    legalBasisEn: "No limitation period",
  },
  {
    category: "criminal_misdemeanor",
    titleAr: "جنحة",
    titleEn: "Misdemeanor",
    periodYears: 5,
    legalBasisAr: "المادة 4 من قانون الإجراءات الجزائية",
    legalBasisEn: "Article 4, Criminal Procedure Code",
  },
  {
    category: "criminal_felony",
    titleAr: "جناية",
    titleEn: "Felony",
    periodYears: 10,
    legalBasisAr: "المادة 4 من قانون الإجراءات الجزائية",
    legalBasisEn: "Article 4, Criminal Procedure Code",
  },
];

export function calculateLimitationDeadline(
  category: CaseCategory,
  startDate: Date
): { deadline: Date; daysRemaining: number; isExpired: boolean; info: LimitationInfo } {
  const info = LIMITATION_PERIODS.find((p) => p.category === category);
  if (!info) throw new Error(`Unknown category: ${category}`);

  if (info.periodYears === 0) {
    return {
      deadline: new Date(9999, 11, 31),
      daysRemaining: Infinity,
      isExpired: false,
      info,
    };
  }

  const deadline = new Date(startDate);
  deadline.setFullYear(deadline.getFullYear() + info.periodYears);
  if (info.periodMonths) {
    deadline.setMonth(deadline.getMonth() + info.periodMonths);
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    deadline,
    daysRemaining,
    isExpired: daysRemaining <= 0,
    info,
  };
}
