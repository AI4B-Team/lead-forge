import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Search,
  Repeat,
  ChevronRight,
  Landmark,
  Building2,
  Upload,
  Sparkles,
  Layers,
  Users,
  ShieldCheck,
  Activity,
  CalendarClock,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { setJobSchedule } from "@/lib/monitoring.functions";
import { CADENCE_LABEL } from "@/lib/monitoring.shared";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listJobs } from "@/lib/jobs.functions";
import { JobStageFlow } from "@/components/app/job-stage-flow";
import { StatTile } from "@/components/app/stat-tile";
import type { JobStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/app/lists")({
  head: () => ({ meta: [{ title: "Jobs — LeadTrace" }] }),
  component: Jobs,
});

const SOURCE_META: Record<string, { label: string; icon: typeof Landmark }> = {
  business: { label: "Business Search", icon: Building2 },
  records: { label: "Public Records", icon: Landmark },
  upload: { label: "Upload", icon: Upload },
  assistant: { label: "AI Assistant", icon: Sparkles },
};

const RUNNING_STATUSES = new Set(["scraping", "scrubbing", "skiptracing", "enriching"]);

/** "Jul 31" / "Yesterday" plus a 12-hour time — far easier to scan than 7/31/2026. */
function formatCreated(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const day = (a: Date) => new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const diffDays = Math.round((day(now) - day(d)) / 86400000);
  const date =
    diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { date, time };
}

