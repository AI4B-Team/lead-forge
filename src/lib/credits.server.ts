// Atomic credit movement. The ledger insert and the balance update MUST happen
// in one transaction, otherwise two concurrent runs can both read the same
// balance, both pass the check, and overdraft the workspace. public.apply_credit_delta
// row-locks the balance, rejects an overdraft, and writes the ledger row.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CreditKind = string;

export async function applyCreditDelta(
  supabase: SupabaseClient<Database>,
  args: {
    workspaceId: string;
    kind: CreditKind;
    delta: number; // negative = debit, positive = refund/grant
    reason: string;
    jobId?: string | null;
    actorUserId?: string | null;
  },
): Promise<number> {
  const { data, error } = await supabase.rpc("apply_credit_delta", {
    _workspace_id: args.workspaceId,
    _kind: args.kind,
    _delta: args.delta,
    _reason: args.reason,
    _job_id: args.jobId ?? null,
    _actor_user_id: args.actorUserId ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
