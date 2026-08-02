import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Activity, ArrowRight, Building2, MessageSquare, TrendingUp, Users,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HealthRow,
  planTone,
  type WsRow,
} from "@/components/app/admin-shared";
import { listAllWorkspaces } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/platform/")({
  head: () => ({
    meta: [
      { title: "Platform Dashboard — LeadTrace" },
      { name: "description", content: "Platform health, usage, and growth across every LeadTrace workspace." },
    ],
  }),
  component: PlatformDashboard,
});

function PlatformDashboard() {
  const fetchAll = useServerFn(listAllWorkspaces);
  const wsQ = useQuery({
    queryKey: ["admin-workspaces"],
    queryFn: () => fetchAll(),
  });

  const all = (wsQ.data?.workspaces ?? []) as WsRow[];
  const t = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      workspaces: all.length,
      leads: all.reduce((s, w) => s + (w.stats.leads ?? 0), 0),
      sentMonth: all.reduce((s, w) => s + (w.stats.sent_month ?? 0), 0),
      sentAll: all.reduce((s, w) => s + (w.stats.sent ?? 0), 0),
      numbers: all.reduce((s, w) => s + (w.stats.numbers ?? 0), 0),
      paid: all.filter((w) => (w.billing_plan ?? "trial") === "paid").length,
      trial: all.filter((w) => (w.billing_plan ?? "trial") === "trial").length,
      comped: all.filter((w) => w.billing_plan === "comped").length,
      pastDue: all.filter((w) => w.billing_plan === "past_due").length,
      new30: all.filter((w) => w.created_at && new Date(w.created_at).getTime() >= cutoff).length,
    };
  }, [all]);

  const conversion = t.paid + t.trial > 0 ? Math.round((t.paid / (t.paid + t.trial)) * 100) : 0;
  const topUsage = useMemo(
    () => [...all].sort((a, b) => b.stats.sent_month - a.stats.sent_month).slice(0, 5),
    [all],
  );
  const recent = useMemo(
    () =>
      [...all]
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .slice(0, 6),
    [all],
  );

  return (
    <div className="mx-auto max-w-[1400px]">
          <PageHeader
            title="Platform Dashboard"
            description="Is The Platform Healthy? Growth, Usage, And Billing At A Glance."
          />

          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total Workspaces" value={t.workspaces} icon={Building2} hint={`${t.paid} Paid · ${t.pastDue} Past Due`} />
            <StatTile label="Leads Stored" value={t.leads} icon={Users} hint="Across Every Workspace" />
            <StatTile label="SMS This Month" value={t.sentMonth} icon={MessageSquare} hint="Outbound Segments" />
            <StatTile label="Active Numbers" value={t.numbers} icon={Activity} hint="Provisioned Sending Numbers" />
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatTile label="New Workspaces (30d)" value={t.new30} icon={TrendingUp} hint="Signed Up In The Last 30 Days" />
            <StatTile label="Trial → Paid" value={`${conversion}%`} icon={TrendingUp} hint={`${t.paid} Paid Of ${t.paid + t.trial} Billable`} />
            <StatTile label="Lifetime SMS" value={t.sentAll} icon={MessageSquare} hint="All Outbound Segments Ever Sent" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display">Platform Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <HealthRow label="Paid Workspaces" value={t.paid.toLocaleString()} />
                <HealthRow label="Comped Workspaces" value={t.comped.toLocaleString()} />
                <HealthRow label="Trial Workspaces" value={t.trial.toLocaleString()} />
                <HealthRow label="Past Due" value={t.pastDue.toLocaleString()} tone={t.pastDue > 0 ? "danger" : undefined} />
                <HealthRow label="Sending Numbers" value={t.numbers.toLocaleString()} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-display">Usage Leaders</CardTitle>
                <Button asChild size="sm" variant="ghost" className="rounded-full text-xs">
                  <Link to="/platform/workspaces">
                    All Workspaces <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {topUsage.length === 0 && (
                  <div className="py-4 text-sm text-muted-foreground">No Usage Recorded Yet.</div>
                )}
                {topUsage.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{w.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{w.owner_email || "—"}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-display text-sm font-bold tabular-nums">
                        {w.stats.sent_month.toLocaleString()}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SMS / Mo</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-display">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recent.length === 0 && <div className="py-4 text-sm text-muted-foreground">Nothing Yet.</div>}
                {recent.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{w.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {w.industry ?? "—"} · {w.stats.leads.toLocaleString()} Leads
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant="outline" className={planTone(w.billing_plan ?? "trial")}>
                        {w.billing_plan ?? "trial"}
                      </Badge>
                      <span className="w-20 text-right text-[11px] text-muted-foreground">
                        {w.created_at ? new Date(w.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
    </div>
  );
}