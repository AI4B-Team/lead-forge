import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare, Handshake, CalendarCheck, DollarSign } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getWorkspacePerformance } from "@/lib/reports.functions";
import { formatMoney } from "@/lib/performance-intel";
import {
  KpiCard,
  RevenueFunnel,
  AiInsights,
  PerformanceChart,
  CampaignLeaderboard,
  NumberHealthPanel,
  BestMessagePanel,
  RecentConversations,
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

  const { kpis, deltas, daily, funnel, campaigns, bestMessage, recent, insights, numbers, timing } = data;

  return (
    <div>
      <PageHeader
        title="Performance"
        description="What Your Outreach Is Actually Producing — Conversations, Appointments And Pipeline."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="AI Conversations"
          value={kpis.conversations.toLocaleString()}
          deltaPct={deltas.conversations}
          icon={MessageSquare}
        />
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
          label="Pipeline Value"
          value={formatMoney(kpis.pipeline)}
          deltaPct={deltas.pipeline}
          icon={DollarSign}
          emphasis
        />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Secondary label="Messages Sent (30d)" value={kpis.sent.toLocaleString()} deltaPct={deltas.sent} />
          <Secondary label="Delivery Rate" value={pct(kpis.deliverRate)} deltaPct={deltas.deliverRate} tone="success" />
          <Secondary label="Reply Rate" value={pct(kpis.replyRate)} deltaPct={deltas.replyRate} tone="success" />
          <Secondary
            label="Opt-Out Rate"
            value={pct(kpis.optOutRate)}
            deltaPct={deltas.optOutRate}
            invert
            tone={kpis.optOutRate > 0.05 ? "danger" : undefined}
          />
          <Secondary label="Most Responsive Time" value={timing.bestBand ?? "—"} />
          <Secondary label="Best Send Day" value={timing.bestDay ?? "—"} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <RevenueFunnel steps={funnel} />
        <AiInsights insights={insights} />
      </div>

      <div className="mb-6">
        <PerformanceChart daily={daily} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <CampaignLeaderboard campaigns={campaigns} />
        <div className="space-y-6">
          <BestMessagePanel best={bestMessage} />
          <RecentConversations recent={recent} />
        </div>
      </div>

      <NumberHealthPanel data={numbers} />
    </div>
  );
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
