import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getWorkspaceAnalytics } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({ meta: [{ title: "Reports — LeadTrace" }] }),
  component: Reports,
});

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function Reports() {
  const { workspaceId } = useWorkspaceId();
  const fetchAnalytics = useServerFn(getWorkspaceAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["workspace-analytics", workspaceId],
    queryFn: () => fetchAnalytics({ data: { workspaceId: workspaceId!, days: 30 } }),
    enabled: !!workspaceId,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Analytics…
      </div>
    );
  }

  const { daily, totals, rates, campaigns, numbers } = data;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sending Volume, Delivery, Reply, And Opt-Out Trends Across Your Workspace."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sent (30d)" value={totals.sent.toLocaleString()} />
        <StatCard label="Delivery Rate" value={pct(rates.deliverRate)} tone="success" />
        <StatCard label="Reply Rate" value={pct(rates.replyRate)} tone="success" />
        <StatCard label="Opt-Out Rate" value={pct(rates.optOutRate)} tone={rates.optOutRate > 0.05 ? "danger" : undefined} />
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-display">Daily Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="delG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="sent" stroke="hsl(var(--primary))" fill="url(#sentG)" name="Sent" />
                <Area type="monotone" dataKey="delivered" stroke="hsl(var(--success))" fill="url(#delG)" name="Delivered" />
                <Area type="monotone" dataKey="replies" stroke="hsl(var(--warn))" fillOpacity={0} name="Replies" />
                <Area type="monotone" dataKey="optOuts" stroke="hsl(var(--danger))" fillOpacity={0} name="Opt-Outs" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Top Campaigns</CardTitle></CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No Campaign Activity In The Last 30 Days.</div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => {
                  const reply = c.sent ? c.replies / c.sent : 0;
                  const opt = c.sent ? c.optOuts / c.sent : 0;
                  return (
                    <div key={c.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground text-sm truncate">{c.name}</div>
                        <Badge variant="outline" className="uppercase text-[10px]">{c.status}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                        <Mini label="Sent" value={c.sent} />
                        <Mini label="Delivered" value={c.delivered} />
                        <Mini label="Replies" value={c.replies} tone="success" />
                        <Mini label="Opt-Outs" value={c.optOuts} tone={opt > 0.05 ? "danger" : undefined} />
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Reply {pct(reply)} · Opt-Out {pct(opt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-display">Number Health</CardTitle></CardHeader>
          <CardContent>
            {numbers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No Sending Numbers Yet.</div>
            ) : (
              <div className="space-y-2">
                {numbers.map((n) => {
                  const score = Number(n.health_score ?? 0);
                  const tone = score >= 80 ? "text-success" : score >= 50 ? "text-warn" : "text-danger";
                  return (
                    <div key={n.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                      <div>
                        <div className="font-medium text-foreground">{n.phone}</div>
                        <div className="text-xs text-muted-foreground uppercase">{n.status}</div>
                      </div>
                      <div className={`font-display font-bold text-lg ${tone}`}>{score}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className={`mt-2 font-display text-3xl font-black ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div>
      <div className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</div>
      <div className={`font-display font-bold ${toneClass}`}>{value.toLocaleString()}</div>
    </div>
  );
}