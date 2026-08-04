import { createFileRoute } from "@tanstack/react-router";

// Cron-driven auto-runner. pg_cron hits this every minute with the private
// cron secret in the `x-cron-secret` header (never the public app key), then we
// dispatch a batch for every campaign in `sending` status.
export const Route = createFileRoute("/api/public/hooks/tick-campaigns")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireCronAuth, claimTick } = await import("@/lib/cron-auth.server");
        const denied = await requireCronAuth(request);
        if (denied) return denied;

        if (!(await claimTick("tick-campaigns", 45))) {
          return Response.json({ ok: true, skipped: "tick_in_progress" }, { status: 202 });
        }

        const { tickAllSendingCampaigns } = await import("@/lib/campaign-runner.server");
        const result = await tickAllSendingCampaigns();
        return Response.json(result);
      },
    },
  },
});