function Jobs() {
  const { workspaceId } = useWorkspaceId();
  const navigate = useNavigate();
  const fetchJobs = useServerFn(listJobs);
  const saveSchedule = useServerFn(setJobSchedule);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["jobs-list", workspaceId],
    queryFn: () => fetchJobs({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
    refetchInterval: 5000,
  });

  const [q, setQ] = useState("");
  const [source, setSource] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [range, setRange] = useState<string>("all");

  const rows = useMemo(() => {
    const jobs = data?.jobs ?? [];
    const needle = q.trim().toLowerCase();
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
    return jobs.filter((j) => {
      if (source !== "all" && j.source_type !== source) return false;
      if (status !== "all" && j.status !== status) return false;
      if (needle && !j.name.toLowerCase().includes(needle)) return false;
      if (cutoff && new Date(j.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [data, q, source, status, range]);

  const summary = useMemo(() => {
    const jobs = data?.jobs ?? [];
    let leads = 0;
    let clean = 0;
    let scrubbed = 0;
    let running = 0;
    let scheduled = 0;
    for (const j of jobs) {
      leads += j.rows_in ?? 0;
      clean += j.counts.clean;
      scrubbed += j.counts.clean + j.counts.dnc + j.counts.litigator;
      if (RUNNING_STATUSES.has(j.status ?? "")) running += 1;
      if (j.schedule && j.schedule !== "one_time") scheduled += 1;
    }
    return {
      total: jobs.length,
      leads,
      cleanRate: scrubbed ? Math.round((clean / scrubbed) * 100) : 0,
      running,
      scheduled,
    };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Every Pipeline You Have Run — Source, Scrub, Verification, And Results. Click A Row To Open The Job Overview."
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/new-job"><Plus className="mr-1 h-4 w-4" /> New Job</Link>
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Total Jobs" value={summary.total.toLocaleString()} icon={Layers} />
        <StatTile label="Total Leads" value={summary.leads.toLocaleString()} icon={Users} />
        <StatTile label="Clean Rate" value={`${summary.cleanRate}%`} icon={ShieldCheck} hint="Clean Of All Scrubbed" />
        <StatTile label="Running" value={summary.running.toLocaleString()} icon={Activity} />
        <StatTile label="Scheduled" value={summary.scheduled.toLocaleString()} icon={CalendarClock} hint="Recurring Rescans" />
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Jobs By Name, County, Or Niche…"
              className="h-11 pl-9 text-base"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-11 w-[170px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="business">Business Search</SelectItem>
              <SelectItem value="records">Public Records</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="scraping">Scraping</SelectItem>
              <SelectItem value="scrubbing">Scrubbing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-11 w-[150px]"><SelectValue placeholder="Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Date</SelectItem>
              <SelectItem value="1">Last 24 Hours</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-11 rounded-full"
            onClick={() => {
              setQ("");
              setSource("all");
              setStatus("all");
              setRange("all");
            }}
          >
            <SlidersHorizontal className="mr-1 h-4 w-4" /> Reset
          </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1150px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="p-4">Name</th>
                <th className="p-4">Source</th>
                <th className="p-4">Pipeline</th>
                <th className="whitespace-nowrap p-4">Clean / DNC / Litigator</th>
                <th className="p-4">Rescan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
                <th className="p-4 w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading Jobs…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No Jobs Match. <Link to="/app/new-job" className="text-primary underline">Start A New Job</Link>.
                </td></tr>
              )}
              {rows.map((j) => {
                const src = SOURCE_META[j.source_type] ?? { label: j.source_type, icon: Layers };
                const scrubbed = j.counts.clean + j.counts.dnc + j.counts.litigator;
                const created = formatCreated(j.created_at);
                return (
                <tr
                  key={j.id}
                  onClick={() => navigate({ to: "/app/jobs/$jobId", params: { jobId: j.id } })}
                  className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-muted"
                >
                  <td className="p-4">
                    <span className="whitespace-nowrap font-medium text-foreground group-hover:text-primary">{j.name}</span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                      <src.icon className="h-4 w-4 shrink-0" /> {src.label}
                    </span>
                  </td>
                  <td className="p-4">
                    <JobStageFlow
                      stages={{
                        found: j.rows_in ?? 0,
                        scrubbed,
                        verified: scrubbed,
                        skipTraced: j.counts.clean,
                        ready: j.counts.clean,
                      }}
                    />
                  </td>
                  <td className="whitespace-nowrap p-4 text-muted-foreground">
                    <span className="text-success font-medium">{j.counts.clean.toLocaleString()}</span> /{" "}
                    <span className="text-warn font-medium">{j.counts.dnc.toLocaleString()}</span> /{" "}
                    <span className="text-danger font-medium">{j.counts.litigator.toLocaleString()}</span>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <CadenceSelect
                      value={j.schedule}
                      nextRunAt={j.next_run_at}
                      onChange={async (schedule) => {
                        try {
                          await saveSchedule({ data: { jobId: j.id, schedule } });
                          toast.success(schedule === "one_time" ? "Rescanning Turned Off." : `Rescanning ${CADENCE_LABEL[schedule]}.`);
                          qc.invalidateQueries({ queryKey: ["jobs-list", workspaceId] });
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could Not Save Cadence.");
                        }
                      }}
                    />
                  </td>
                  <td className="p-4"><StatusBadge status={(j.status ?? "queued") as JobStatus} /></td>
                  <td className="p-4">
                    <div className="whitespace-nowrap text-foreground">{created.date}</div>
                    <div className="whitespace-nowrap text-xs text-muted-foreground">{created.time}</div>
                  </td>
                  <td className="p-4">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
/**
 * Recurring-scan cadence per list (spec §15.1). Re-runs reuse the same search
 * and only surface records that were not already in the workspace.
 */
function CadenceSelect({
  value,
  nextRunAt,
  onChange,
}: {
  value: string;
  nextRunAt: string | null;
  onChange: (schedule: "one_time" | "12h" | "daily" | "weekly") => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Select value={value} onValueChange={(v) => onChange(v as "one_time" | "12h" | "daily" | "weekly")}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one_time">One-Time</SelectItem>
          <SelectItem value="12h">Every 12 Hours</SelectItem>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
        </SelectContent>
      </Select>
      {value !== "one_time" && nextRunAt && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Repeat className="h-3 w-3" /> Next {new Date(nextRunAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
