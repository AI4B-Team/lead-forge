import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { GettingStarted } from "@/components/app/getting-started";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type JobStatus } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { Users, ListChecks, MessageSquare, Activity, Plus, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LeadTrace" }] }),
  component: Dashboard,
});

type JobRow = {
  id: string;
  name: string | null;
  source_type: string;
  status: JobStatus;
  rows_in: number | null;
  created_at: string;
};

type Credits = { scrape: number; skip_trace: number; sms: number };

function Dashboard() {
  const { workspaceId } = useWorkspaceId();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [metrics, setMetrics] = useState({ leads: 0, lists: 0, activeCampaigns: 0, deliverability: 0 });
  const [credits, setCredits] = useState<Credits>({ scrape: 0, skip_trace: 0, sms: 0 });

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const [jobsRes, leadsRes, listsRes, campRes, numRes, credRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, params, source_type, status, rows_in, created_at")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
        supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("status", ["scheduled", "sending"]),
        supabase.from("sending_numbers").select("health_score").eq("workspace_id", workspaceId),
        supabase.from("credit_balances").select("kind, balance").eq("workspace_id", workspaceId),
      ]);

      const rawJobs = (jobsRes.data ?? []) as Array<JobRow & { params: { name?: string } | null }>;
      setJobs(
        rawJobs.map((j) => ({
          id: j.id,
          name: (j.params?.name as string | undefined) ?? "Untitled Job",
          source_type: j.source_type,
          status: j.status,
          rows_in: j.rows_in,
          created_at: j.created_at,
        })),
      );

      const nums = (numRes.data ?? []) as Array<{ health_score: number | null }>;
      const deliverability = nums.length
        ? Math.round(nums.reduce((s, n) => s + Number(n.health_score ?? 0), 0) / nums.length)
        : 0;

      setMetrics({
        leads: leadsRes.count ?? 0,
        lists: listsRes.count ?? 0,
        activeCampaigns: campRes.count ?? 0,
        deliverability,
      });

      const bal: Credits = { scrape: 0, skip_trace: 0, sms: 0 };
      for (const row of (credRes.data ?? []) as Array<{ kind: keyof Credits; balance: number }>) {
        if (row.kind in bal) bal[row.kind] = row.balance;
      }
      setCredits(bal);
    })();
  }, [workspaceId]);

  const hasJobs = jobs.length > 0;

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
      <GettingStarted workspaceId={workspaceId ?? null} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric icon={<Users className="h-4 w-4" />} label="Leads" value={metrics.leads.toLocaleString()} />
        <Metric icon={<ListChecks className="h-4 w-4" />} label="Lists" value={metrics.lists.toString()} />
        <Metric icon={<MessageSquare className="h-4 w-4" />} label="Active Campaigns" value={metrics.activeCampaigns.toString()} />
        <Metric icon={<Activity className="h-4 w-4" />} label="Deliverability" value={metrics.deliverability ? `${metrics.deliverability}%` : "—"} tone="success" />
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
            {hasJobs ? (
              <div className="divide-y divide-border">
                {jobs.map((j) => (
                  <Link
                    key={j.id}
                    to="/app/jobs/$jobId"
                    params={{ jobId: j.id }}
                    className="flex items-center justify-between py-3 hover:bg-surface-muted -mx-2 px-2 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm text-foreground">{j.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {(j.rows_in ?? 0).toLocaleString()} Rows · {new Date(j.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge status={j.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="text-sm text-muted-foreground">No Jobs Yet.</div>
                <Button asChild className="mt-4 rounded-full">
                  <Link to="/app/new-job"><Plus className="mr-1 h-4 w-4" /> Run Your First Job</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Credit Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CreditRow label="Scrape" value={credits.scrape} />
            <CreditRow label="Skip Trace" value={credits.skip_trace} />
            <CreditRow label="SMS" value={credits.sms} />
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
