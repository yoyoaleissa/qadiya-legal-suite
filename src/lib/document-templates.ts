import type { Lang } from "@/lib/app-context";

/**
 * Dynamic fields shared by every document template. These are auto-filled
 * from case / client data and injected into BOTH the English and Arabic
 * versions of each template body.
 */
export interface DocFields {
  date: string; // ISO yyyy-mm-dd
  clientName: string;
  civilId: string;
  firmName: string;
  caseNumber: string;
}

export type DocBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "clause"; index: number; text: string }
  | { kind: "signatures"; firm: string; client: string };

export interface RenderedDocument {
  title: string;
  blocks: DocBlock[];
}

export interface DocTemplate {
  id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  render: (fields: DocFields, lang: Lang) => RenderedDocument;
}

/** Long-form date for the document body, localized per language. */
function longDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-KW" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Numeric identifiers (Civil ID, case numbers) render as Latin digits inside
 * an isolated LTR run so they read correctly even within RTL Arabic text.
 */
function num(value: string): string {
  return `\u2066${value}\u2069`; // LRI ... PDI isolate
}

// ── General Power of Attorney ───────────────────────────────────────────────
const powerOfAttorney: DocTemplate = {
  id: "power_of_attorney",
  name: { en: "General Power of Attorney", ar: "توكيل عام" },
  description: {
    en: "Authorizes the firm to represent the client before all courts and authorities.",
    ar: "يفوّض المكتب بتمثيل الموكّل أمام كافة المحاكم والجهات.",
  },
  render: (f, lang) => {
    const date = longDate(f.date, lang);
    if (lang === "ar") {
      return {
        title: "توكيل عام",
        blocks: [
          { kind: "paragraph", text: `حُرّر هذا التوكيل العام في يوم ${date}، بدولة الكويت.` },
          {
            kind: "paragraph",
            text: `أقرّ أنا الموقّع أدناه، ${f.clientName}، حامل الرقم المدني رقم ${num(
              f.civilId,
            )}، بأنني قد وكّلت وأنبتُ عني السادة/ ${f.firmName} للمحاماة والاستشارات القانونية، توكيلاً عاماً شاملاً.`,
          },
          {
            kind: "paragraph",
            text: "وذلك في مباشرة كافة أعمالي وقضاياي والدفاع عن مصالحي أمام جميع المحاكم على اختلاف درجاتها وأنواعها والنيابة العامة وإدارات التنفيذ والجهات الرسمية.",
          },
          {
            kind: "clause",
            index: 1,
            text: "الحضور والمرافعة والمدافعة ورفع الدعاوى وتقديم الطلبات والمذكرات وسماع الأحكام والطعن عليها بكافة طرق الطعن.",
          },
          {
            kind: "clause",
            index: 2,
            text: "الصلح والإقرار والتنازل وقبض المبالغ المحكوم بها والتوقيع على ما يلزم من مستندات لدى كافة الجهات.",
          },
          {
            kind: "paragraph",
            text: `ويشمل هذا التوكيل على وجه الخصوص القضية رقم ${num(
              f.caseNumber,
            )} وكل ما يتفرّع عنها من إجراءات.`,
          },
          {
            kind: "signatures",
            firm: `عن المكتب: ${f.firmName}`,
            client: `الموكّل: ${f.clientName}`,
          },
        ],
      };
    }
    return {
      title: "General Power of Attorney",
      blocks: [
        { kind: "paragraph", text: `This instrument is made and entered into on ${date}, in the State of Kuwait.` },
        {
          kind: "paragraph",
          text: `I, the undersigned, ${f.clientName}, holder of Civil ID No. ${num(
            f.civilId,
          )}, do hereby appoint and authorize ${f.firmName} for Legal Practice & Consultation to act as my lawful attorney under a full and general power of attorney.`,
        },
        {
          kind: "paragraph",
          text: "To conduct all of my affairs and cases and to defend my interests before all courts of every degree and type, the Public Prosecution, execution departments, and all official authorities.",
        },
        {
          kind: "clause",
          index: 1,
          text: "To appear, plead, defend, file actions, submit petitions and memoranda, hear judgments and challenge them by all means of appeal.",
        },
        {
          kind: "clause",
          index: 2,
          text: "To settle, acknowledge, waive, collect adjudicated amounts, and sign all necessary documents before all authorities.",
        },
        {
          kind: "paragraph",
          text: `This power of attorney specifically includes Case No. ${num(
            f.caseNumber,
          )} and all proceedings arising therefrom.`,
        },
        {
          kind: "signatures",
          firm: `For the firm: ${f.firmName}`,
          client: `The Principal: ${f.clientName}`,
        },
      ],
    };
  },
};

