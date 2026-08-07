// Nightly licensed-API sourcing for the Distress Feed (probate, tax liens,
// vacancy). Runs after the county scrapers so the open-data sweep is never
// delayed by vendor latency. Authenticated with the private cron secret.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tick-realeflow-sourcing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireCronAuth, claimTick } = await import("@/lib/cron-auth.server");
        const denied = await requireCronAuth(request);
        if (denied) return denied;

        // Nightly job: refuse a second sweep inside 12 hours.
        if (!(await claimTick("tick-realeflow-sourcing", 43_200))) {
          return Response.json({ ok: true, skipped: "tick_in_progress" }, { status: 202 });
        }

        try {
          const { runRealeflowSourcing } = await import("@/lib/data-providers/realeflow-source.server");
          const report = await runRealeflowSourcing();
          console.log(
            `[realeflow-sourcing] ${report.requests} requests, ${report.results.length} county pulls`,
          );
          return Response.json(report);
        } catch (err) {
          const message = err instanceof Error ? err.message : "RealeFlow sourcing failed";
          console.error("tick-realeflow-sourcing failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});