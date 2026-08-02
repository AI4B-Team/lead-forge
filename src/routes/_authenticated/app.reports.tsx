import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Handshake, CalendarCheck, DollarSign, Reply } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getWorkspacePerformance } from "@/lib/reports.functions";
import { formatMoney } from "@/lib/performance-intel";
import {
  KpiCard,
  RevenueFunnel,
  AiInsights,
  PerformanceChart,
  CampaignLeaderboard,
  BestMessagePanel,
  WeeklySummary,
} from "@/components/app/performance-panels";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({
    meta: [
      { title: "Performance — LeadTrace" },
      { name: "description", content: "Conversations, qualified leads, appointments and projected pipeline across your workspace." },
    ],
  }),
  component: Performance,
});

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function Performance() {
  const { workspaceId } = useWorkspaceId();
  const fetchPerf = useServerFn(getWorkspacePerformance);
  const { data, isLoading } = useQuery({
    queryKey: ["workspace-performance", workspaceId],
    queryFn: () => fetchPerf({ data: { workspaceId: workspaceId!, days: 30 } }),
    enabled: !!workspaceId,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Performance…
      </div>
    );
  }

  const { kpis, deltas, daily, funnel, campaigns, bestMessage, insights, timing } = data;

  const week = weekOverWeek(daily);
  const bestCampaign = campaigns[0] ? { id: campaigns[0].id, name: campaigns[0].name } : null;

  return (
    <div>
      <PageHeader
        title="Performance"
        description="Is Your Outreach Making You Money? Appointments, Pipeline And What To Do Next."
      />

      {/* Results — hero KPIs, weekly digest and the revenue funnel in one group */}
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard
              label="Qualified Leads"
              value={kpis.qualified.toLocaleString()}
              deltaPct={deltas.qualified}
              icon={Handshake}
            />
            <KpiCard
              label="Appointments"
              value={kpis.appointments.toLocaleString()}
              deltaPct={deltas.appointments}
              icon={CalendarCheck}
            />
            <KpiCard
              label="Reply Rate"
              value={pct(kpis.replyRate)}
              deltaPct={deltas.replyRate}
              icon={Reply}
            />
            <KpiCard
              label="Pipeline Value"
              value={formatMoney(kpis.pipeline)}
              deltaPct={deltas.pipeline}
              icon={DollarSign}
              emphasis
            />
          </div>

          <div className="border-t border-border pt-4">
            <WeeklySummary
              rows={[
                { label: "Replies", deltaPct: week.replies },
                { label: "Qualified", deltaPct: week.qualified },
                { label: "Appointments", deltaPct: week.appointments },
                { label: "Opt-Outs", deltaPct: week.optOuts, invert: true },
              ]}
              bestCampaign={bestCampaign}
            />
          </div>

          <div className="border-t border-border pt-6">
            <div className="mb-5 text-center">
              <h2 className="font-display text-lg font-black text-foreground">Revenue Funnel</h2>
              <p className="text-xs text-muted-foreground">Last 30 Days · Where Leads Turn Into Revenue</p>
            </div>
            <RevenueFunnel steps={funnel} />
          </div>
        </CardContent>
      </Card>

      {/* Supporting analytics */}
      <Card className="mb-6">
        <CardContent className="space-y-5 pt-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Secondary label="Messages Sent (30d)" value={kpis.sent.toLocaleString()} deltaPct={deltas.sent} />
            <Secondary label="Delivery Rate" value={pct(kpis.deliverRate)} deltaPct={deltas.deliverRate} tone="success" />
            <Secondary label="AI Conversations" value={kpis.conversations.toLocaleString()} deltaPct={deltas.conversations} />
            <Secondary
              label="Opt-Out Rate"
              value={pct(kpis.optOutRate)}
              deltaPct={deltas.optOutRate}
              invert
              tone={kpis.optOutRate > 0.05 ? "danger" : undefined}
            />
            <Secondary label="Most Responsive Time" value={timing.bestBand ?? "—"} />
            <Secondary label="Best Send Day" value={timing.bestDay ?? "—"} />
          </div>
          <div className="border-t border-border pt-2">
            <PerformanceChart daily={daily} />
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <AiInsights insights={insights} />
        <BestMessagePanel best={bestMessage} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-black text-foreground">Campaign Performance</h2>
        <CampaignLeaderboard campaigns={campaigns} />
      </div>
    </div>
  );
}

/** Last 7 days vs the 7 before, straight from the daily series. */
function weekOverWeek(
  daily: Array<{ replies: number; qualified: number; appointments: number; optOuts: number }>,
) {
  const last = daily.slice(-7);
  const prior = daily.slice(-14, -7);
  const sum = (rows: typeof last, key: "replies" | "qualified" | "appointments" | "optOuts") =>
    rows.reduce((a, r) => a + (r[key] ?? 0), 0);
  const move = (key: "replies" | "qualified" | "appointments" | "optOuts") => {
    const a = sum(last, key);
    const b = sum(prior, key);
    if (!b) return a ? 100 : null;
    return Math.round(((a - b) / b) * 100);
  };
  return {
    replies: move("replies"),
    qualified: move("qualified"),
    appointments: move("appointments"),
    optOuts: move("optOuts"),
  };
}

/** Compact operational metric with movement, secondary to the executive row. */
function Secondary({
  label,
  value,
  deltaPct,
  tone,
  invert,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  tone?: "success" | "danger";
  invert?: boolean;
}) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground";
  const good = deltaPct == null ? null : invert ? deltaPct <= 0 : deltaPct >= 0;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-black ${color}`}>{value}</div>
      {deltaPct != null && (
        <div className={`text-[11px] font-semibold ${good ? "text-success" : "text-danger"}`}>
          {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}% vs Prior
        </div>
      )}
    </div>
  );
}
