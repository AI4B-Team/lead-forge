import { createFileRoute } from "@tanstack/react-router";
import { apiAdminClient, authenticateApiRequest, jsonResponse } from "@/lib/api-auth.server";

// GET /api/public/v1/jobs/:jobId → status + funnel counts + latest events
export const Route = createFileRoute("/api/public/v1/jobs/$jobId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const caller = await authenticateApiRequest(request);
        if (!caller) return jsonResponse({ error: "Unauthorized" }, 401);

        const admin = apiAdminClient();
        const { data: job } = await admin
          .from("jobs")
          .select(
            "id, workspace_id, source_type, status, rows_in, rows_deduped, rows_enriched, rows_out, params, created_at",
          )
          .eq("id", params.jobId)
          .maybeSingle();
        if (!job || !caller.workspaceIds.includes(job.workspace_id)) {
          return jsonResponse({ error: "Job not found" }, 404);
        }

        const { data: events } = await admin
          .from("job_events")
          .select("stage, message, count, created_at")
          .eq("job_id", job.id)
          .order("created_at", { ascending: true })
          .limit(200);

        return jsonResponse({ job, events: events ?? [] });
      },
    },
  },
});