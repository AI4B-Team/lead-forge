/**
 * Server-side Free tier enforcement. Reads the workspace's plan context and
 * applies the shared gate, so the browser can render an upgrade prompt while
 * the server remains the thing that actually says no.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { freeGate, needsCard, type PlanContext } from "./free-tier.shared";

type AnyClient = Pick<SupabaseClient<any, any, any>, "from">;

export async function planContext(supabase: AnyClient, workspaceId: string): Promise<PlanContext> {
  const { data } = await supabase
    .from("workspaces")
    .select("billing_plan, card_on_file, free_records_used")
    .eq("id", workspaceId)
    .maybeSingle();
  const row = (data ?? {}) as {
    billing_plan?: string | null;
    card_on_file?: boolean | null;
    free_records_used?: number | null;
  };
  return {
    plan: row.billing_plan ?? "free",
    cardOnFile: Boolean(row.card_on_file),
    freeRecordsUsed: row.free_records_used ?? 0,
  };
}

/** Throws a user-readable error when the Free tier does not allow the action. */
export async function assertFreeTierAllows(
  supabase: AnyClient,
  workspaceId: string,
  action: Parameters<typeof freeGate>[1],
): Promise<PlanContext> {
  const ctx = await planContext(supabase, workspaceId);
  const blocked = freeGate(ctx, action);
  if (blocked) throw new Error(blocked.message);
  return ctx;
}

/**
 * Counts Distress Feed records against the Free allowance. Only Free
 * workspaces without a card accrue usage — paid plans are metered by credits.
 */
export async function consumeFreeRecords(
  supabase: AnyClient,
  workspaceId: string,
  count: number,
  ctx?: PlanContext,
): Promise<void> {
  if (count <= 0) return;
  const plan = ctx ?? (await planContext(supabase, workspaceId));
  if (!needsCard(plan)) return;
  await supabase
    .from("workspaces")
    .update({ free_records_used: plan.freeRecordsUsed + count })
    .eq("id", workspaceId);
}
