import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OnboardingState = {
  welcomeDismissed: boolean;
  checklistCollapsed: boolean;
  reviewedCleanList: boolean;
  hasJob: boolean;
  hasBrand: boolean;
  hasNumbers: boolean;
  hasCampaign: boolean;
};

/** Reads onboarding prefs plus the auto-checked activation milestones. */
export const getOnboarding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<OnboardingState> => {
    const ws = data.workspaceId;
    const count = (table: "jobs" | "brands" | "sending_numbers" | "campaigns") =>
      context.supabase.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", ws);

    const [prefs, jobs, brands, numbers, campaigns] = await Promise.all([
      context.supabase
        .from("user_prefs")
        .select("welcome_dismissed, checklist_collapsed, reviewed_clean_list")
        .eq("user_id", context.userId)
        .maybeSingle(),
      count("jobs"),
      count("brands"),
      count("sending_numbers"),
      count("campaigns"),
    ]);

    return {
      welcomeDismissed: Boolean(prefs.data?.welcome_dismissed),
      checklistCollapsed: Boolean(prefs.data?.checklist_collapsed),
      reviewedCleanList: Boolean(prefs.data?.reviewed_clean_list),
      hasJob: (jobs.count ?? 0) > 0,
      hasBrand: (brands.count ?? 0) > 0,
      hasNumbers: (numbers.count ?? 0) > 0,
      hasCampaign: (campaigns.count ?? 0) > 0,
    };
  });

export const setOnboardingPref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        welcomeDismissed: z.boolean().optional(),
        checklistCollapsed: z.boolean().optional(),
        reviewedCleanList: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, boolean> = {};
    if (data.welcomeDismissed !== undefined) patch.welcome_dismissed = data.welcomeDismissed;
    if (data.checklistCollapsed !== undefined) patch.checklist_collapsed = data.checklistCollapsed;
    if (data.reviewedCleanList !== undefined) patch.reviewed_clean_list = data.reviewedCleanList;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("user_prefs")
      .upsert({ user_id: context.userId, ...patch } as never, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });
