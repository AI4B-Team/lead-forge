import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, MessageSquare, Activity, ShieldCheck, Ban, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getJobReview, getLeadsByBucket, launchCampaignFromJob } from "@/lib/jobs.functions";

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
  const launch = useServerFn(launchCampaignFromJob);
  const [launching, setLaunching] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["job-review", jobId],
    queryFn: () => fetchReview({ data: { jobId } }),
    refetchInterval: (q) => {
      const s = q.state.data?.job?.status;
      return s && s !== "ready" && s !== "failed" ? 2000 : false;
    },
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

  const onLaunch = async () => {
    setLaunching(true);
    try {
      const { campaignId } = await launch({ data: { jobId, name: `${jobName} — Campaign` } });
      toast.success("Campaign Created With Clean File Only.");
      navigate({ to: "/app/campaigns/$campaignId", params: { campaignId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Launch Campaign.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={jobName}
        description="Pipeline Review · Every Row Passed Through De-Dupe, Enrich, Skip Trace, And Scrub."
        actions={
          <Badge variant="outline" className="text-sm">
            {STATUS_LABEL[job.status ?? "queued"] ?? job.status}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rows In" value={job.rows_in ?? 0} />
        <Stat label="De-Duped" value={job.rows_deduped ?? 0} />
        <Stat label="Enriched" value={job.rows_enriched ?? 0} />
        <Stat label="Skip Traced" value={job.rows_skiptraced ?? 0} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <BucketCard
          tone="success"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Clean"
          count={counts.clean}
          note="Ready To Send"
          ready={isReady}
          onDownload={() => onDownload("clean")}
        />
        <BucketCard
          tone="warn"
          icon={<Ban className="h-4 w-4" />}
          title="DNC"
          count={counts.dnc}
          note="Download For Suppression"
          ready={isReady}
          onDownload={() => onDownload("dnc")}
        />
        <BucketCard
          tone="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Litigator"
          count={counts.litigator}
          note="Download For Analytics"
          ready={isReady}
          onDownload={() => onDownload("litigator")}
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
        <Button className="rounded-full" disabled={!isReady || launching || counts.clean === 0} onClick={onLaunch}>
          {launching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-1 h-4 w-4" />}
          Launch Campaign With Clean File
        </Button>
      </div>
    </div>
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

function BucketCard({ tone, icon, title, count, note, ready, onDownload }: {
  tone: "success" | "warn" | "danger";
  icon: React.ReactNode;
  title: string;
  count: number;
  note: string;
  ready: boolean;
  onDownload: () => void;
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
      <Button size="sm" variant="outline" className="mt-4 rounded-full" disabled={!ready || count === 0} onClick={onDownload}>
        <Download className="mr-1 h-3.5 w-3.5" /> Download File
      </Button>
    </div>
  );
}