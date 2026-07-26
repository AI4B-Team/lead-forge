import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listNumbers, buyNumbers, getRegistration } from "@/lib/numbers.functions";

export const Route = createFileRoute("/_authenticated/app/numbers")({
  head: () => ({ meta: [{ title: "Numbers — LeadTrace" }] }),
  component: Numbers,
});

type Region = "east" | "central" | "mountain" | "west";

function Numbers() {
  const { workspaceId } = useWorkspaceId();
  const list = useServerFn(listNumbers);
  const buy = useServerFn(buyNumbers);
  const reg = useServerFn(getRegistration);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["numbers", workspaceId],
    queryFn: () => list({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const { data: regData } = useQuery({
    queryKey: ["registration", workspaceId],
    queryFn: () => reg({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<Region>("east");
  const [qty, setQty] = useState(3);
  const [busy, setBusy] = useState(false);

  if (isLoading || !data) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading Numbers…</div>;
  }

  const numbers = data.rows;
  const active = numbers.filter((n) => n.status === "active").length;
  const avg = numbers.length
    ? Math.round(numbers.reduce((a, n) => a + (n.health_score ?? 0), 0) / numbers.length)
    : 0;
  const flagged = numbers.filter((n) => (n.optout_rate ?? 0) > 5).length;
  const campaignApproved = regData?.registration?.campaign_status === "approved";

  const submit = async () => {
    if (!workspaceId) return;
    setBusy(true);
    try {
      const res = await buy({ data: { workspaceId, region, quantity: qty } });
      toast.success(`Added ${res.added} Number${res.added === 1 ? "" : "s"} To ${region.toUpperCase()} Pool.`);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["numbers", workspaceId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Number Pool"
        description="Geo-Matched By Region. Auto-Retirement When Opt-Out Rate Climbs."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Buy Numbers</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Buy Numbers Into A Region</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Region</Label>
                  <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="east">East</SelectItem>
                      <SelectItem value="central">Central</SelectItem>
                      <SelectItem value="mountain">Mountain</SelectItem>
                      <SelectItem value="west">West</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={busy} className="rounded-full">
                  {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Provision Numbers
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {!campaignApproved && (
        <div className="mb-6 rounded-2xl border border-warn/30 bg-warn/5 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-display font-bold text-foreground">10DLC Registration Required Before Sending</div>
            <div className="text-sm text-muted-foreground">Numbers Can Be Purchased, But Sends Are Blocked Server-Side Until Your A2P Campaign Is Approved.</div>
          </div>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/app/registration">Start 10DLC</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Numbers" value={numbers.length.toString()} />
        <StatCard label="Active" value={active.toString()} />
        <StatCard label="Avg Health" value={numbers.length ? `${avg}/100` : "—"} tone="success" />
      </div>
      {flagged > 0 && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {flagged} Number{flagged === 1 ? "" : "s"} Above 5% Opt-Out Rate — Auto-Flagged For Cooling.
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          {numbers.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No Numbers Yet. Buy Your First Pool To Start Warming Up.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="p-4">Phone</th>
                  <th className="p-4">Region</th>
                  <th className="p-4">Health</th>
                  <th className="p-4">Opt-Out Rate</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((n) => {
                  const health = n.health_score ?? 0;
                  const optout = n.optout_rate ?? 0;
                  const status = optout > 5 ? "cooling" : (n.status ?? "active");
                  return (
                    <tr key={n.id} className="border-b border-border last:border-0">
                      <td className="p-4 font-medium text-foreground">{n.phone}</td>
                      <td className="p-4 text-muted-foreground capitalize">{n.region ?? "—"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${health > 80 ? "bg-success" : health > 60 ? "bg-warn" : "bg-danger"}`} style={{ width: `${health}%` }} />
                          </div>
                          <span className="text-foreground">{health}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{optout.toFixed(1)}%</td>
                      <td className="p-4">
                        <Badge variant="outline" className={
                          status === "active" ? "bg-success/10 text-success border-success/20" :
                          status === "cooling" ? "bg-warn/10 text-warn border-warn/20" :
                          "bg-danger/10 text-danger border-danger/20"
                        }>
                          {status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className={`mt-2 font-display text-3xl font-black ${tone === "success" ? "text-success" : "text-foreground"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}