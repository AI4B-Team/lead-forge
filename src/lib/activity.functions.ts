import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACTIVITY_GROUPS, type ActivityEvent } from "./activity.shared";

/**
 * Account-wide operational feed for the slide-out panel and the dashboard
 * widget. Convenience-oriented: the compliance record on /app/compliance stays
 * the system of record for anything evidentiary.
 */
export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        group: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let query = supabase
      .from("activity_events")
      .select("id, type, summary, detail, ref_id, ref_type, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 40);

    const group = ACTIVITY_GROUPS.find((g) => g.key === data.group);
    if (group && group.key !== "all") query = query.in("type", group.types);

    const { data: rows, error } = await query;
    if (error) throw error;

    // Today's opt-outs are surfaced as a pointer into Compliance — never as the
    // record itself.
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("suppression")
      .select("phone", { count: "exact", head: true })
      .eq("workspace_id", data.workspaceId)
      .gte("created_at", start.toISOString());

    return { events: (rows ?? []) as ActivityEvent[], optOutsToday: count ?? 0 };
  });