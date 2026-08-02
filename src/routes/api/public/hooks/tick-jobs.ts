// Cron entry point for the recurring-run engine. pg_cron posts here; the
// handler finds every list whose next run is due and pipelines it net-new.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tick-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer /, "") ??
          "";
        const expected =
          process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || key !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runDueLists } = await import("@/lib/recurring.server");
        try {
          const { ran } = await runDueLists(supabaseAdmin);
          return Response.json({ ok: true, ran: ran.length, results: ran });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Tick Failed";
          console.error("tick-jobs failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
