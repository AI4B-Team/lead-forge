// Cron entry point for the Public Records Request scheduler. One request per
// agency per cycle, sent by LeadTrace — never one per user. Authenticated with
// the private cron secret, never the public app key.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tick-records-requests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireCronAuth, claimTick } = await import("@/lib/cron-auth.server");
        const denied = await requireCronAuth(request);
        if (denied) return denied;

        if (!(await claimTick("tick-records-requests", 3600))) {
          return Response.json({ ok: true, skipped: "tick_in_progress" }, { status: 202 });
        }

        try {
          const { sendDueRequests } = await import("@/lib/records-requests.server");
          return Response.json({ ok: true, ...(await sendDueRequests()) });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Tick Failed";
          console.error("tick-records-requests failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
