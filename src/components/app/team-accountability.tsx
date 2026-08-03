/**
 * Internal accountability surfaces: who spent, who exported, and what each
 * member costs. Deliberately separate from /app/compliance — that log is the
 * clean legal record of opt-outs and sends, this one is management reporting.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle, Coins, Download, Gauge, Lock, Search, ShieldCheck, TrendingUp, UserMinus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  attributedAudit, decideApproval, listApprovals, memberCostReport, setMemberLimits,
} from "@/lib/accountability.functions";
import type { MemberCostRow } from "@/lib/accountability.shared";
import { TEAM_CONTROLS_UPSELL } from "@/lib/team-roles.shared";

const nf = (n: number) => n.toLocaleString();

function pct(used: number, cap: number | null) {
  if (!cap || cap <= 0) return null;
  return Math.min(100, Math.round((used / cap) * 100));
}

/** Plan-gated features render behind this so the value is visible, not hidden. */
function TeamGate({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (enabled) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40">{children}</div>
      <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/60 p-4 text-center">
        <div className="max-w-sm">
          <Lock className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Team Controls</p>
          <p className="mt-1 text-xs text-muted-foreground">{TEAM_CONTROLS_UPSELL}</p>
          <Button asChild size="sm" className="mt-3 rounded-full">
            <a href="/pricing">View Team Plans</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Per-member cost dashboard --------------------------------------------

export function MemberCostDashboard({ workspaceId }: { workspaceId: string }) {
  const fetchReport = useServerFn(memberCostReport);
  const { data, isLoading } = useQuery({
    queryKey: ["member-costs", workspaceId],
    queryFn: () => fetchReport({ data: { workspaceId } }),
    enabled: !!workspaceId,
  });
  const rows = (data?.rows ?? []) as MemberCostRow[];
  const enforced = data?.teamControls ?? false;
  const [limitTarget, setLimitTarget] = useState<MemberCostRow | null>(null);

  const totals = useMemo(
    () => ({
      credits: rows.reduce((s, r) => s + r.credits_this_month, 0),
      exportRows: rows.reduce((s, r) => s + r.export_rows_this_month, 0),
      flagged: rows.filter((r) => r.anomalies.length > 0).length,
    }),
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniTile icon={Coins} label="Credits Spent" value={nf(totals.credits)} hint="This Month, All Members" />
        <MiniTile icon={Download} label="Rows Exported" value={nf(totals.exportRows)} hint="This Month, All Members" />
        <MiniTile
          icon={AlertTriangle}
          label="Flagged Members"
          value={String(totals.flagged)}
          hint="Spend Or Export Spike vs Their Own Baseline"
          tone={totals.flagged > 0 ? "warn" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-display">Cost By Member</CardTitle>
          <span className="text-xs text-muted-foreground">This Month</span>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No Member Activity Yet.</p>
          )}
          {rows.map((r) => {
            const creditPct = pct(r.credits_this_month, r.limits.monthly_credit_cap);
            const exportPct = pct(r.export_rows_this_month, r.limits.monthly_export_row_cap);
            return (
              <div key={r.user_id} className="rounded-xl border border-border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{r.email || r.user_id.slice(0, 8)}</span>
                      <Badge variant="secondary" className="capitalize">{r.role}</Badge>
                      {r.anomalies.map((a) => (
                        <Tooltip key={a.kind}>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                              <AlertTriangle className="mr-1 h-3 w-3" /> {a.kind === "off_hours" ? "Off Hours" : "Spike"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{a.summary}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="tabular-nums">{nf(r.credits_this_month)} Credits</span>
                      <span className="tabular-nums">
                        {nf(r.export_rows_this_month)} Rows · {r.export_count_this_month} Exports
                      </span>
                      <span className="tabular-nums">{r.lists_built} Lists Built</span>
                      <span className="tabular-nums">{r.campaigns_launched} Campaigns</span>
                      {r.credits_prior_avg > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Baseline {nf(r.credits_prior_avg)}/mo
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setLimitTarget(r)}
                    disabled={!enforced}
                  >
                    <Gauge className="mr-1 h-3.5 w-3.5" /> Limits
                  </Button>
                </div>
                {(creditPct !== null || exportPct !== null) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {creditPct !== null && (
                      <CapBar label="Credit Cap" used={r.credits_this_month} cap={r.limits.monthly_credit_cap!} percent={creditPct} />
                    )}
                    {exportPct !== null && (
                      <CapBar label="Export Rows" used={r.export_rows_this_month} cap={r.limits.monthly_export_row_cap!} percent={exportPct} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!enforced && rows.length > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">{TEAM_CONTROLS_UPSELL}</p>
          )}
        </CardContent>
      </Card>

      <MemberLimitsDialog
        workspaceId={workspaceId}
        member={limitTarget}
        onClose={() => setLimitTarget(null)}
      />
    </div>
  );
}

function CapBar({ label, used, cap, percent }: { label: string; used: number; cap: number; percent: number }) {
  const tone = percent >= 100 ? "bg-destructive" : percent >= 80 ? "bg-amber-500" : "bg-primary";
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{nf(used)} / {nf(cap)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MiniTile({
  icon: Icon, label, value, hint, tone = "default",
}: { icon: any; label: string; value: string; hint: string; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone === "warn" ? "text-amber-500" : ""}`} /> {label}
      </div>
      <div className="mt-1 text-2xl font-display tabular-nums">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function MemberLimitsDialog({
  workspaceId, member, onClose,
}: { workspaceId: string; member: MemberCostRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(setMemberLimits);
  const [creditCap, setCreditCap] = useState("");
  const [exportCap, setExportCap] = useState("");
  const [creditThreshold, setCreditThreshold] = useState("");
  const [exportThreshold, setExportThreshold] = useState("");
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState<string | null>(null);

  if (member && seeded !== member.user_id) {
    setSeeded(member.user_id);
    setCreditCap(member.limits.monthly_credit_cap?.toString() ?? "");
    setExportCap(member.limits.monthly_export_row_cap?.toString() ?? "");
    setCreditThreshold(member.limits.approval_threshold_credits?.toString() ?? "");
    setExportThreshold(member.limits.export_approval_threshold_rows?.toString() ?? "");
  }

  const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.floor(Number(v) || 0)));

  const submit = async () => {
    if (!member) return;
    setBusy(true);
    try {
      await save({
        data: {
          workspaceId,
          userId: member.user_id,
          monthlyCreditCap: num(creditCap),
          monthlyExportRowCap: num(exportCap),
          approvalThresholdCredits: num(creditThreshold),
          exportApprovalThresholdRows: num(exportThreshold),
        },
      });
      toast.success("Limits Updated");
      qc.invalidateQueries({ queryKey: ["member-costs", workspaceId] });
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could Not Save Limits");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Limits For {member?.email}</DialogTitle>
          <DialogDescription>
            Leave A Field Blank For No Limit. Spends Over A Cap Are Blocked; Spends Over A Threshold Route To Admin Approval.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cap-credits">Monthly Credit Cap</Label>
            <Input id="cap-credits" inputMode="numeric" placeholder="No Limit" value={creditCap}
              onChange={(e) => setCreditCap(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cap-rows">Monthly Export Row Cap</Label>
            <Input id="cap-rows" inputMode="numeric" placeholder="No Limit" value={exportCap}
              onChange={(e) => setExportCap(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="thr-credits">Approval Above (Credits)</Label>
            <Input id="thr-credits" inputMode="numeric" placeholder="No Approval Needed" value={creditThreshold}
              onChange={(e) => setCreditThreshold(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="thr-rows">Approval Above (Export Rows)</Label>
            <Input id="thr-rows" inputMode="numeric" placeholder="No Approval Needed" value={exportThreshold}
              onChange={(e) => setExportThreshold(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="rounded-full">
            {busy ? "Saving…" : "Save Limits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Attributed audit log -------------------------------------------------

const KINDS = [
  { key: "all", label: "All" },
  { key: "credits", label: "Credits" },
  { key: "exports", label: "Exports" },
  { key: "actions", label: "Actions" },
] as const;

export function AttributionLog({
  workspaceId, members,
}: { workspaceId: string; members: Array<{ user_id: string; email: string }> }) {
  const fetchLog = useServerFn(attributedAudit);
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("all");
  const [actor, setActor] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["attribution-log", workspaceId, kind, actor],
    queryFn: () =>
      fetchLog({
        data: {
          workspaceId,
          kind,
          ...(actor === "all" ? {} : { actorUserId: actor }),
        },
      }),
    enabled: !!workspaceId,
  });

  const entries = (data?.entries ?? []).filter((e) =>
    q.trim() === ""
      ? true
      : `${e.actor} ${e.summary} ${e.detail ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Attributed Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Internal Accountability — Separate From The Compliance Record
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {KINDS.map((k) => (
              <Button
                key={k.key}
                size="sm"
                variant={kind === k.key ? "secondary" : "ghost"}
                className="rounded-full"
                onClick={() => setKind(k.key)}
              >
                {k.label}
              </Button>
            ))}
          </div>
          <Select value={actor} onValueChange={setActor}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Every Member" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Every Member</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.email || m.user_id.slice(0, 8)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Log" className="h-9 pl-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing Logged For This Filter.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2 last:border-0">
            <div className="min-w-0">
              <div className="text-sm">
                <span className="font-medium">{e.actor}</span>{" "}
                <span className="text-muted-foreground">{e.summary}</span>
              </div>
              {e.detail && <div className="truncate text-xs text-muted-foreground">{e.detail}</div>}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// --- Approvals queue ------------------------------------------------------

export function ApprovalsQueue({ workspaceId, enforced }: { workspaceId: string; enforced: boolean }) {
  const qc = useQueryClient();
  const fetchApprovals = useServerFn(listApprovals);
  const decide = useServerFn(decideApproval);
  const { data } = useQuery({
    queryKey: ["approvals", workspaceId],
    queryFn: () => fetchApprovals({ data: { workspaceId } }),
    enabled: !!workspaceId,
  });
  const requests = data?.requests ?? [];
  const isAdmin = data?.isAdmin ?? false;

  const act = async (id: string, decision: "approved" | "declined") => {
    try {
      await decide({ data: { workspaceId, requestId: id, decision } });
      toast.success(decision === "approved" ? "Approved" : "Declined");
      qc.invalidateQueries({ queryKey: ["approvals", workspaceId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could Not Record Decision");
    }
  };

  return (
    <TeamGate enabled={enforced}>
      <Card>
        <CardHeader><CardTitle className="text-base font-display">Approval Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requests.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing Waiting. Requests Land Here When A Spend Or Export Crosses A Threshold.
            </p>
          )}
          {requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{r.summary}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {r.requester} · {r.kind === "export" ? "Export" : "Credits"}
                  {r.amount ? ` · ${nf(r.amount)}` : ""} ·{" "}
                  {new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
              {r.status === "pending" ? (
                isAdmin ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => act(r.id, "declined")}>Decline</Button>
                    <Button size="sm" className="rounded-full" onClick={() => act(r.id, "approved")}>Approve</Button>
                  </div>
                ) : (
                  <Badge variant="outline">Awaiting Admin</Badge>
                )
              ) : (
                <Badge variant={r.status === "approved" ? "secondary" : "outline"} className="capitalize">{r.status}</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </TeamGate>
  );
}

// --- Seat control ---------------------------------------------------------

export function RevokeSeatButton({ onRevoke, email }: { onRevoke: () => void; email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <UserMinus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Revoke Seat</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke {email}'s Seat?</DialogTitle>
            <DialogDescription>
              Access Ends Immediately And Their Open Sessions Are Signed Out, So They Cannot Keep Spending Credits Or
              Exporting Data. Their Past Activity Stays In The Log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => { setOpen(false); onRevoke(); }}
            >
              Revoke Seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
