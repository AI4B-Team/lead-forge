import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { SettingsShell } from "@/components/app/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, Circle, Download, Search, ShieldCheck, ShieldAlert, Clock, ArrowRight,
  Upload, Info,
} from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getComplianceState, importSuppression } from "@/lib/compliance.functions";
import { computeCompliance, removedCount } from "@/lib/compliance.shared";
import { parseCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/app/compliance")({
  head: () => ({ meta: [{ title: "Compliance Center — LeadTrace" }] }),
  component: Compliance,
});

function Compliance() {
  const { workspaceId } = useWorkspaceId();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const fetchState = useServerFn(getComplianceState);

  const { data, isLoading } = useQuery({
    queryKey: ["compliance-state", workspaceId],
    queryFn: () => fetchState({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const state = useMemo(
    () =>
      computeCompliance({
        brandStatus: data?.registration.brand_status ?? null,
        campaignStatus: data?.registration.campaign_status ?? null,
        stopHandling: true,
        replyDetection: true,
        lastScrubAt: data?.lastScrubAt ?? null,
        suppressionTotal: data?.suppression.total ?? 0,
      }),
    [data],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;
    return (data?.runs ?? []).filter(
      (r) =>
        (!q || r.job_name.toLowerCase().includes(q)) &&
        (range === "all" || new Date(r.created_at).getTime() >= cutoff),
    );
  }, [data, query, range]);

  const toneClass =
    state.tone === "success"
      ? { border: "border-success/30", bg: "bg-success/5", text: "text-success", chipBg: "bg-success/15" }
      : state.tone === "warn"
        ? { border: "border-warn/30", bg: "bg-warn/5", text: "text-warn", chipBg: "bg-warn/15" }
        : { border: "border-danger/30", bg: "bg-danger/5", text: "text-danger", chipBg: "bg-danger/15" };

  function exportAudit() {
    const header = [
      "scrub_date", "list", "provider", "provider_reference_id",
      "total", "clean", "dnc", "litigator", "removed",
    ];
    const lines = [header.join(",")].concat(
      rows.map((r) =>
        [
          new Date(r.created_at).toISOString(),
          `"${r.job_name.replace(/"/g, '""')}"`,
          r.provider,
          r.proof_ref,
          r.total,
          r.clean_count,
          r.dnc_count,
          r.litigator_count,
          removedCount(r),
        ].join(","),
      ),
    );
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrub-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <SettingsShell current="compliance">
      <PageHeader
        title="Compliance Center"
        description="Everything Needed To Keep Outreach Compliant."
      />

      {/* Single computed status banner — every surface reads the same state. */}
      <div className={`mb-6 rounded-2xl border ${toneClass.border} ${toneClass.bg} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass.chipBg} ${toneClass.text}`}>
              {state.tone === "success" ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Compliance Status
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-2xl font-black ${toneClass.text}`}>
                  {isLoading ? "Checking…" : state.label}
                </span>
                <span className="font-display text-lg font-bold text-foreground">{state.score}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Computed Live From Your Workspace
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {state.checks.map((c) => (
            <span
              key={c.label}
              title={c.detail}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                c.ok ? "border-success/30 bg-background text-foreground" : "border-warn/40 bg-background text-warn"
              }`}
            >
              {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Circle className="h-3.5 w-3.5" />}
              {c.label}
            </span>
          ))}
        </div>
        {state.affecting.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <span className="font-semibold text-foreground">What's Affecting This Score:</span>{" "}
              {state.affecting.join(" · ")}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-display">Texting Brand (10DLC)</CardTitle>
              <Badge
                variant="outline"
                className={
                  state.tenDlcTone === "success"
                    ? "border-success/30 text-success"
                    : state.tenDlcTone === "warn"
                      ? "border-warn/40 text-warn"
                      : "text-muted-foreground"
                }
              >
                {state.tenDlcLabel}
              </Badge>
            </div>
            <span className="font-display text-sm font-bold text-foreground">
              {state.registrationPct}% Complete
            </span>
          </CardHeader>
          <CardContent>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${state.stage === "live" ? "bg-success" : "bg-warn"}`}
                style={{ width: `${state.registrationPct}%` }}
              />
            </div>
            <ol className="space-y-0">
              {state.registrationSteps.map((r, i) => (
                <li key={r.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {r.done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    {i < state.registrationSteps.length - 1 && (
                      <span
                        className={`w-px flex-1 ${r.done ? "bg-success/40" : "bg-border"}`}
                        style={{ minHeight: 22 }}
                      />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className={`text-sm font-medium ${r.done ? "text-foreground" : "text-muted-foreground"}`}>
                      {r.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.note}</div>
                  </div>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-2 rounded-full">
              <Link to="/app/registration">
                {state.stage === "live" ? "View Registration" : "Complete 10DLC"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Global Suppression</CardTitle>
            <SuppressionImport workspaceId={workspaceId} />
          </CardHeader>
          <CardContent>
            <div className="font-display text-5xl font-black leading-none text-foreground">
              {(data?.suppression.total ?? 0).toLocaleString()}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">Across Every Campaign</div>
            <div className="my-5 h-px bg-border" />
            <div className="grid grid-cols-3 gap-3">
              <SupChip label="Opt-Out" value={data?.suppression.opt_out ?? 0} tone="danger" />
              <SupChip label="DNC" value={data?.suppression.dnc ?? 0} tone="warn" />
              <SupChip label="Manual" value={data?.suppression.manual ?? 0} tone="muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-base font-display">Scrub Audit History</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Every Scrub Is Permanently Logged For Proof Of Compliance.
              <br />
              Total = Clean + DNC + Litigator + Removed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Lists"
                className="h-9 w-48 rounded-full pl-8"
              />
            </div>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-9 w-[150px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full"
              onClick={exportAudit}
              disabled={rows.length === 0}
            >
              <Download className="mr-1 h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="p-4">Date</th>
                <th className="p-4">List</th>
                <th className="p-4">Total</th>
                <th className="p-4">Clean / DNC / Litigator</th>
                <th className="p-4">Removed</th>
                <th className="p-4">Proof</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="p-4 text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="p-4 font-medium text-foreground">{a.job_name}</td>
                  <td className="p-4">{a.total.toLocaleString()}</td>
                  <td className="p-4">
                    <span className="text-success">{a.clean_count}</span> /{" "}
                    <span className="text-warn">{a.dnc_count}</span> /{" "}
                    <span className="text-danger">{a.litigator_count}</span>
                  </td>
                  <td className="p-4 text-muted-foreground">{removedCount(a).toLocaleString()}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="gap-1 border-success/30 text-success">
                      <ShieldCheck className="h-3.5 w-3.5" /> {a.proof_ref}
                    </Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    {isLoading ? "Loading Scrub History…" : "No Scrub Runs Match That Search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      </SettingsShell>
    </div>
  );
}

/** Manual entry + CSV upload into the manual suppression list (spec §21). */
function SuppressionImport({ workspaceId }: { workspaceId: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const run = useServerFn(importSuppression);

  const mutation = useMutation({
    mutationFn: (phones: string[]) =>
      run({ data: { workspaceId: workspaceId!, phones, reason: "manual" } }),
    onSuccess: (res) => {
      toast.success(`Imported ${res.imported} Suppressed Number${res.imported === 1 ? "" : "s"}.`);
      setText("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["compliance-state", workspaceId] });
    },
    onError: () => toast.error("Import Failed. Check The Numbers And Try Again."),
  });

  function submit(raw: string) {
    const phones = raw.split(/[\s,;]+/).filter(Boolean);
    if (phones.length === 0) {
      toast.error("Add At Least One Phone Number.");
      return;
    }
    mutation.mutate(phones);
  }

  async function onFile(file: File) {
    const rows = parseCsv(await file.text());
    const phones = rows.flat().filter((v) => v.replace(/\D/g, "").length >= 10);
    if (phones.length === 0) {
      toast.error("No Phone Numbers Found In That File.");
      return;
    }
    mutation.mutate(phones);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-full" disabled={!workspaceId}>
          <Upload className="mr-1 h-3.5 w-3.5" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Suppression List</DialogTitle>
          <DialogDescription>
            Bring Your Existing Opt-Outs Over On Day One So They Are Never Texted Again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste Phone Numbers — One Per Line Or Comma Separated"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-primary hover:underline">
              <Upload className="h-3.5 w-3.5" /> Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
            </label>
            <Button
              className="rounded-full"
              onClick={() => submit(text)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Importing…" : "Add To Suppression"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SupChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warn" | "muted";
}) {
  const styles =
    tone === "success"
      ? "border-success/30 bg-success/5 text-success"
      : tone === "warn"
        ? "border-warn/30 bg-warn/5 text-warn"
        : "border-border bg-surface-muted text-muted-foreground";
  return (
    <div className={`rounded-xl border px-3 py-3 ${styles}`}>
      <div className="font-display text-2xl font-black leading-none">{value.toLocaleString()}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</div>
    </div>
  );
}
