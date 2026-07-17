import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * AI Drafting Assistant server functions.
 *
 * Generates bilingual legal document drafts (memoranda, appeal grounds,
 * cassation petitions, demand letters) grounded on:
 *   1. the selected case's parties, court, and status (from firm data)
 *   2. relevant passages retrieved from `legal_knowledge` via embeddings (RAG)
 *
 * Output is markdown with inline citations `[1] [2] …` and a structured
 * citations array the UI renders as a side panel.
 */

export const DOC_TYPES = [
  "memorandum",
  "appeal_grounds",
  "cassation_petition",
  "demand_letter",
  "response_memo",
  "motion_for_evidence",
  "settlement_offer",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export interface DraftCitation {
  index: number;
  title: string;
  snippet: string;
  similarity: number;
}

export interface DraftResult {
  content: string;
  citations: DraftCitation[];
  caseSnapshot: {
    caseNumber: string | null;
    title: string | null;
    clientName: string | null;
    court: string | null;
    nextHearing: string | null;
  } | null;
}

/** Cases dropdown source for the drafting screen. */
export const listCasesForDrafting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("cases")
      .select("id, case_number, title, title_ar, overall_status, client_id")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Generate a draft. Returns markdown + citations pulled from the knowledge base. */
export const draftLegalDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        docType: z.enum(DOC_TYPES),
        caseId: z.string().uuid().nullable().optional(),
        additionalFacts: z.string().max(6000).optional().default(""),
        language: z.enum(["ar", "en"]).default("ar"),
        tone: z.enum(["formal", "assertive", "conciliatory"]).default("formal"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<DraftResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const supabase = context.supabase;

    // ── 1. Case snapshot (optional) ────────────────────────────────
    let caseSnapshot: DraftResult["caseSnapshot"] = null;
    let caseContextBlock = "";
    if (data.caseId) {
      const { data: c } = await supabase
        .from("cases")
        .select("case_number, title, title_ar, case_type, overall_status, client_id")
        .eq("id", data.caseId)
        .maybeSingle();
      if (c) {
        const [{ data: client }, { data: hearings }] = await Promise.all([
          c.client_id
            ? supabase
                .from("clients")
                .select("name, name_ar, civil_id")
                .eq("id", c.client_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("hearings")
            .select("session_date, level, status, notes")
            .eq("case_id", data.caseId)
            .order("session_date", { ascending: true })
            .limit(3),
        ]);
        const nextHearing = (hearings ?? []).find((h) => h.status !== "held") ?? null;
        caseSnapshot = {
          caseNumber: c.case_number ?? null,
          title: (data.language === "ar" ? c.title_ar : c.title) ?? c.title ?? null,
          clientName:
            (data.language === "ar" ? client?.name_ar : client?.name) ?? client?.name ?? null,
          court: nextHearing?.level ?? null,
          nextHearing: nextHearing?.session_date ?? null,
        };
        caseContextBlock = JSON.stringify({
          case_number: c.case_number,
          case_type: c.case_type,
          overall_status: c.overall_status,
          title_en: c.title,
          title_ar: c.title_ar,
          client_name: client?.name,
          client_name_ar: client?.name_ar,
          client_civil_id: client?.civil_id,
          hearings: hearings ?? [],
        });
      }
    }

    // ── 2. RAG over legal_knowledge ────────────────────────────────
    const { embedQuery } = await import("@/lib/embeddings.server");
    const query = [DOC_TYPE_QUERY_HINTS[data.docType], data.additionalFacts, caseSnapshot?.title]
      .filter(Boolean)
      .join(" ")
      .slice(0, 2000);

    let citations: DraftCitation[] = [];
    let knowledgeBlock = "";
    try {
      const vector = await embedQuery(query || DOC_TYPE_QUERY_HINTS[data.docType]);
      const { data: matches, error } = await supabase.rpc("match_legal_knowledge", {
        query_embedding: JSON.stringify(vector),
        match_count: 6,
      });
      if (!error && matches) {
        citations = (matches as Array<{ title: string; content: string; similarity: number }>)
          .filter((m) => m.similarity >= 0.18)
          .map((m, i) => ({
            index: i + 1,
            title: m.title,
            snippet: m.content.slice(0, 500),
            similarity: m.similarity,
          }));
        if (citations.length > 0) {
          knowledgeBlock = citations
            .map((c) => `[${c.index}] ${c.title}\n${c.snippet}`)
            .join("\n\n---\n\n");
        }
      }
    } catch (err) {
      console.error("[drafting] rag failed", err);
    }

    // ── 3. Prompt ──────────────────────────────────────────────────
    const langLabel = data.language === "ar" ? "Arabic" : "English";
    const docSpec = DOC_TYPE_SPECS[data.docType];
    const toneNote = TONE_NOTES[data.tone];

    const system = `You are "Qadiya Counsel Drafter", the senior legal-drafting AI inside a Kuwaiti law-firm practice-management system.

TASK
- Draft a ${docSpec.label_en} (${docSpec.label_ar}) in ${langLabel}, following the standard Kuwaiti court-filing structure.
- Tone: ${toneNote}.
- Output must be COMPLETE and READY FOR A LAWYER TO REVIEW — not an outline. Fill placeholders with the case data provided; if a field is unknown, mark it inline as [___] so the lawyer can complete it.
- Use markdown headings, numbered clauses, and bold for legal terms and deadlines.
- Cite the retrieved passages inline as [1], [2] etc. wherever you rely on them. Do NOT cite passages you did not use. Never invent case numbers, article numbers, or precedents that are not in the retrieved passages.
- Keep numerals as standard digits (0-9) even inside Arabic text.

STANDARD STRUCTURE FOR ${docSpec.label_en.toUpperCase()}
${docSpec.structure}

CASE DATA (JSON, live from the firm's backend):
${caseContextBlock || "{}"}

ADDITIONAL FACTS FROM THE LAWYER:
${data.additionalFacts?.trim() || "(none provided — draft from case data + retrieved authorities)"}

RETRIEVED KUWAITI LEGAL PASSAGES (primary authorities — cite as [n]):
${knowledgeBlock || "(no matching passages — draft from general Kuwaiti procedural knowledge and flag uncertainty)"}

End with a short "ملاحظات للمحامي" / "Drafter's notes" section listing any [___] placeholders that need lawyer input and any legal assumptions you made.`;

    const userPrompt =
      data.language === "ar"
        ? `اكتب المسودة الآن. ابدأ مباشرة بديباجة المحكمة ورقم القضية.`
        : `Write the draft now. Begin directly with the court caption and case number.`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.35,
      }),
    });

    if (upstream.status === 429) throw new Error("RATE_LIMIT");
    if (upstream.status === 402) throw new Error("NO_CREDITS");
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      throw new Error(`AI gateway error ${upstream.status}: ${text.slice(0, 300)}`);
    }
    const json = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) throw new Error("Empty draft from AI gateway");

    // Only return citations actually referenced by the draft.
    const usedIndexes = new Set<number>();
    for (const m of content.matchAll(/\[(\d+)\]/g)) {
      usedIndexes.add(Number(m[1]));
    }
    const filteredCitations = citations.filter((c) => usedIndexes.has(c.index));

    return { content, citations: filteredCitations, caseSnapshot };
  });

