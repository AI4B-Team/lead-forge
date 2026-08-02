import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Gauge, Gift, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PLANS,
  planTone,
  type CreditKind,
  type Plan,
  type WsRow,
} from "@/components/app/admin-shared";
import {
  grantCredits,
  listAllWorkspaces,
  setBillingPlan,
  setMonthlySmsCap,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/platform/workspaces")({
  head: () => ({
    meta: [
      { title: "Workspaces — LeadTrace Platform" },
      {
        name: "description",
        content: "Manage every workspace: plans, monthly caps, and credit grants.",
      },
    ],
  }),
  component: WorkspaceManagement,
});

function WorkspaceManagement() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllWorkspaces);
  const changePlan = useServerFn(setBillingPlan);
  const setCap = useServerFn(setMonthlySmsCap);
  const grant = useServerFn(grantCredits);

  const wsQ = useQuery({
    queryKey: ["admin-workspaces"],
    queryFn: () => fetchAll(),
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [capWs, setCapWs] = useState<WsRow | null>(null);
  const [capValue, setCapValue] = useState("");
  const [grantWs, setGrantWs] = useState<WsRow | null>(null);
  const [grantKind, setGrantKind] = useState<CreditKind>("sms");
  const [grantAmount, setGrantAmount] = useState("10000");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [sort, setSort] = useState<"usage" | "leads" | "name" | "created">("usage");

  const all = (wsQ.data?.workspaces ?? []) as WsRow[];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = all.filter((w) => {
      const plan = w.billing_plan ?? "trial";
      if (planFilter !== "all" && plan !== planFilter) return false;
      if (!q) return true;
      return w.name.toLowerCase().includes(q) || (w.owner_email ?? "").toLowerCase().includes(q);
    });
    return [...filtered].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "leads"
          ? b.stats.leads - a.stats.leads
          : sort === "created"
            ? new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
            : b.stats.sent_month - a.stats.sent_month,
    );
  }, [all, search, planFilter, sort]);

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
      if (raw !== "" && Number.isNaN(cap))
        throw new Error("Enter a whole number or leave blank for unlimited.");
      await setCap({ data: { workspaceId: capWs.id, cap } });
      toast.success(
        cap === null ? "Cap Removed — Unlimited." : `Cap Set → ${cap.toLocaleString()} / Mo.`,
      );
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

  const renderUsage = (w: WsRow) => {
    if (w.monthly_sms_cap == null) {
      return (
        <div className="text-xs">
          <div className="tabular-nums">{w.stats.sent_month.toLocaleString()}</div>
          <div className="text-muted-foreground">unlimited</div>
        </div>
      );
    }
    const pct =
      w.monthly_sms_cap === 0
        ? 100
        : Math.min(100, Math.round((w.stats.sent_month / w.monthly_sms_cap) * 100));
    const tone = pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-primary";
    return (
      <div className="w-32 text-xs">
        <div className="flex justify-between tabular-nums">
          <span>{w.stats.sent_month.toLocaleString()}</span>
          <span className="text-muted-foreground">/ {w.monthly_sms_cap.toLocaleString()}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Workspaces"
        description="Every Customer Workspace. Change Plans, Cap Monthly Usage, Grant Credits."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base font-display">All Workspaces</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing {rows.length.toLocaleString()} Of {all.length.toLocaleString()} Workspaces
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Workspace Or Owner"
                className="h-9 w-56 rounded-full pl-8"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 w-[130px] rounded-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {PLANS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="h-9 w-[150px] rounded-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usage">Sort By Usage</SelectItem>
                <SelectItem value="leads">Sort By Leads</SelectItem>
                <SelectItem value="created">Sort By Created</SelectItem>
                <SelectItem value="name">Sort By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead>SMS / Month</TableHead>
                <TableHead className="text-right">Numbers</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="w-[240px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wsQ.isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…
                  </TableCell>
                </TableRow>
              )}
              {rows.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    <div>{w.name}</div>
                    <div className="text-[10px] text-muted-foreground">{w.industry ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{w.owner_email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {w.created_at ? new Date(w.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{w.stats.leads}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.stats.sent}</TableCell>
                  <TableCell>{renderUsage(w)}</TableCell>
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
                        <SelectTrigger className="h-8 w-[110px] rounded-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANS.map((p) => (
                            <SelectItem key={p} value={p} className="capitalize">
                              {p.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Set monthly SMS cap"
                        onClick={() => {
                          setCapWs(w);
                          setCapValue(w.monthly_sms_cap == null ? "" : String(w.monthly_sms_cap));
                        }}
                      >
                        <Gauge className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Grant credits"
                        onClick={() => {
                          setGrantWs(w);
                          setGrantKind("sms");
                          setGrantAmount("10000");
                        }}
                      >
                        <Gift className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!wsQ.isLoading && !rows.length && (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                    No Workspaces Match Those Filters.
                  </TableCell>
                </TableRow>
              )}
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
              id="cap"
              inputMode="numeric"
              placeholder="e.g. 50000"
              value={capValue}
              onChange={(e) => setCapValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Campaigns automatically pause once this workspace hits {capValue || "the cap"}{" "}
              outbound messages this calendar month.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCapWs(null)}>
              Cancel
            </Button>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS Segments</SelectItem>
                  <SelectItem value="scrape">Lead Credits</SelectItem>
                  <SelectItem value="skip_trace">Skip Traces</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="amt">Amount</Label>
              <Input
                id="amt"
                inputMode="numeric"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Added to the workspace balance with a ledger entry (reason: admin_grant).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGrantWs(null)}>
              Cancel
            </Button>
            <Button onClick={submitGrant} disabled={busyId === grantWs?.id}>
              {busyId === grantWs?.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Grant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
