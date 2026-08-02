import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { ListStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { setJobSchedule } from "@/lib/monitoring.functions";
import { CADENCE_LABEL } from "@/lib/monitoring.shared";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { LOCAL_TZ } from "@/lib/local-tz";
import { listJobs, resumeJob } from "@/lib/jobs.functions";
import { JobStageFlow } from "@/components/app/job-stage-flow";
import { StatTile } from "@/components/app/stat-tile";
import { buildPipelineStages } from "@/lib/pipeline-stages";
import { isStalled, isRunningStatus, stallReason, STALL_HOURS } from "@/lib/job-watchdog";
import { getTemplate, CATEGORY_LABELS, type TemplateCategory } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/app/lists/")({
  head: () => ({ meta: [{ title: "Lists — LeadTrace" }] }),
  component: Jobs,
});

const SOURCE_META: Record<string, { label: string; icon: typeof Landmark }> = {
  business: { label: "Business Search", icon: Building2 },
  records: { label: "Public Records", icon: Landmark },
  upload: { label: "Upload", icon: Upload },
  assistant: { label: "AI Assistant", icon: Sparkles },
};

/** Top-level buckets for the template-aware source filter. */
const TEMPLATE_GROUP: Record<TemplateCategory, string> = {
  business: "Business",
  directories: "Business",
  search: "Business",
  records: "Public Records",
  realestate: "Real Estate",
  social: "Social",
  upload: "Upload",
  ecommerce: "Other",
  jobs: "Other",
  reviews: "Other",
  travel: "Other",
  finance: "Other",
  education: "Other",
  news: "Other",
  sports: "Other",
};
const GROUP_ORDER = ["Business", "Public Records", "Real Estate", "Social", "Upload", "Other"];

/** Label + filter key for a run: its template when known, else its source. */
function sourceIdentity(job: { template_id?: string | null; source_type: string }) {
  const tpl = job.template_id ? getTemplate(job.template_id) : undefined;
  if (tpl)
    return {
      key: `tpl:${tpl.id}`,
      label: tpl.title,
      group: TEMPLATE_GROUP[tpl.category] ?? "Other",
      categoryLabel: CATEGORY_LABELS[tpl.category],
    };
  const meta = SOURCE_META[job.source_type];
  const group =
    job.source_type === "records"
      ? "Public Records"
      : job.source_type === "upload"
        ? "Upload"
        : job.source_type === "business"
          ? "Business"
          : "Other";
  return {
    key: `src:${job.source_type}`,
    label: meta?.label ?? job.source_type,
    group,
    categoryLabel: undefined,
  };
}

/** "Jul 31" / "Yesterday" plus a 12-hour time — far easier to scan than 7/31/2026. */
/** Parent row shows the list itself, so drop the "· Run #N" suffix. */
function listBaseName(name: string) {
  return name.split(" · Run #")[0]!;
}

function formatCreated(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const day = (a: Date) => new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const diffDays = Math.round((day(now) - day(d)) / 86400000);
  const date =
    diffDays === 0
      ? "Today"
      : diffDays === 1
        ? "Yesterday"
        : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { date, time };
}

