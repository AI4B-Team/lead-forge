// Writer for the operational activity feed. Best-effort: logging what happened
// must never fail the action that produced it.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityType } from "./activity.shared";

type AnyClient = SupabaseClient<any, any, any>;

export async function logActivity(
  supabase: AnyClient,
  workspaceId: string,
  input: {
    type: ActivityType;
    summary: string;
    detail?: string | null;
    refId?: string | null;
    refType?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("activity_events").insert({
      workspace_id: workspaceId,
      type: input.type,
      summary: input.summary,
      detail: input.detail ?? null,
      ref_id: input.refId ?? null,
      ref_type: input.refType ?? null,
    });
  } catch {
    /* orientation only — never a blocker */
  }
}