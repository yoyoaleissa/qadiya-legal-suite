import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled MOJ regulatory-update detection (pg_cron job `moj-updates-daily`,
 * 05:00 UTC / 08:00 Kuwait). Detection + explanation logic lives in
 * @/lib/moj-detect.server so the on-demand button shares the exact same path.
 */
export const Route = createFileRoute("/api/public/hooks/moj-updates-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const apiKeyHash = apiKey ? await sha256(apiKey) : null;
        const { data: cronKey, error: cronKeyError } = await supabaseAdmin
          .from("app_internal_secret_hashes")
          .select("secret_sha256")
          .eq("name", "moj_updates_cron_key")
          .maybeSingle();

        const keyMatches =
          Boolean(apiKeyHash) &&
          !cronKeyError &&
          typeof cronKey?.secret_sha256 === "string" &&
          safeEqual(apiKeyHash, cronKey.secret_sha256);

        if (!keyMatches) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { detectAndStoreMojUpdates } = await import("@/lib/moj-detect.sync.server");

        try {
          const result = await detectAndStoreMojUpdates(supabaseAdmin);
          console.log(
            `MOJ updates cron: checked ${result.checked}, inserted ${result.inserted}, known ${result.skipped}`,
          );
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
