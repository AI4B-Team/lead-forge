import { createFileRoute } from "@tanstack/react-router";

// Cron-driven auto-runner. pg_cron hits this every minute with the anon key
// in the `apikey` header; we then dispatch a batch for every campaign in
// `sending` status. Real logic lives in tickCampaignInternal so we can reuse
// it across authenticated + cron paths.
export const Route = createFileRoute("/api/public/hooks/tick-campaigns")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { tickAllSendingCampaigns } = await import("@/lib/campaign-runner.server");
        const result = await tickAllSendingCampaigns();
        return Response.json(result);
      },
      GET: async () =>
        Response.json({ ok: true, hint: "POST with apikey header to tick sending campaigns" }),
    },
  },
});