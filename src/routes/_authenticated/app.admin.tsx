import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2, Trash2, Gift, Gauge } from "lucide-react";
import { toast } from "sonner";
import {
  listAllWorkspaces, setBillingPlan, listSuperAdmins, revokeSuperAdmin,
  meIsSuperAdmin, setMonthlySmsCap, grantCredits,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({ meta: [{ title: "Super Admin — LeadTrace" }] }),
  component: AdminPage,
});

const PLANS = ["trial", "paid", "comped", "past_due"] as const;
type Plan = typeof PLANS[number];
type CreditKind = "scrape" | "skip_trace" | "sms";
type WsRow = {
  id: string; name: string; industry: string | null;
  billing_plan: string | null; monthly_sms_cap: number | null;
  owner_email: string;
  stats: { leads: number; sent: number; sent_month: number; numbers: number };
};

function AdminPage() {
  const qc = useQueryClient();
  const fetchIsAdmin = useServerFn(meIsSuperAdmin);
  const fetchAll = useServerFn(listAllWorkspaces);
  const changePlan = useServerFn(setBillingPlan);
  const fetchAdmins = useServerFn(listSuperAdmins);
  const revoke = useServerFn(revokeSuperAdmin);
  const setCap = useServerFn(setMonthlySmsCap);
  const grant = useServerFn(grantCredits);

  const gate = useQuery({ queryKey: ["me-is-super-admin"], queryFn: () => fetchIsAdmin() });
  const wsQ = useQuery({
    queryKey: ["admin-workspaces"],
    queryFn: () => fetchAll(),
    enabled: gate.data?.isSuperAdmin === true,
  });
  const adminsQ = useQuery({
    queryKey: ["admin-super-admins"],
    queryFn: () => fetchAdmins(),
    enabled: gate.data?.isSuperAdmin === true,
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [capWs, setCapWs] = useState<WsRow | null>(null);
  const [capValue, setCapValue] = useState<string>("");
  const [grantWs, setGrantWs] = useState<WsRow | null>(null);
  const [grantKind, setGrantKind] = useState<CreditKind>("sms");
  const [grantAmount, setGrantAmount] = useState<string>("10000");

  const updatePlan = async (workspaceId: string, plan: Plan) => {
    setBusyId(workspaceId);
    try {
      await changePlan({ data: { workspaceId, plan } });
      toast.success(`Plan Updated → ${plan}`);
      qc.invalidateQueries({ queryKey: ["admin-workspaces"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusyId(null);
    }
  };

  const submitCap = async () => {
    if (!capWs) return;
    setBusyId(capWs.id);
    try {
      const raw = capValue.trim();
      const cap = raw === "" ? null : Math.max(0, parseInt(raw, 10));
      if (raw !== "" && Number.isNaN(cap)) throw new Error("Enter a whole number or leave blank for unlimited.");
      await setCap({ data: { workspaceId: capWs.id, cap } });
      toast.success(cap === null ? "Cap Removed — Unlimited." : `Cap Set → ${cap.toLocaleString()} / Mo.`);
      qc.invalidateQueries({ queryKey: ["admin-workspaces"] });
      setCapWs(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusyId(null);
    }
  };

  const submitGrant = async () => {
    if (!grantWs) return;
    const amount = parseInt(grantAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a positive amount.");
    setBusyId(grantWs.id);
    try {
      await grant({ data: { workspaceId: grantWs.id, kind: grantKind, amount } });
      toast.success(`Granted ${amount.toLocaleString()} ${grantKind.replace("_", " ")} credits.`);
      qc.invalidateQueries({ queryKey: ["admin-workspaces"] });
      setGrantWs(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusyId(null);
    }
  };

  const revokeAdmin = async (userId: string) => {
    setBusyId(userId);
    try {
      await revoke({ data: { userId } });
      toast.success("Revoked.");
      qc.invalidateQueries({ queryKey: ["admin-super-admins"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (gate.isLoading) {
    return <div className="p-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Loading…</div>;
  }
  if (!gate.data?.isSuperAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-danger" /> Access Denied</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Only Super Admins Can Access This Console.</CardContent>
        </Card>
      </div>
    );
  }

  const planTone = (p: string) =>
    p === "comped" ? "bg-primary/10 text-primary border-primary/20" :
    p === "paid" ? "bg-success/10 text-success border-success/20" :
    p === "past_due" ? "bg-danger/10 text-danger border-danger/20" :
    "bg-muted text-muted-foreground border-border";

  const renderUsage = (w: WsRow) => {
    if (w.monthly_sms_cap == null) {
      return (
        <div className="text-xs">
          <div className="tabular-nums">{w.stats.sent_month.toLocaleString()}</div>
          <div className="text-muted-foreground">unlimited</div>
        </div>
      );
    }
    const pct = w.monthly_sms_cap === 0 ? 100 : Math.min(100, Math.round((w.stats.sent_month / w.monthly_sms_cap) * 100));
    const tone = pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-primary";
    return (
      <div className="text-xs w-32">
        <div className="flex justify-between tabular-nums">
          <span>{w.stats.sent_month.toLocaleString()}</span>
          <span className="text-muted-foreground">/ {w.monthly_sms_cap.toLocaleString()}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
          <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Super Admin"
        description="Manage Every Workspace. Comp Accounts. Grant Credits. Cap Monthly Usage."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-display">All Workspaces</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead>SMS / Month</TableHead>
                <TableHead className="text-right">Numbers</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="w-[240px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wsQ.data?.workspaces.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    <div>{w.name}</div>
                    <div className="text-[10px] text-muted-foreground">{w.industry ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{w.owner_email}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.stats.leads}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.stats.sent}</TableCell>
                  <TableCell>{renderUsage(w as WsRow)}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.stats.numbers}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={planTone(w.billing_plan ?? "trial")}>
                      {w.billing_plan ?? "trial"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Select
                        value={w.billing_plan ?? "trial"}
                        onValueChange={(v) => updatePlan(w.id, v as Plan)}
                        disabled={busyId === w.id}
                      >
                        <SelectTrigger className="h-8 rounded-full text-xs w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANS.map((p) => (
                            <SelectItem key={p} value={p} className="capitalize">{p.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm" variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Set monthly SMS cap"
                        onClick={() => {
                          setCapWs(w as WsRow);
                          setCapValue(w.monthly_sms_cap == null ? "" : String(w.monthly_sms_cap));
                        }}
                      >
                        <Gauge className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Grant credits"
                        onClick={() => { setGrantWs(w as WsRow); setGrantKind("sms"); setGrantAmount("10000"); }}
                      >
                        <Gift className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!wsQ.data?.workspaces.length && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No Workspaces.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" /> Super Admins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-3">
            Comp Accounts + Full Platform Access. Contact Support To Add A New Super Admin.
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminsQ.data?.admins.map((a) => (
                <TableRow key={a.user_id}>
                  <TableCell className="font-medium">
                    {a.email} {a.is_me && <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {!a.is_me && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeAdmin(a.user_id)}
                        disabled={busyId === a.user_id}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        {busyId === a.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!capWs} onOpenChange={(o) => !o && setCapWs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Monthly SMS Cap — {capWs?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <Label htmlFor="cap">Cap (leave blank for unlimited)</Label>
            <Input
              id="cap" inputMode="numeric" placeholder="e.g. 50000"
              value={capValue} onChange={(e) => setCapValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Campaigns automatically pause once this workspace hits {capValue || "the cap"} outbound messages this calendar month.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCapWs(null)}>Cancel</Button>
            <Button onClick={submitCap} disabled={busyId === capWs?.id}>
              {busyId === capWs?.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Cap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!grantWs} onOpenChange={(o) => !o && setGrantWs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Credits — {grantWs?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Credit Type</Label>
              <Select value={grantKind} onValueChange={(v) => setGrantKind(v as CreditKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS Segments</SelectItem>
                  <SelectItem value="scrape">Scrape Records</SelectItem>
                  <SelectItem value="skip_trace">Skip Traces</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="amt">Amount</Label>
              <Input
                id="amt" inputMode="numeric"
                value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Added to the workspace balance with a ledger entry (reason: admin_grant).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGrantWs(null)}>Cancel</Button>
            <Button onClick={submitGrant} disabled={busyId === grantWs?.id}>
              {busyId === grantWs?.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Grant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}