function Jobs() {
  const { workspaceId } = useWorkspaceId();
  const navigate = useNavigate();
  const fetchJobs = useServerFn(listJobs);
  const saveSchedule = useServerFn(setJobSchedule);
  const retryJob = useServerFn(resumeJob);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["jobs-list", workspaceId],
    queryFn: () => fetchJobs({ data: { workspaceId: workspaceId!, timeZone: LOCAL_TZ } }),
    enabled: !!workspaceId,
    refetchInterval: 5000,
  });

  const [q, setQ] = useState("");
  const [source, setSource] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [range, setRange] = useState<string>("all");

  const allRows = useMemo(() => {
    const jobs = data?.jobs ?? [];
    // Stuck-job watchdog (§23): running with no progress events for 2h.
    return jobs.map((j) => ({
      ...j,
      identity: sourceIdentity(j),
      stalled: isStalled({
        status: j.status,
        lastEventAt: j.last_event_at,
        createdAt: j.created_at,
      }),
    }));
  }, [data]);

  const rows = useMemo(() => {
    const jobs = allRows;
    const needle = q.trim().toLowerCase();
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
    return jobs.filter((j) => {
      if (source !== "all" && j.identity.key !== source) return false;
      if (status === "attention") {
        if (!j.stalled && j.status !== "failed") return false;
      } else if (status === "running") {
        if (!isRunningStatus(j.status) || j.stalled) return false;
      } else if (status === "scheduled") {
        if (!j.schedule || j.schedule === "one_time") return false;
      } else if (status !== "all" && j.status !== status) return false;
      if (needle) {
        // Match every populated spec field: name, template, niche/keyword,
        // record type, state, counties, city, country, and URL.
        const haystack = [j.name, j.identity.label, j.identity.categoryLabel, ...j.spec_terms]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (cutoff && new Date(j.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [allRows, q, source, status, range]);

  /**
   * Only templates/sources this workspace has actually used. Grouping only
   * earns its keep when a group nests 2+ used sources — otherwise the header
   * and its single child render as duplicate rows, so we flatten.
   */
  const sourceOptions = useMemo(() => {
    const byGroup = new Map<string, Map<string, string>>();
    for (const j of allRows) {
      const { group, key, label } = j.identity;
      const bucket = byGroup.get(group) ?? new Map<string, string>();
      bucket.set(key, label);
      byGroup.set(group, bucket);
    }
    const groups = GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
      group: g,
      items: [...byGroup.get(g)!.entries()]
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }));
    const grouped = groups.some((g) => g.items.length > 1);
    return { grouped, groups, flat: groups.flatMap((g) => g.items) };
  }, [allRows]);

  const summary = useMemo(() => {
    const jobs = allRows;
    let clean = 0;
    let smsReady = 0;
    let running = 0;
    let scheduled = 0;
    let attention = 0;
    for (const j of jobs) {
      clean += j.counts.clean;
      // SMS Ready: clean leads sitting on runs that have finished scrubbing.
      if (j.status === "ready") smsReady += j.counts.clean;
      // Running counts only genuinely active jobs — stalled ones move to Needs Attention.
      if (isRunningStatus(j.status) && !j.stalled) running += 1;
      if (j.stalled || j.status === "failed") attention += 1;
      if (j.schedule && j.schedule !== "one_time") scheduled += 1;
    }
    return {
      total: jobs.length,
      clean,
      smsReady,
      running,
      scheduled,
      attention,
    };
  }, [allRows]);

  // Recurring framing (§ runs under lists): where a list has a recurring
  // cadence, its runs collapse under one row — latest run on top, prior runs
  // revealed on expand. One-off lists keep rendering as single rows.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const entries = useMemo(() => {
    const byKey = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = byKey.get(r.group_key);
      if (arr) arr.push(r);
      else byKey.set(r.group_key, [r]);
    }
    const out: { latest: (typeof rows)[number]; prior: typeof rows }[] = [];
    for (const group of byKey.values()) {
      const ordered = [...group].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const recurring = ordered.some((r) => r.schedule && r.schedule !== "one_time");
      if (recurring && ordered.length > 1)
        out.push({ latest: ordered[0]!, prior: ordered.slice(1) });
      else for (const r of ordered) out.push({ latest: r, prior: [] });
    }
    return out.sort(
      (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime(),
    );
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Lists"
        description="Every Pipeline You Have Run — Source, Scrub, Verification, And Results. Click A Row To Open The Latest Run."
        descriptionClassName="whitespace-nowrap max-w-none"
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/assistant">
              <Plus className="mr-1 h-4 w-4" /> New List
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        <StatTile label="Total Lists" value={summary.total.toLocaleString()} icon={Layers} />
        <StatTile
          label="Clean Leads"
          value={summary.clean.toLocaleString()}
          icon={Users}
          hint="Passed Every Scrub"
        />
        <StatTile
          label="SMS Ready"
          value={summary.smsReady.toLocaleString()}
          icon={ShieldCheck}
          hint="Clean On Ready Lists"
        />
        <StatTile
          label="Attention"
          value={summary.attention.toLocaleString()}
          icon={AlertTriangle}
          hint={`No Progress For ${STALL_HOURS}h+`}
        />
        <StatTile
          label="Scheduled"
          value={summary.scheduled.toLocaleString()}
          icon={CalendarClock}
          hint="Recurring Rescans"
        />
        <StatTile
          label="Running"
          value={summary.running.toLocaleString()}
          icon={Activity}
          hint="Actively Progressing"
        />
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search By Name, Source, Niche, Or Location…"
              className="h-11 pl-9 text-base"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-11 w-[170px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sourceOptions.grouped
                  ? sourceOptions.groups.map((g) =>
                      g.items.length > 1 ? (
                        <SelectGroup key={g.group}>
                          <SelectLabel>{g.group}</SelectLabel>
                          {g.items.map((it) => (
                            <SelectItem key={it.key} value={it.key}>
                              {it.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : (
                        // Single-child group: the header would duplicate its
                        // only child, so render the source on its own.
                        g.items.map((it) => (
                          <SelectItem key={it.key} value={it.key}>
                            {it.label}
                          </SelectItem>
                        ))
                      ),
                    )
                  : sourceOptions.flat.map((it) => (
                      <SelectItem key={it.key} value={it.key}>
                        {it.label}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="scraping">Scraping</SelectItem>
                <SelectItem value="scrubbing">Scrubbing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="attention">Needs Attention</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-11 w-[150px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
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
          <table className="w-full min-w-[1240px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="p-4">Name</th>
                <th className="p-4">Source</th>
                <th className="p-4">Pipeline</th>
                <th className="p-4">Rescan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
                <th className="p-4 w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Loading Lists…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No Lists Match.{" "}
                    <Link to="/app/assistant" className="text-primary underline">
                      Start A New List
                    </Link>
                    .
                  </td>
                </tr>
              )}
              {entries.flatMap(({ latest, prior }) => {
                const open = expanded.has(latest.group_key);
                const shown = open ? [latest, ...prior] : [latest];
                return shown.map((j, idx) => {
                  const isChild = idx > 0;
                  const isParent = prior.length > 0 && idx === 0;
                  const src = SOURCE_META[j.source_type] ?? { label: j.source_type, icon: Layers };
                  const created = formatCreated(j.created_at);
                  return (
                    <tr
                      key={j.id}
                      onClick={() =>
                        navigate({ to: "/app/lists/$listId", params: { listId: j.id } })
                      }
                      className={`group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-muted ${
                        isChild ? "bg-surface-muted/40" : ""
                      }`}
                    >
                      <td className={`p-4 ${isChild ? "pl-10" : ""}`}>
                        <div className="flex items-center gap-2">
                          {isParent && (
                            <button
                              type="button"
                              aria-label={open ? "Hide Prior Runs" : "Show Prior Runs"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(latest.group_key);
                              }}
                              className="grid h-5 w-5 shrink-0 place-items-center rounded border border-border text-muted-foreground hover:text-foreground"
                            >
                              <ChevronRight
                                className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
                              />
                            </button>
                          )}
                          <span className="whitespace-nowrap font-medium text-foreground group-hover:text-primary">
                            {isChild ? `Run #${j.run_index}` : listBaseName(j.name)}
                          </span>
                          {isParent && (
                            <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              {prior.length + 1} Runs
                            </span>
                          )}
                          {j.cadence_badge && (
                            <span className="whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              {j.cadence_badge}
                            </span>
                          )}
                          {j.new_since_last_run > 0 && (
                            <span className="whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              +{j.new_since_last_run.toLocaleString()} New
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
                          <span className="text-success">
                            {j.counts.clean.toLocaleString()} Clean
                          </span>
                          {" · "}
                          <span className="text-warn">{j.counts.dnc.toLocaleString()} DNC</span>
                          {" · "}
                          <span className="text-danger">
                            {j.counts.litigator.toLocaleString()} Litigator
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                          <src.icon className="h-4 w-4 shrink-0" /> {j.identity.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <JobStageFlow stages={buildPipelineStages(j)} />
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <CadenceSelect
                          value={j.schedule}
                          nextRunAt={j.next_run_at}
                          onChange={async (schedule) => {
                            try {
                              await saveSchedule({ data: { jobId: j.id, schedule } });
                              toast.success(
                                schedule === "one_time"
                                  ? "Rescanning Turned Off."
                                  : `Rescanning ${CADENCE_LABEL[schedule]}.`,
                              );
                              qc.invalidateQueries({ queryKey: ["jobs-list", workspaceId] });
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Could Not Save Cadence.",
                              );
                            }
                          }}
                        />
                      </td>
                      <td className="p-4">
                        {j.stalled ? (
                          <div
                            className="flex items-center gap-2 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  <ListStatusBadge status={j.status} stalled />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[260px] text-xs leading-snug">
                                {stallReason(j.status)}
                              </TooltipContent>
                            </Tooltip>
                            <button
                              type="button"
                              className="cursor-pointer text-xs font-semibold text-primary underline-offset-2 hover:underline"
                              onClick={async () => {
                                try {
                                  await retryJob({ data: { jobId: j.id } });
                                  toast.success("Retrying From The Last Completed Stage.");
                                  qc.invalidateQueries({ queryKey: ["jobs-list", workspaceId] });
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : "Could Not Retry This Run.",
                                  );
                                }
                              }}
                            >
                              Retry
                            </button>
                          </div>
                        ) : (
                          <ListStatusBadge status={j.status} />
                        )}
                      </td>
                      <td className="p-4">
                        <div className="whitespace-nowrap text-foreground">{created.date}</div>
                        <div className="whitespace-nowrap text-xs text-muted-foreground">
                          {created.time}
                        </div>
                      </td>
                      <td className="p-4">
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </td>
                    </tr>
                  );
                });
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
      <Select
        value={value}
        onValueChange={(v) => onChange(v as "one_time" | "12h" | "daily" | "weekly")}
      >
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
          <Repeat className="h-3 w-3" /> {CADENCE_LABEL[value] ?? "Recurring"} · Next{" "}
          {new Date(nextRunAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}
