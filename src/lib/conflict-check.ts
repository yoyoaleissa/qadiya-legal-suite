/**
 * Conflict of Interest Checker
 * Checks if a new client or opposing party conflicts with existing firm data.
 */

export interface ConflictResult {
  hasConflict: boolean;
  matches: ConflictMatch[];
}

export interface ConflictMatch {
  type: "client_name" | "opposing_party" | "related_entity";
  matchedName: string;
  caseTitle?: string;
  caseId?: string;
  clientId?: string;
  similarity: number; // 0-1
}

/**
 * Normalize Arabic text for comparison:
 * - Remove diacritics (tashkeel)
 * - Normalize alef variants
 * - Normalize taa marbuta / haa
 * - Trim and lowercase
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // Remove tashkeel
    .replace(/[إأآا]/g, "ا") // Normalize alef
    .replace(/ة/g, "ه") // Normalize taa marbuta
    .replace(/ى/g, "ي") // Normalize alef maqsura
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Calculate similarity between two strings (Dice coefficient)
 */
function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
  }

  let intersectionSize = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigrams.get(bigram) || 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2.0 * intersectionSize) / (a.length - 1 + (b.length - 1));
}

/**
 * Check a name against a list of existing names for conflicts.
 * Returns matches with similarity >= threshold (default 0.7)
 */
export function checkConflicts(
  newName: string,
  existingEntities: Array<{
    name: string;
    type: "client_name" | "opposing_party" | "related_entity";
    caseTitle?: string;
    caseId?: string;
    clientId?: string;
  }>,
  threshold = 0.7
): ConflictResult {
  const normalizedNew = normalizeArabic(newName);
  const matches: ConflictMatch[] = [];

  for (const entity of existingEntities) {
    const normalizedExisting = normalizeArabic(entity.name);

    // Exact match
    if (normalizedNew === normalizedExisting) {
      matches.push({
        ...entity,
        matchedName: entity.name,
        similarity: 1.0,
      });
      continue;
    }

    // Contains match (one name contains the other)
    if (normalizedNew.includes(normalizedExisting) || normalizedExisting.includes(normalizedNew)) {
      matches.push({
        ...entity,
        matchedName: entity.name,
        similarity: 0.9,
      });
      continue;
    }

    // Fuzzy match
    const similarity = diceSimilarity(normalizedNew, normalizedExisting);
    if (similarity >= threshold) {
      matches.push({
        ...entity,
        matchedName: entity.name,
        similarity,
      });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    hasConflict: matches.length > 0,
    matches,
  };
}
