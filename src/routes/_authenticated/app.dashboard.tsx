import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_JOBS, MOCK_METRICS, MOCK_CREDITS, statusLabel } from "@/lib/mock-data";
import { Users, ListChecks, MessageSquare, Activity, Plus, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LeadTrace" }] }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A live look at your leads, lists, campaigns, and deliverability."
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/new-job"><Plus className="mr-1 h-4 w-4" /> New Job</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric icon={<Users className="h-4 w-4" />} label="Leads" value={MOCK_METRICS.leads.toLocaleString()} />
        <Metric icon={<ListChecks className="h-4 w-4" />} label="Lists" value={MOCK_METRICS.lists.toString()} />
        <Metric icon={<MessageSquare className="h-4 w-4" />} label="Active Campaigns" value={MOCK_METRICS.activeCampaigns.toString()} />
        <Metric icon={<Activity className="h-4 w-4" />} label="Deliverability" value={`${MOCK_METRICS.deliverability}%`} tone="success" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Recent Jobs</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/lists">View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {MOCK_JOBS.map((j) => (
                <Link
                  key={j.id}
                  to="/app/jobs/$jobId"
                  params={{ jobId: j.id }}
                  className="flex items-center justify-between py-3 hover:bg-surface-muted -mx-2 px-2 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm text-foreground">{j.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {j.rowsIn.toLocaleString()} Rows · {j.createdAt}
                    </div>
                  </div>
                  <StatusBadge status={j.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Credit Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CreditRow label="Scrape" value={MOCK_CREDITS.scrape} />
            <CreditRow label="Skip Trace" value={MOCK_CREDITS.skipTrace} />
            <CreditRow label="SMS" value={MOCK_CREDITS.sms} />
            <Button asChild className="w-full rounded-full mt-2">
              <Link to="/app/billing">Top Up</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "success" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
          {icon} {label}
        </div>
        <div className={`mt-2 font-display text-3xl font-black ${tone === "success" ? "text-success" : "text-foreground"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function CreditRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value.toLocaleString()}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: (typeof MOCK_JOBS)[number]["status"] }) {
  const map: Record<string, string> = {
    ready: "bg-success/10 text-success border-success/20",
    scrubbing: "bg-warn/10 text-warn border-warn/20",
    skiptracing: "bg-warn/10 text-warn border-warn/20",
    enriching: "bg-warn/10 text-warn border-warn/20",
    scraping: "bg-warn/10 text-warn border-warn/20",
    queued: "bg-muted text-muted-foreground border-border",
    failed: "bg-danger/10 text-danger border-danger/20",
  };
  return (
    <Badge variant="outline" className={`${map[status]} font-medium`}>
      {statusLabel(status)}
    </Badge>
  );
}