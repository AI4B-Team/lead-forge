import { createFileRoute } from "@tanstack/react-router";

// Cron-driven multi-touch sequence runner. pg_cron hits this every 5 minutes
// with the private cron secret in the `x-cron-secret` header. Touch 1 is sent
// by tick-campaigns; every later touch is dispatched here.
export const Route = createFileRoute("/api/public/hooks/tick-sequences")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireCronAuth, claimTick } = await import("@/lib/cron-auth.server");
        const denied = await requireCronAuth(request);
        if (denied) return denied;

        if (!(await claimTick("tick-sequences", 240))) {
          return Response.json({ ok: true, skipped: "tick_in_progress" }, { status: 202 });
        }

        const { runSequenceTick } = await import("@/lib/sequence-runner.server");
        const result = await runSequenceTick();
        return Response.json(result);
      },
    },
  },
});
