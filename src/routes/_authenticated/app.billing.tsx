import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { SettingsShell } from "@/components/app/settings-shell";
import { StatTile } from "@/components/app/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getBilling, topUpCredits } from "@/lib/billing.functions";

type CreditKind = "scrape" | "skip_trace" | "sms";

const CREDIT_META: Record<CreditKind, { label: string; rate: string; presets: number[] }> = {
  scrape: { label: "Lead Credits", rate: "$3 / 1,000 Records", presets: [1000, 5000, 25000] },
  skip_trace: { label: "Skip Trace", rate: "$8 / 1,000 Traces", presets: [500, 2500, 10000] },
  sms: { label: "SMS", rate: "$0.008 / Segment", presets: [1000, 10000, 50000] },
};

export const Route = createFileRoute("/_authenticated/app/billing")({
  head: () => ({ meta: [{ title: "Billing — LeadTrace" }] }),
  component: Billing,
});

function Billing() {
  const { workspaceId } = useWorkspaceId();
  const fetchBilling = useServerFn(getBilling);
  const runTopUp = useServerFn(topUpCredits);
  const qc = useQueryClient();
  const [topUpKind, setTopUpKind] = useState<CreditKind | null>(null);

  const { data } = useQuery({
    queryKey: ["billing", workspaceId],
    queryFn: () => fetchBilling({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const mutate = useMutation({
    mutationFn: (input: { kind: CreditKind; amount: number }) =>
      runTopUp({ data: { workspaceId: workspaceId!, ...input } }),
    onSuccess: () => {
      toast.success("Credits Added");
      qc.invalidateQueries({ queryKey: ["billing", workspaceId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setTopUpKind(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balances = data?.balances;
  const totalCredits =
    (balances?.scrape ?? 0) + (balances?.skip_trace ?? 0) + (balances?.sms ?? 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthLedger = (data?.ledger ?? []).filter(
    (r) => new Date(r.created_at) >= monthStart && r.delta < 0,
  );
  const usedThisMonth = monthLedger.reduce((sum, r) => sum + Math.abs(r.delta), 0);
  const usageByKind = monthLedger.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + Math.abs(r.delta);
    return acc;
  }, {});
  const renewDate = new Date(monthStart);
  renewDate.setMonth(renewDate.getMonth() + 1);
  const renewLabel = renewDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-[1400px]">
      <SettingsShell current="billing">
      <PageHeader title="Billing" description="Plan, Metered Credits, And Recent Activity." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Current Plan" value="Trial" hint="Pay-As-You-Go Credits" />
        <StatTile
          label="Total Credits"
          value={totalCredits.toLocaleString()}
          hint="Lead Credits + Skip Trace + SMS"
        />
        <StatTile label="Renews" value={renewLabel} hint="Auto-Renew Enabled" />
        <StatTile
          label="Used This Month"
          value={usedThisMonth.toLocaleString()}
          hint={`${data?.ledger.length ?? 0} Ledger Entries`}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-display">Current Plan</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              {data?.workspace?.name ?? "Workspace"} · Trial · Pay-As-You-Go Credits
            </div>
          </div>
          <Badge>Trial</Badge>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" className="rounded-full" disabled>Upgrade Plan</Button>
          <Button variant="ghost" className="rounded-full text-muted-foreground" disabled>Cancel</Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {(Object.keys(CREDIT_META) as CreditKind[]).map((k) => (
          <CreditCard
            key={k}
            label={CREDIT_META[k].label}
            balance={data?.balances[k] ?? 0}
            rate={CREDIT_META[k].rate}
            onTopUp={() => setTopUpKind(k)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.ledger.length ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No credit activity yet. Run a job or top up to see entries here.
            </div>
          ) : (
            <div className="divide-y">
              {data.ledger.map((row) => (
                <div key={row.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium capitalize">
                      {row.kind.replace("_", " ")} · {row.reason ?? "usage"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={`font-mono font-semibold ${row.delta >= 0 ? "text-success" : "text-foreground"}`}>
                    {row.delta >= 0 ? "+" : ""}
                    {row.delta.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="grid h-9 w-12 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider">
                  Card
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">No Card On File</div>
                  <div className="text-xs text-muted-foreground">Add One Before Your Trial Ends</div>
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-full" disabled>
                Add Payment Method
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Invoices Appear Here After Your First Paid Cycle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Usage This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(CREDIT_META) as CreditKind[]).map((k) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{CREDIT_META[k].label}</span>
                  <span className="font-display font-bold tabular-nums">
                    {(usageByKind[k] ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <TopUpDialog
        kind={topUpKind}
        onClose={() => setTopUpKind(null)}
        onConfirm={(amount) => topUpKind && mutate.mutate({ kind: topUpKind, amount })}
        pending={mutate.isPending}
      />
      </SettingsShell>
    </div>
  );
}

function CreditCard({
  label,
  balance,
  rate,
  onTopUp,
}: {
  label: string;
  balance: number;
  rate: string;
  onTopUp: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className="mt-2 font-display text-3xl font-black text-foreground">{balance.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground mt-1">{rate}</div>
        <Button className="w-full rounded-full mt-4" onClick={onTopUp}>
          Top Up
        </Button>
      </CardContent>
    </Card>
  );
}

function TopUpDialog({
  kind,
  onClose,
  onConfirm,
  pending,
}: {
  kind: CreditKind | null;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  pending: boolean;
}) {
  const [amount, setAmount] = useState<number>(1000);
  if (!kind) return null;
  const meta = CREDIT_META[kind];
  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Top Up {meta.label} Credits</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {meta.presets.map((p) => (
              <Button
                key={p}
                type="button"
                variant={amount === p ? "default" : "outline"}
                className="rounded-full flex-1"
                onClick={() => setAmount(p)}
              >
                {p.toLocaleString()}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="custom">Custom Amount</Label>
            <Input
              id="custom"
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(Math.max(100, Number(e.target.value) || 0))}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Demo mode: credits are added instantly. Real billing wires to your payment provider.
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(amount)} disabled={pending}>
            {pending ? "Adding…" : `Add ${amount.toLocaleString()} Credits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}