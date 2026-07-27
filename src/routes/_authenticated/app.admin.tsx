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
import { ShieldAlert, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listAllWorkspaces, setBillingPlan, listSuperAdmins, revokeSuperAdmin, meIsSuperAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({ meta: [{ title: "Super Admin — LeadTrace" }] }),
  component: AdminPage,
});

const PLANS = ["trial", "paid", "comped", "past_due"] as const;
type Plan = typeof PLANS[number];

function AdminPage() {
  const qc = useQueryClient();
  const fetchIsAdmin = useServerFn(meIsSuperAdmin);
  const fetchAll = useServerFn(listAllWorkspaces);
  const changePlan = useServerFn(setBillingPlan);
  const fetchAdmins = useServerFn(listSuperAdmins);
  const revoke = useServerFn(revokeSuperAdmin);

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

  return (
    <div>
      <PageHeader
        title="Super Admin"
        description="Manage Every Workspace On The Platform. Grant Comped Accounts. Adjust Billing."
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
                <TableHead>Industry</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Numbers</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="w-[180px]">Set Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wsQ.data?.workspaces.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{w.owner_email}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{w.industry ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.stats.leads}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.stats.sent}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.stats.numbers}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={planTone(w.billing_plan ?? "trial")}>
                      {w.billing_plan ?? "trial"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={w.billing_plan ?? "trial"}
                      onValueChange={(v) => updatePlan(w.id, v as Plan)}
                      disabled={busyId === w.id}
                    >
                      <SelectTrigger className="h-8 rounded-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANS.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">{p.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
    </div>
  );
}