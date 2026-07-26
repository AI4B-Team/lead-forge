import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_JOBS, statusLabel } from "@/lib/mock-data";
import { Download, MessageSquare, Activity, ShieldCheck, Ban, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Pipeline Review — LeadForge" }] }),
  loader: ({ params }) => {
    const job = MOCK_JOBS.find((j) => j.id === params.jobId);
    if (!job) throw notFound();
    return { job };
  },
  component: JobDetail,
});

function JobDetail() {
  const { job } = Route.useLoaderData();
  const isReady = job.status === "ready";

  return (
    <div>
      <PageHeader
        title={job.name}
        description="Pipeline Review · Every Row Passed Through De-Dupe, Enrich, Skip Trace, And Scrub."
        actions={
          <Badge variant="outline" className="text-sm">
            {statusLabel(job.status)}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rows In" value={job.rowsIn} />
        <Stat label="De-Duped" value={job.rowsDeduped} />
        <Stat label="Enriched" value={job.rowsEnriched} />
        <Stat label="Skip Traced" value={job.rowsSkipTraced} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <BucketCard
          tone="success"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Clean"
          count={job.clean}
          note="Ready To Send"
          ready={isReady}
        />
        <BucketCard
          tone="warn"
          icon={<Ban className="h-4 w-4" />}
          title="DNC"
          count={job.dnc}
          note="Download For Suppression"
          ready={isReady}
        />
        <BucketCard
          tone="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Litigator"
          count={job.litigator}
          note="Download For Analytics"
          ready={isReady}
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-display">List Quality Score</CardTitle>
          </div>
          <div className="font-display text-3xl font-black text-foreground">
            {isReady ? job.qualityScore : "—"}<span className="text-base text-muted-foreground">/100</span>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Blends Clean Rate, Mobile Rate, And Reachability. Higher Score = Hotter Raw Source.
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end gap-2">
        <Button asChild variant="outline" className="rounded-full" disabled={!isReady}>
          <Link to="/app/lists">Back To Lists</Link>
        </Button>
        <Button asChild className="rounded-full" disabled={!isReady}>
          <Link to="/app/campaigns">
            <MessageSquare className="mr-1 h-4 w-4" /> Launch Campaign With Clean File
          </Link>
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

function BucketCard({ tone, icon, title, count, note, ready }: {
  tone: "success" | "warn" | "danger";
  icon: React.ReactNode;
  title: string;
  count: number;
  note: string;
  ready: boolean;
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
      <Button size="sm" variant="outline" className="mt-4 rounded-full" disabled={!ready || count === 0}>
        <Download className="mr-1 h-3.5 w-3.5" /> Download File
      </Button>
    </div>
  );
}