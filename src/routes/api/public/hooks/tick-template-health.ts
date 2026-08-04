// Daily canary for the Template Health Agent. pg_cron posts here with the
// private cron secret (never the public app key). Each canary runs a capped,
// fixed known-good request and records per-field fill rates.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tick-template-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireCronAuth, claimTick } = await import("@/lib/cron-auth.server");
        const denied = await requireCronAuth(request);
        if (denied) return denied;

        // Daily job: refuse a second run inside 12 hours.
        if (!(await claimTick("tick-template-health", 43_200))) {
          return Response.json({ ok: true, skipped: "tick_in_progress" }, { status: 202 });
        }

        try {
          const { runTemplateHealthCanaries } = await import("@/lib/template-health.server");
          return Response.json(await runTemplateHealthCanaries());
        } catch (err) {
          const message = err instanceof Error ? err.message : "Canary Failed";
          console.error("tick-template-health failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