/** Persist a generated draft as a case note (internal). */
export const saveDraftAsNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        caseId: z.string().uuid(),
        content: z.string().min(1).max(50000),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: row, error } = await supabase
      .from("case_notes")
      .insert({
        case_id: data.caseId,
        author_id: context.userId,
        body: data.content,
        is_internal: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ── Template specifications ──────────────────────────────────────────────
const DOC_TYPE_SPECS: Record<
  DocType,
  { label_en: string; label_ar: string; structure: string }
> = {
  memorandum: {
    label_en: "Legal Memorandum",
    label_ar: "مذكرة قانونية",
    structure:
      "1. Court caption (المحكمة / رقم القضية / أطراف الدعوى)\n2. الوقائع (Facts)\n3. الطلبات (Requests / Relief sought)\n4. السند القانوني (Legal basis — cite articles and precedents)\n5. المستندات (Attachments list)\n6. التوقيع",
  },
  appeal_grounds: {
    label_en: "Grounds of Appeal (استئناف)",
    label_ar: "أسباب الاستئناف",
    structure:
      "1. المحكمة (Court of Appeal caption) + رقم الحكم المستأنف\n2. أطراف الطعن\n3. الوقائع باختصار\n4. أسباب الاستئناف (Numbered grounds — each with legal reasoning + article citations)\n5. الطلبات (Prayer for relief: quashing/modification)\n6. تحفظ بحق تعديل الأسباب\n7. التوقيع والتاريخ",
  },
  cassation_petition: {
    label_en: "Cassation Petition (طعن بالتمييز)",
    label_ar: "طعن بالتمييز",
    structure:
      "1. محكمة التمييز caption\n2. الحكم المطعون فيه (Reference to appellate judgment being challenged — court, date, number)\n3. الوقائع الجوهرية\n4. أسباب الطعن (numbered — must be points of law only: مخالفة القانون، الخطأ في تطبيقه، البطلان، القصور في التسبيب)\n5. الطلبات\n6. التوقيع من محامي مقبول أمام التمييز",
  },
  demand_letter: {
    label_en: "Formal Demand Letter (إنذار)",
    label_ar: "إنذار قانوني",
    structure:
      "1. اسم المُنذَر وعنوانه\n2. الوقائع بإيجاز\n3. الحق المطلوب مع سنده القانوني\n4. المهلة (usually 15/30 days)\n5. التحذير من اللجوء للقضاء عند عدم التنفيذ\n6. اسم المرسل والتوقيع",
  },
  response_memo: {
    label_en: "Reply Memorandum (مذكرة رد)",
    label_ar: "مذكرة رد",
    structure:
      "1. Court caption + case reference\n2. سرد ادعاءات الخصم بإيجاز\n3. الرد التفصيلي على كل ادعاء (numbered)\n4. الدفوع القانونية (procedural + substantive defenses)\n5. الطلبات (rejection of opposing claims + counterclaims if any)\n6. المستندات\n7. التوقيع",
  },
  motion_for_evidence: {
    label_en: "Motion for Evidence (طلب إجراء تحقيق)",
    label_ar: "طلب إجراء تحقيق",
    structure:
      "1. Court caption\n2. الوقائع الموجبة للطلب\n3. الإجراء المطلوب (شهود، خبرة، مضاهاة، معاينة…) مع أسمائه/تفاصيله\n4. مبررات الطلب وأهميته للفصل في الدعوى\n5. السند الإجرائي (articles of the Code of Civil & Commercial Procedure)\n6. الطلبات\n7. التوقيع",
  },
  settlement_offer: {
    label_en: "Settlement Offer (عرض تسوية)",
    label_ar: "عرض تسوية",
    structure:
      "1. الأطراف والقضية المرجعية\n2. خلفية النزاع بإيجاز\n3. شروط التسوية المقترحة (numbered — figures, deadlines, mutual releases)\n4. آثار قبول التسوية (تنازل عن الدعوى، سرية…)\n5. مهلة القبول\n6. بند عدم الاعتراف (without prejudice)\n7. التوقيع",
  },
};

const DOC_TYPE_QUERY_HINTS: Record<DocType, string> = {
  memorandum: "مذكرة قانونية أمام المحكمة الكلية إجراءات مدنية",
  appeal_grounds: "أسباب الاستئناف ميعاد الطعن محكمة الاستئناف",
  cassation_petition: "طعن بالتمييز مخالفة القانون قصور تسبيب محكمة التمييز",
  demand_letter: "إنذار رسمي مطالبة بالحق مهلة قانونية",
  response_memo: "مذكرة رد دفوع إجرائية وموضوعية",
  motion_for_evidence: "طلب إجراء تحقيق شهود خبرة قانون المرافعات",
  settlement_offer: "عرض تسوية تنازل عن الدعوى بدون مساس بالحقوق",
};

const TONE_NOTES: Record<"formal" | "assertive" | "conciliatory", string> = {
  formal: "Neutral, precise, court-standard formal register",
  assertive: "Firm and forceful — emphasize the client's rights and opposing party's failures",
  conciliatory: "Respectful and settlement-oriented — leave room for negotiation",
};
