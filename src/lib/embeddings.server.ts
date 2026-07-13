// Server-only helper that generates text embeddings via the Lovable AI Gateway.
// Uses openai/text-embedding-3-small (1536 dims) to match the legal_knowledge.embedding column.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;
// Keep batches small so we stay well within the per-request token cap.
const BATCH_SIZE = 32;

export const EMBEDDING_DIMENSIONS = EMBED_DIMS;

async function embedBatch(inputs: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 402) throw new Error("NO_CREDITS");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Embedding request failed [${res.status}]: ${text}`);
  }

  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Embed an array of texts, batching to respect gateway limits. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const vectors = await embedBatch(batch, apiKey);
    out.push(...vectors);
  }
  return out;
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}

/**
 * Split long text into overlapping chunks suitable for embedding.
 * Splits on paragraph boundaries where possible, targeting ~1000 chars per chunk.
 */
export function chunkText(text: string, target = 1000, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  const push = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };

  for (const para of paragraphs) {
    // If a single paragraph is huge, hard-split it.
    if (para.length > target * 1.5) {
      push();
      for (let i = 0; i < para.length; i += target - overlap) {
        chunks.push(para.slice(i, i + target).trim());
      }
      continue;
    }
    if ((current + "\n\n" + para).length > target && current) {
      push();
      // carry a small overlap tail for context continuity
      const tail = chunks[chunks.length - 1]?.slice(-overlap) ?? "";
      current = tail ? tail + "\n\n" + para : para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  push();

  return chunks.filter((c) => c.length > 0);
}
