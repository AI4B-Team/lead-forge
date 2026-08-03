// Cron entry point for the Public Records Request scheduler. One request per
// agency per cycle, sent by LeadTrace — never one per user.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tick-records-requests")({
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
          return Response.json({ error: "Unauthorized" }, { status: 401 });
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