// ── Legal Retainer Agreement ────────────────────────────────────────────────
const retainerAgreement: DocTemplate = {
  id: "retainer_agreement",
  name: { en: "Legal Retainer Agreement", ar: "عقد أتعاب محاماة" },
  description: {
    en: "Engagement contract setting the scope of representation and fees.",
    ar: "عقد ارتباط يحدّد نطاق التمثيل والأتعاب.",
  },
  render: (f, lang) => {
    const date = longDate(f.date, lang);
    if (lang === "ar") {
      return {
        title: "عقد أتعاب محاماة",
        blocks: [
          { kind: "paragraph", text: `أُبرم هذا العقد في يوم ${date} بين كلٍّ من:` },
          {
            kind: "paragraph",
            text: `الطرف الأول (المكتب): ${f.firmName} للمحاماة والاستشارات القانونية.`,
          },
          {
            kind: "paragraph",
            text: `الطرف الثاني (الموكّل): ${f.clientName}، حامل الرقم المدني رقم ${num(f.civilId)}.`,
          },
          {
            kind: "clause",
            index: 1,
            text: `يتعهّد المكتب بتمثيل الموكّل ومباشرة الإجراءات القانونية في القضية رقم ${num(
              f.caseNumber,
            )} أمام الجهات المختصة.`,
          },
          {
            kind: "clause",
            index: 2,
            text: "يلتزم الموكّل بتزويد المكتب بكافة المستندات والمعلومات اللازمة وبسداد الأتعاب المتفق عليها في مواعيدها.",
          },
          {
            kind: "clause",
            index: 3,
            text: "تخضع هذه الاتفاقية لأحكام القانون الكويتي، وتختص محاكم الكويت بنظر أي نزاع ينشأ عنها.",
          },
          {
            kind: "signatures",
            firm: `الطرف الأول: ${f.firmName}`,
            client: `الطرف الثاني: ${f.clientName}`,
          },
        ],
      };
    }
    return {
      title: "Legal Retainer Agreement",
      blocks: [
        { kind: "paragraph", text: `This agreement is made on ${date} between:` },
        { kind: "paragraph", text: `The First Party (the Firm): ${f.firmName} for Legal Practice & Consultation.` },
        {
          kind: "paragraph",
          text: `The Second Party (the Client): ${f.clientName}, holder of Civil ID No. ${num(f.civilId)}.`,
        },
        {
          kind: "clause",
          index: 1,
          text: `The Firm undertakes to represent the Client and conduct the legal proceedings in Case No. ${num(
            f.caseNumber,
          )} before the competent authorities.`,
        },
        {
          kind: "clause",
          index: 2,
          text: "The Client shall provide the Firm with all necessary documents and information and pay the agreed fees when due.",
        },
        {
          kind: "clause",
          index: 3,
          text: "This agreement is governed by the laws of the State of Kuwait, and the Kuwaiti courts have jurisdiction over any dispute arising from it.",
        },
        {
          kind: "signatures",
          firm: `First Party: ${f.firmName}`,
          client: `Second Party: ${f.clientName}`,
        },
      ],
    };
  },
};

// ── Statement of Claim (Pleading) ───────────────────────────────────────────
const statementOfClaim: DocTemplate = {
  id: "statement_of_claim",
  name: { en: "Statement of Claim", ar: "صحيفة دعوى" },
  description: {
    en: "A pleading initiating an action before the court on the client's behalf.",
    ar: "مذكرة دعوى تُرفع نيابةً عن الموكّل أمام المحكمة.",
  },
  render: (f, lang) => {
    const date = longDate(f.date, lang);
    if (lang === "ar") {
      return {
        title: "صحيفة دعوى",
        blocks: [
          { kind: "heading", text: "أمام محكمة الكويت الكلية — الموقّرة" },
          {
            kind: "paragraph",
            text: `مقدّمة من: ${f.clientName}، حامل الرقم المدني رقم ${num(
              f.civilId,
            )}، وينوب عنه السادة/ ${f.firmName} للمحاماة.`,
          },
          { kind: "paragraph", text: `المحرّرة بتاريخ ${date}، والمقيّدة برقم ${num(f.caseNumber)}.` },
          { kind: "heading", text: "الوقائع" },
          {
            kind: "paragraph",
            text: "تتحصّل وقائع الدعوى في أن المدّعي قد لحقه ضرر مباشر يستوجب مساءلة المدّعى عليه وإلزامه بالتعويض وفقاً للثابت بالأوراق والمستندات المرفقة.",
          },
          { kind: "heading", text: "الطلبات" },
          {
            kind: "clause",
            index: 1,
            text: "قبول الدعوى شكلاً، وفي الموضوع إلزام المدّعى عليه بأداء المبالغ المستحقة.",
          },
          { kind: "clause", index: 2, text: "إلزام المدّعى عليه بالمصروفات ومقابل أتعاب المحاماة." },
          {
            kind: "signatures",
            firm: `وكيل المدّعي: ${f.firmName}`,
            client: `المدّعي: ${f.clientName}`,
          },
        ],
      };
    }
    return {
      title: "Statement of Claim",
      blocks: [
        { kind: "heading", text: "Before the Honorable Kuwait Court of First Instance" },
        {
          kind: "paragraph",
          text: `Submitted by: ${f.clientName}, holder of Civil ID No. ${num(
            f.civilId,
          )}, represented by ${f.firmName} for Legal Practice.`,
        },
        { kind: "paragraph", text: `Drafted on ${date}, registered under No. ${num(f.caseNumber)}.` },
        { kind: "heading", text: "The Facts" },
        {
          kind: "paragraph",
          text: "The facts of the action are that the Claimant sustained direct damage warranting the liability of the Defendant and an award of compensation as established by the attached papers and documents.",
        },
        { kind: "heading", text: "The Requests" },
        {
          kind: "clause",
          index: 1,
          text: "To accept the action in form, and on the merits to oblige the Defendant to pay the amounts due.",
        },
        { kind: "clause", index: 2, text: "To oblige the Defendant to bear the costs and legal fees." },
        {
          kind: "signatures",
          firm: `Counsel for the Claimant: ${f.firmName}`,
          client: `The Claimant: ${f.clientName}`,
        },
      ],
    };
  },
};

export const DOCUMENT_TEMPLATES: DocTemplate[] = [
  powerOfAttorney,
  retainerAgreement,
  statementOfClaim,
];
