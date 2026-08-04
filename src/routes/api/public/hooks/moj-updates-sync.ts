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
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env["SUPABASE_ANON_KEY"]) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
