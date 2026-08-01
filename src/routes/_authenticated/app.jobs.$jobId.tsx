import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, MessageSquare, Activity, ShieldCheck, Ban, AlertTriangle, Loader2, Users, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { getJobReview, getLeadsByBucket, launchCampaignFromJob, listJobEvents, listJobLeads, listJobs } from "@/lib/jobs.functions";
import { PipelineFunnel } from "@/components/app/pipeline-funnel";
import { PhoneLink } from "@/components/app/phone-link";
import { setOnboardingPref } from "@/lib/onboarding.functions";
import { useWorkspaceId } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated/app/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Pipeline Review — LeadTrace" }] }),
  component: JobDetail,
});

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued", scraping: "Scraping", enriching: "Enriching",
  skiptracing: "Skip Tracing", scrubbing: "Scrubbing", ready: "Ready", failed: "Failed",
};

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function JobDetail() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const fetchReview = useServerFn(getJobReview);
  const fetchBucket = useServerFn(getLeadsByBucket);
  const fetchEvents = useServerFn(listJobEvents);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserBucket, setBrowserBucket] = useState<"clean" | "dnc" | "litigator" | "all">("clean");

  const { data, isLoading } = useQuery({
    queryKey: ["job-review", jobId],
    queryFn: () => fetchReview({ data: { jobId } }),
    refetchInterval: (q) => {
      const s = q.state.data?.job?.status;
      return s && s !== "ready" && s !== "failed" ? 2000 : false;
    },
  });

  const { data: eventData } = useQuery({
    queryKey: ["job-events", jobId],
    queryFn: () => fetchEvents({ data: { jobId } }),
    refetchInterval: (q) => (data?.job?.status === "ready" || data?.job?.status === "failed" ? false : 2000),
  });

  if (isLoading || !data) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading Pipeline…</div>;
  }

  const { job, counts, quality } = data;
  const isReady = job.status === "ready";
  const params = (job.params ?? {}) as Record<string, unknown>;
  const jobName = String(params.name ?? params.file_name ?? `${job.source_type} · ${job.id.slice(0, 8)}`);

  const onDownload = async (bucket: "clean" | "dnc" | "litigator") => {
    const res = await fetchBucket({ data: { jobId, bucket } });
    if (!res.rows.length) return toast.info("No Rows In This Bucket.");
    downloadCsv(`${jobName.replace(/\s+/g, "_")}_${bucket}.csv`, toCsv(res.rows));
  };

  return (
    <div>
      <PageHeader
        title={jobName}
        description="Pipeline Review · Every Row Passed Through De-Dupe, Enrich, Skip Trace, And Scrub."
        actions={
          <>
            <Badge variant="outline" className="text-sm">
              {STATUS_LABEL[job.status ?? "queued"] ?? job.status}
            </Badge>
            <LeadsBrowser
              jobId={jobId}
              disabled={!isReady}
              open={browserOpen}
              onOpenChange={setBrowserOpen}
              bucket={browserBucket}
              onBucketChange={setBrowserBucket}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rows In" value={job.rows_in ?? 0} />
        <Stat label="De-Duped" value={job.rows_deduped ?? 0} />
        <Stat label="Enriched" value={job.rows_enriched ?? 0} />
        <Stat label="Skip Traced" value={job.rows_skiptraced ?? 0} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display">Pipeline</CardTitle>
          {isReady && (
            <div className="font-display text-2xl font-black text-primary">
              {counts.clean.toLocaleString()} Clean, Textable Leads
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <PipelineFunnel
            stages={{
              found: job.rows_in ?? 0,
              deduped: job.rows_deduped ?? 0,
              textable: counts.mobile,
              scrubbed: counts.total,
              clean: counts.clean,
            }}
          />
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Live Progress
            </div>
            <ul className="mt-3 space-y-2">
              {(eventData?.events ?? []).map((e) => (
                <li key={e.id} className="flex gap-3 text-sm text-foreground">
                  <span className="text-xs text-muted-foreground tabular-nums pt-0.5 shrink-0">
                    {new Date(e.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <span>{e.message}</span>
                </li>
              ))}
              {!(eventData?.events ?? []).length && (
                <li className="text-sm text-muted-foreground">Waiting For The First Stage To Report…</li>
              )}
            </ul>
            {!isReady && (
              <div className="mt-3 text-xs text-muted-foreground">
                You Can Close This Tab — The Job Keeps Running On Our Servers.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <BucketCard
          tone="success"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Clean"
          count={counts.clean}
          note="Ready To Send"
          ready={isReady}
          onDownload={() => onDownload("clean")}
          onView={() => { setBrowserBucket("clean"); setBrowserOpen(true); }}
        />
        <BucketCard
          tone="warn"
          icon={<Ban className="h-4 w-4" />}
          title="DNC"
          count={counts.dnc}
          note="Download For Suppression"
          ready={isReady}
          onDownload={() => onDownload("dnc")}
          onView={() => { setBrowserBucket("dnc"); setBrowserOpen(true); }}
        />
        <BucketCard
          tone="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Litigator"
          count={counts.litigator}
          note="Download For Analytics"
          ready={isReady}
          onDownload={() => onDownload("litigator")}
          onView={() => { setBrowserBucket("litigator"); setBrowserOpen(true); }}
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-display">List Quality Score</CardTitle>
          </div>
          <div className="font-display text-3xl font-black text-foreground">
            {isReady ? quality : "—"}<span className="text-base text-muted-foreground">/100</span>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Blends Clean Rate, Mobile Rate, And Reachability. Higher Score = Hotter Raw Source.
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end gap-2">
        <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/app/lists" })}>
          Back To Lists
        </Button>
        <LaunchCampaignDialog defaultJobId={jobId} defaultJobName={jobName} />
      </div>
    </div>
  );
}

// Launch a campaign from ANY ready list in the workspace, not just this one.
function LaunchCampaignDialog({ defaultJobId, defaultJobName }: { defaultJobId: string; defaultJobName: string }) {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspaceId();
  const fetchJobs = useServerFn(listJobs);
  const launch = useServerFn(launchCampaignFromJob);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultJobId);
  const [name, setName] = useState(`${defaultJobName} — Campaign`);
  const [launching, setLaunching] = useState(false);

  const { data } = useQuery({
    queryKey: ["launchable-jobs", workspaceId],
    queryFn: () => fetchJobs({ data: { workspaceId: workspaceId! } }),
    enabled: open && !!workspaceId,
  });

  const options = (data?.jobs ?? []).filter((j) => j.status === "ready" && j.counts.clean > 0);

  const pick = (id: string) => {
    setSelected(id);
    const j = options.find((o) => o.id === id);
    if (j) setName(`${j.name} — Campaign`);
  };

  const onLaunch = async () => {
    if (!selected) return toast.error("Pick A List First.");
    if (!name.trim()) return toast.error("Name Your Campaign.");
    setLaunching(true);
    try {
      const { campaignId } = await launch({ data: { jobId: selected, name: name.trim() } });
      toast.success("Campaign Created With Clean File Only.");
      setOpen(false);
      navigate({ to: "/app/campaigns/$campaignId", params: { campaignId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Launch Campaign.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <MessageSquare className="mr-1 h-4 w-4" /> Launch Campaign With Clean File
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Launch Campaign</DialogTitle>
          <DialogDescription>
            Pick Any Ready List. Only Clean Rows Are Attached — DNC And Litigator Stay Download-Only.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>List / File</Label>
            <Select value={selected} onValueChange={pick}>
              <SelectTrigger><SelectValue placeholder="Choose A Ready List" /></SelectTrigger>
              <SelectContent>
                {options.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground">No Ready Lists With Clean Rows Yet.</div>
                )}
                {options.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.name} · {j.counts.clean.toLocaleString()} Clean
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Campaign Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign Name" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="rounded-full" disabled={launching || !selected} onClick={onLaunch}>
            {launching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-1 h-4 w-4" />}
            Launch Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Bucket = "clean" | "dnc" | "litigator" | "all";

type LeadRow = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  phone_type: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  scrub_status: string | null;
};

function LeadsBrowser({ jobId, disabled, open, onOpenChange, bucket, onBucketChange }: {
  jobId: string;
  disabled: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bucket: Bucket;
  onBucketChange: (b: Bucket) => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<LeadRow | null>(null);
  const fetchLeads = useServerFn(listJobLeads);
  const markReviewed = useServerFn(setOnboardingPref);
  useEffect(() => {
    if (open) markReviewed({ data: { reviewedCleanList: true } }).catch(() => {});
  }, [open, markReviewed]);
  const { data, isFetching } = useQuery({
    queryKey: ["job-leads", jobId, bucket, q],
    queryFn: () => fetchLeads({ data: { jobId, bucket, search: q || undefined, limit: 100 } }),
    enabled: open,
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-full" disabled={disabled}>
          <Users className="mr-1 h-4 w-4" /> Browse Leads
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Leads In This List</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className="pl-9" />
          </div>
          <Select value={bucket} onValueChange={(v) => onBucketChange(v as Bucket)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="clean">Clean</SelectItem>
              <SelectItem value="dnc">DNC</SelectItem>
              <SelectItem value="litigator">Litigator</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 space-y-2">
          {isFetching && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isFetching && (data?.leads.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">No Leads Match.</div>
          )}
          {data?.leads.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setActive(l as LeadRow)}
              className="w-full text-left rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-foreground">{l.full_name ?? l.business_name ?? "—"}</div>
                <Badge
                  variant="outline"
                  className={
                    l.scrub_status === "clean" ? "text-success border-success/30 bg-success/10" :
                    l.scrub_status === "dnc" ? "text-warn border-warn/30 bg-warn/10" :
                    "text-danger border-danger/30 bg-danger/10"
                  }
                >
                  {l.scrub_status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground space-x-3">
                {l.phone && (
                  <span>
                    <PhoneLink phone={l.phone} />
                    {l.phone_type ? ` · ${l.phone_type}` : ""}
                  </span>
                )}
                {l.email && <span>{l.email}</span>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {[l.address, l.city, l.state].filter(Boolean).join(", ") || "—"}
              </div>
            </button>
          ))}
          {(data?.leads.length ?? 0) === 100 && (
            <div className="text-xs text-muted-foreground text-center pt-2">Showing First 100 · Refine Search To See More.</div>
          )}
        </div>
        <ContactDetailDialog lead={active} onClose={() => setActive(null)} />
      </SheetContent>
    </Sheet>
  );
}

function ContactDetailDialog({ lead, onClose }: { lead: LeadRow | null; onClose: () => void }) {
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {lead?.full_name ?? lead?.business_name ?? "Contact Details"}
          </DialogTitle>
          <DialogDescription>Full Record As Delivered After Enrichment And Scrubbing.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <DetailRow label="Name" value={lead?.full_name} />
          <DetailRow label="Business" value={lead?.business_name} />
          <dt className="col-span-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground pt-0.5">Phone</dt>
          <dd className="col-span-2 text-foreground break-words">
            <PhoneLink phone={lead?.phone} />
          </dd>
          <DetailRow label="Line Type" value={lead?.phone_type} />
          <DetailRow label="Email" value={lead?.email} />
          <DetailRow label="Address" value={lead?.address} />
          <DetailRow label="City" value={lead?.city} />
          <DetailRow label="State" value={lead?.state} />
          <DetailRow label="Scrub Status" value={lead?.scrub_status} />
        </dl>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="col-span-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground pt-0.5">{label}</dt>
      <dd className="col-span-2 text-foreground break-words">{value || "—"}</dd>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className="mt-2 font-display text-3xl font-black text-foreground">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function BucketCard({ tone, icon, title, count, note, ready, onDownload, onView }: {
  tone: "success" | "warn" | "danger";
  icon: React.ReactNode;
  title: string;
  count: number;
  note: string;
  ready: boolean;
  onDownload: () => void;
  onView: () => void;
}) {
  const toneClasses = {
    success: "border-success/30 bg-success/5",
    warn: "border-warn/30 bg-warn/5",
    danger: "border-danger/30 bg-danger/5",
  }[tone];
  const textTone = { success: "text-success", warn: "text-warn", danger: "text-danger" }[tone];
  return (
    <div className={`rounded-2xl border p-6 ${toneClasses}`}>
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${textTone}`}>
        {icon} {title}
      </div>
      <div className="mt-2 font-display text-4xl font-black text-foreground">
        {ready ? count.toLocaleString() : "—"}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{note}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-full" disabled={!ready || count === 0} onClick={onView}>
          <Eye className="mr-1 h-3.5 w-3.5" /> View Online
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" disabled={!ready || count === 0} onClick={onDownload}>
          <Download className="mr-1 h-3.5 w-3.5" /> Download File
        </Button>
      </div>
    </div>
  );
}