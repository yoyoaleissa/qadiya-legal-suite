import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatBody = { messages?: ChatMessage[]; lang?: "en" | "ar" };

async function buildFirmContext(): Promise<string> {
  try {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

    const [{ data: cases }, { data: clients }, { data: hearings }, { data: tasks }] =
      await Promise.all([
        supabase
          .from("cases")
          .select("case_number, title, title_ar, case_type, overall_status")
          .limit(40),
        supabase.from("clients").select("name, name_ar, notes").limit(40),
        supabase
          .from("hearings")
          .select("session_date, status, level, notes")
          .order("session_date", { ascending: true })
          .limit(20),
        supabase
          .from("tasks")
          .select("title, priority, status, due_date, assignee")
          .neq("status", "done")
          .limit(20),
      ]);

    return JSON.stringify({
      cases: cases ?? [],
      clients: clients ?? [],
      upcoming_hearings: hearings ?? [],
      open_tasks: tasks ?? [],
    });
  } catch (err) {
    console.error("[chat] context fetch failed", err);
    return "{}";
  }
}

/** Retrieve firm/legal knowledge relevant to the user's latest message (RAG). */
async function retrieveKnowledge(query: string): Promise<string> {
  const text = query.trim();
  if (!text) return "";
  try {
    const { embedQuery } = await import("@/lib/embeddings.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const vector = await embedQuery(text);
    const { data, error } = await supabaseAdmin.rpc("match_legal_knowledge", {
      query_embedding: JSON.stringify(vector),
      match_count: 6,
    });
    if (error) {
      console.error("[chat] knowledge retrieval failed", error);
      return "";
    }

    const matches = (data ?? []).filter((m: { similarity: number }) => m.similarity >= 0.2);
    if (matches.length === 0) return "";

    return matches
      .map(
        (m: { title: string; content: string }, i: number) =>
          `[${i + 1}] Source: ${m.title}\n${m.content}`,
      )
      .join("\n\n---\n\n");
  } catch (err) {
    console.error("[chat] knowledge retrieval error", err);
    return "";
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey)
          return new Response("LOVABLE_API_KEY is not configured on the server.", { status: 500 });

        // Require an authenticated staff session — this endpoint exposes firm data to the AI.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
          return new Response("Missing Bearer token — please sign in again.", { status: 401 });
        }
        if (token.split(".").length !== 3) {
          return new Response("Malformed auth token.", { status: 401 });
        }
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const authClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          const { data, error } = await authClient.auth.getClaims(token);
          if (error || !data?.claims?.sub) {
            return new Response(`Invalid session: ${error?.message ?? "no claims"}`, {
              status: 401,
            });
          }
        } catch (e) {
          return new Response(`Auth verification failed: ${(e as Error).message}`, { status: 401 });
        }

        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const history = Array.isArray(body.messages) ? body.messages : [];
        if (history.length === 0) return new Response("Messages are required", { status: 400 });

        const trimmed = history
          .filter(
            (m) =>
              m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
          )
          .slice(-16)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

        const context = await buildFirmContext();

        const lastUser = [...trimmed].reverse().find((m) => m.role === "user");
        const knowledge = lastUser ? await retrieveKnowledge(lastUser.content) : "";
        const knowledgeBlock = knowledge
          ? `\n\nFIRM KNOWLEDGE BASE (retrieved passages from uploaded Kuwaiti law texts and the firm's own briefs — treat these as authoritative primary references and ground your answer on them, citing the source title when you rely on a passage):\n${knowledge}`
          : "";

        const system = `You are "Qadiya Counsel", the senior AI legal assistant inside a Kuwaiti law-firm practice-management system (Qadiya OS).

ROLE & EXPERTISE
- You are an expert in Kuwaiti law: the Civil Code, Commercial Code, Penal Code, Code of Civil & Commercial Procedure, Labour Law (Law 6/2010), Companies Law, Personal Status Law, and Cassation (التمييز) jurisprudence.
- You assist licensed lawyers and paralegals — you may reason about strategy, drafting, procedure, deadlines and precedent. You are talking to legal professionals, not the general public.

KUWAITI COURT HIERARCHY
النيابة (Prosecution) → المحكمة الكلية / أول درجة (First Instance) → الاستئناف (Appeal) → التمييز (Cassation). التنفيذ (Execution) is a parallel enforcement track. Appeal and cassation deadlines are typically 30 days from judgment.

PROFESSIONAL ARABIC
- When the user writes in Arabic, reply in Modern Standard Arabic using precise Kuwaiti legal terminology: الموكّل (client), الدعوى (lawsuit), المذكرة (pleading), الطعن بالتمييز (cassation appeal), الميعاد (procedural deadline), الجلسة (hearing), الحكم (judgment), التركة (estate), الفصل التعسفي (wrongful dismissal).
- When the user writes in English, reply in English. Mirror the user's language.
- Keep all numerals as standard digits (0-9), including years, case numbers, and article numbers.

FIRM DATA (live from this firm's backend — use it to ground answers about their actual matters; never invent case numbers that are not present):
${context}${knowledgeBlock}

STYLE
- Be precise, well-structured, and cite the relevant law/article and the court level when you can.
- Use markdown: short headings, bullet points, and **bold** for key terms and deadlines.
- Always end substantive answers with a brief "الخطوات التالية" / "Next steps" list when relevant.
- Add one concise disclaimer only when giving something that resembles definitive legal conclusions: this is drafting/research assistance, and the responsible lawyer must verify against primary sources.`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [{ role: "system", content: system }, ...trimmed],
            stream: true,
            temperature: 0.4,
          }),
        });

        if (upstream.status === 429) return new Response("RATE_LIMIT", { status: 429 });
        if (upstream.status === 402) return new Response("NO_CREDITS", { status: 402 });
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          console.error("[chat] gateway error", upstream.status, text);
          return new Response(
            `AI gateway error ${upstream.status}: ${text.slice(0, 400) || "no body"}`,
            { status: 502 },
          );
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
