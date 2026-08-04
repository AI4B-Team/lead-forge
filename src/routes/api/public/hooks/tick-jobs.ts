// Cron entry point for the recurring-run engine. pg_cron posts here with the
// private cron secret; the handler finds every list whose next run is due and
// pipelines it net-new.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tick-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireCronAuth, claimTick } = await import("@/lib/cron-auth.server");
        const denied = await requireCronAuth(request);
        if (denied) return denied;

        if (!(await claimTick("tick-jobs", 300))) {
          return Response.json({ ok: true, skipped: "tick_in_progress" }, { status: 202 });
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
