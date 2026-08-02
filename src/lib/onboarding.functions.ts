import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OnboardingState = {
  welcomeDismissed: boolean;
  checklistCollapsed: boolean;
  reviewedCleanList: boolean;
  firstRunDismissed: boolean;
  hasJob: boolean;
  hasBrand: boolean;
  hasAgent: boolean;
  hasNumbers: boolean;
  hasCampaign: boolean;
};

/** Reads onboarding prefs plus the auto-checked activation milestones. */
export const getOnboarding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<OnboardingState> => {
    const ws = data.workspaceId;
    const count = (table: "jobs" | "brands" | "sending_numbers" | "campaigns" | "registrations") =>
      context.supabase.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", ws);

    const [prefs, jobs, brands, numbers, campaigns, registrations] = await Promise.all([
      context.supabase
        .from("user_prefs")
        .select("welcome_dismissed, checklist_collapsed, reviewed_clean_list, first_run_dismissed")
        .eq("user_id", context.userId)
        .maybeSingle(),
      count("jobs"),
      count("brands"),
      count("sending_numbers"),
      count("campaigns"),
      count("registrations"),
    ]);

    return {
      welcomeDismissed: Boolean(prefs.data?.welcome_dismissed),
      checklistCollapsed: Boolean(prefs.data?.checklist_collapsed),
      reviewedCleanList: Boolean(prefs.data?.reviewed_clean_list),
      firstRunDismissed: Boolean((prefs.data as { first_run_dismissed?: boolean } | null)?.first_run_dismissed),
      hasJob: (jobs.count ?? 0) > 0,
      hasBrand: (registrations.count ?? 0) > 0,
      hasAgent: (brands.count ?? 0) > 0,
      hasNumbers: (numbers.count ?? 0) > 0,
      hasCampaign: (campaigns.count ?? 0) > 0,
    };
  });

/**
 * Post-login landing decision. Route by account state, never a fixed page:
 * a brand-new account goes to Build (fastest path to first value) with the
 * setup checklist alongside; anyone with data lands on the Dashboard, where
 * unfinished setup steps sit pinned at the top.
 */
export const getLandingTarget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ target: "assistant" | "dashboard"; firstRun: boolean }> => {
    const ws = data.workspaceId;
    const count = (table: "jobs" | "campaigns" | "brands" | "sending_numbers") =>
      context.supabase.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", ws);

    const [prefs, jobs, campaigns, brands, numbers] = await Promise.all([
      context.supabase
        .from("user_prefs")
        .select("first_run_dismissed")
        .eq("user_id", context.userId)
        .maybeSingle(),
      count("jobs"),
      count("campaigns"),
      count("brands"),
      count("sending_numbers"),
    ]);

    const dismissed = Boolean((prefs.data as { first_run_dismissed?: boolean } | null)?.first_run_dismissed);
    const hasData = (jobs.count ?? 0) > 0 || (campaigns.count ?? 0) > 0;
    const untouched = !hasData && (brands.count ?? 0) === 0 && (numbers.count ?? 0) === 0;
    const firstRun = untouched && !dismissed;
    return { target: firstRun ? "assistant" : "dashboard", firstRun };
  });

export const setOnboardingPref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        welcomeDismissed: z.boolean().optional(),
        checklistCollapsed: z.boolean().optional(),
        reviewedCleanList: z.boolean().optional(),
        firstRunDismissed: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, boolean> = {};
    if (data.welcomeDismissed !== undefined) patch.welcome_dismissed = data.welcomeDismissed;
    if (data.checklistCollapsed !== undefined) patch.checklist_collapsed = data.checklistCollapsed;
    if (data.reviewedCleanList !== undefined) patch.reviewed_clean_list = data.reviewedCleanList;
    if (data.firstRunDismissed !== undefined) patch.first_run_dismissed = data.firstRunDismissed;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("user_prefs")
      .upsert({ user_id: context.userId, ...patch } as never, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });
