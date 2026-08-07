// Nightly 10DLC status reconciliation. Carrier vetting is asynchronous and has
// no reliable callback, so we poll every workspace still marked "submitted".
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tick-registrations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireCronAuth, claimTick } = await import("@/lib/cron-auth.server");
        const denied = await requireCronAuth(request);
        if (denied) return denied;

        // Daily job: refuse a second run inside 12 hours.
        if (!(await claimTick("tick-registrations", 43_200))) {
          return Response.json({ ok: true, skipped: "tick_in_progress" }, { status: 202 });
        }

        try {
          const { syncPendingRegistrations } = await import("@/lib/registration-sync.server");
          return Response.json(await syncPendingRegistrations());
        } catch (err) {
          const message = err instanceof Error ? err.message : "Registration Sync Failed";
          console.error("tick-registrations failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
