import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: balances }, { data: ledger }, { data: workspace }] = await Promise.all([
      supabase.from("credit_balances").select("*").eq("workspace_id", data.workspaceId),
      supabase.from("credit_ledger").select("*").eq("workspace_id", data.workspaceId).order("created_at", { ascending: false }).limit(50),
      supabase.from("workspaces").select("id, name, industry, created_at").eq("id", data.workspaceId).maybeSingle(),
    ]);
    const map: Record<string, number> = { scrape: 0, skip_trace: 0, sms: 0 };
    for (const b of balances ?? []) map[b.kind] = b.balance;
    return { balances: map, ledger: ledger ?? [], workspace };
  });

// Demo top-up: adds credits + writes a ledger row. In prod this fires after
// a successful Stripe/Paddle webhook.
export const topUpCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      kind: z.enum(["scrape", "skip_trace", "sms"]),
      amount: z.number().int().min(100).max(1_000_000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("credit_balances")
      .select("balance")
      .eq("workspace_id", data.workspaceId)
      .eq("kind", data.kind)
      .maybeSingle();
    const next = (existing?.balance ?? 0) + data.amount;
    const { error: upErr } = await supabase
      .from("credit_balances")
      .upsert({ workspace_id: data.workspaceId, kind: data.kind, balance: next }, { onConflict: "workspace_id,kind" });
    if (upErr) throw upErr;
    await supabase.from("credit_ledger").insert({
      workspace_id: data.workspaceId,
      kind: data.kind,
      delta: data.amount,
      reason: "top_up",
    });
    return { balance: next };
  });