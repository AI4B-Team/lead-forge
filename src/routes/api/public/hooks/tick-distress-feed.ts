// Nightly pull for the maintained Distress Feed. One pull per county per record
// type serves every customer who wants that county, so cost of goods is per pull
// and the feed stays free to browse. Authenticated with the private cron secret.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tick-distress-feed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireCronAuth, claimTick } = await import("@/lib/cron-auth.server");
        const denied = await requireCronAuth(request);
        if (denied) return denied;

        // Nightly job: refuse a second sweep inside 12 hours.
        if (!(await claimTick("tick-distress-feed", 43_200))) {
          return Response.json({ ok: true, skipped: "tick_in_progress" }, { status: 202 });
        }

        try {
          const { runNightlyPulls } = await import("@/lib/distress-feed.server");
          return Response.json(await runNightlyPulls());
        } catch (err) {
          const message = err instanceof Error ? err.message : "Pull Failed";
          console.error("tick-distress-feed failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
