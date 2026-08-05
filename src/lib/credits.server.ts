// Atomic credit movement. The ledger insert and the balance update MUST happen
// in one transaction, otherwise two concurrent runs can both read the same
// balance, both pass the check, and overdraft the workspace. public.apply_credit_delta
// row-locks the balance, rejects an overdraft, and writes the ledger row.

export type CreditKind = string;

export async function applyCreditDelta(
  // Kept for call-site compatibility; the RPC always runs with the service
  // role so EXECUTE can stay revoked from anon/authenticated.
  _supabase: unknown,
  args: {
    workspaceId: string;
    kind: CreditKind;
    delta: number; // negative = debit, positive = refund/grant
    reason: string;
    jobId?: string | null;
    actorUserId?: string | null;
  },
): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("apply_credit_delta", {
    _workspace_id: args.workspaceId,
    _kind: args.kind,
    _delta: args.delta,
    _reason: args.reason,
    _job_id: args.jobId ?? undefined,
    _actor_user_id: args.actorUserId ?? undefined,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
