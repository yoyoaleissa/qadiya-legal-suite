// Shared helper: builds the "people involved in the case" lines for both the
// in-app report view and the exported PDF. Empty fields are omitted entirely.
import type { CasePartyInfo } from "./report-types";
import type { Lang } from "./app-context";

export interface PartyLine {
  label: string;
  value: string;
}

export function buildPartyLines(
  parties: CasePartyInfo | null | undefined,
  lang: Lang,
): PartyLine[] {
  if (!parties) return [];
  const isAr = lang === "ar";
  const pick = (en: string | null, ar: string | null) =>
    (isAr ? (ar ?? en) : (en ?? ar))?.trim() || null;

  const rows: [string, string, string | null][] = [
    ["Client", "المُوكِّل", pick(parties.client_name, parties.client_name_ar)],
    ["Opposing party", "الخصم", pick(parties.opposing_party, parties.opposing_party_ar)],
    ["Presiding judge", "رئيس الدائرة", pick(parties.judge_name, parties.judge_name_ar)],
    [
      "Opposing counsel",
      "وكيل الخصم",
      pick(parties.opposing_counsel, parties.opposing_counsel_ar),
    ],
  ];

  return rows
    .filter(([, , value]) => Boolean(value))
    .map(([en, ar, value]) => ({ label: isAr ? ar : en, value: value as string }));
}
