import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";

export type CreditKind = "scrape" | "skip_trace" | "sms";
export type CreditBalances = Record<CreditKind, number>;

const ZERO: CreditBalances = { scrape: 0, skip_trace: 0, sms: 0 };

/**
 * Live credit balances for the current workspace. Used wherever a cost estimate
 * has to be shown against what the workspace can actually afford.
 */
export function useCreditBalances() {
  const { workspaceId } = useWorkspaceId();
  const [balances, setBalances] = useState<CreditBalances>(ZERO);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("credit_balances")
        .select("kind, balance")
        .eq("workspace_id", workspaceId);
      if (!active) return;
      const next: CreditBalances = { ...ZERO };
      for (const row of (data ?? []) as Array<{ kind: CreditKind; balance: number }>) {
        if (row.kind in next) next[row.kind] = Number(row.balance ?? 0);
      }
      setBalances(next);
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  return { balances, loaded };
}
