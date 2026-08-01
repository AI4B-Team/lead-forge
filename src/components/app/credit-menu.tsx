import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Zap, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";

type Kind = "scrape" | "skip_trace" | "sms";
type Credits = Record<Kind, number>;

const ZERO: Credits = { scrape: 0, skip_trace: 0, sms: 0 };
const LABELS: Array<{ kind: Kind; label: string }> = [
  { kind: "scrape", label: "Lead Credits" },
  { kind: "skip_trace", label: "Skip Trace" },
  { kind: "sms", label: "SMS Credits" },
];

/**
 * Global credit indicator. Credits live in the header on every screen so the
 * dashboard can stay focused on operational insight instead of accounting.
 */
export function CreditMenu() {
  const { workspaceId } = useWorkspaceId();
  const [balances, setBalances] = useState<Credits>(ZERO);
  const [allowance, setAllowance] = useState<Credits>(ZERO);
  const [autoRecharge, setAutoRecharge] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("lt.auto_recharge") : null;
    if (stored) setAutoRecharge(stored === "1");
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    (async () => {
      const [balRes, ledgerRes] = await Promise.all([
        supabase.from("credit_balances").select("kind, balance").eq("workspace_id", workspaceId),
        supabase.from("credit_ledger").select("kind, delta").eq("workspace_id", workspaceId).gt("delta", 0),
      ]);
      if (!active) return;
      const bal: Credits = { ...ZERO };
      for (const row of (balRes.data ?? []) as Array<{ kind: Kind; balance: number }>) {
        if (row.kind in bal) bal[row.kind] = row.balance;
      }
      const totals: Credits = { ...ZERO };
      for (const row of (ledgerRes.data ?? []) as Array<{ kind: Kind; delta: number }>) {
        if (row.kind in totals) totals[row.kind] += Number(row.delta ?? 0);
      }
      for (const k of Object.keys(totals) as Kind[]) totals[k] = Math.max(totals[k], bal[k]);
      setBalances(bal);
      setAllowance(totals);
    })();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  const total = balances.scrape + balances.skip_trace + balances.sms;

  function toggleRecharge(next: boolean) {
    setAutoRecharge(next);
    if (typeof window !== "undefined") window.localStorage.setItem("lt.auto_recharge", next ? "1" : "0");
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour="credits"
          aria-label="Credits"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
        >
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="tabular-nums">{total.toLocaleString()}</span>
          <span className="hidden sm:inline text-muted-foreground">Credits</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Credit Balance
          </div>
          <div className="font-display text-sm font-bold tabular-nums">{total.toLocaleString()}</div>
        </div>
        <div className="mt-3 space-y-3">
          {LABELS.map(({ kind, label }) => {
            const value = balances[kind];
            const max = Math.max(value, allowance[kind], 1);
            return (
              <div key={kind}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {value.toLocaleString()} / {max.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <Button asChild className="mt-4 w-full rounded-full">
          <Link to="/app/billing">Buy More Credits</Link>
        </Button>
        <Separator className="my-3" />
        <Link
          to="/app/billing"
          className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-foreground hover:bg-surface-muted"
        >
          <Receipt className="h-4 w-4 text-muted-foreground" /> Billing History
        </Link>
        <div className="mt-1 flex items-center justify-between rounded-lg px-1 py-1.5">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <RefreshCw className="h-4 w-4 text-muted-foreground" /> Auto Recharge
          </span>
          <Switch checked={autoRecharge} onCheckedChange={toggleRecharge} aria-label="Auto Recharge" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
