import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Trophy,
  Filter,
  MessageSquare,
  PhoneCall,
  ShieldAlert,
  Snowflake,
  CircleCheck,
  Quote,
  ArrowRight,
} from "lucide-react";
import { INTENT_LABELS, formatMoney, type Intent } from "@/lib/performance-intel";

/** Executive KPI tile with period-over-period movement. */
export function KpiCard({
  label,
  value,
  sub,
  deltaPct,
  invert,
  icon: Icon,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  deltaPct?: number | null;
  invert?: boolean;
  icon?: typeof Trophy;
  emphasis?: boolean;
}) {
  const good = deltaPct == null ? null : invert ? deltaPct <= 0 : deltaPct >= 0;
  return (
    <Card className={emphasis ? "border-primary/40 bg-primary/[0.03]" : undefined}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />} {label}
        </div>
        <div className="mt-2 font-display text-3xl font-black text-foreground">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {deltaPct != null && (
            <span className={`flex items-center gap-0.5 font-semibold ${good ? "text-success" : "text-danger"}`}>
              {deltaPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(deltaPct)}%
            </span>
          )}
          <span className="text-muted-foreground">{sub ?? "vs Previous Period"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Revenue funnel: where leads drop off between send and close. */
export function RevenueFunnel({ steps }: { steps: Array<{ label: string; value: number }> }) {
  const top = Math.max(steps[0]?.value ?? 0, 1);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" /> Revenue Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s, i) => {
          const prev = steps[i - 1]?.value;
          const conv = prev ? Math.round((s.value / Math.max(prev, 1)) * 100) : 100;
          return (
            <div key={s.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-display font-bold text-foreground">{s.value.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-3 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/80 transition-all"
                  style={{ width: `${Math.max((s.value / top) * 100, s.value ? 3 : 0)}%` }}
                />
              </div>
              {i > 0 && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{conv}% Of Previous Stage</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** AI insights derived from real sending history. */
export function AiInsights({
  insights,
}: {
  insights: Array<{ text: string; action?: string; campaignId?: string }>;
}) {
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((i) => (
          <div key={i.text} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden />
            <div className="min-w-0">
              <div className="text-sm text-foreground">{i.text}</div>
              {i.action && i.campaignId && (
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <Link to="/app/campaigns/$campaignId" params={{ campaignId: i.campaignId }}>
                    {i.action} <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const SERIES = [
  { id: "sent", label: "Messages", color: "hsl(var(--primary))" },
  { id: "replies", label: "Replies", color: "hsl(var(--warn))" },
  { id: "conversations", label: "Conversations", color: "hsl(var(--success))" },
  { id: "appointments", label: "Appointments", color: "hsl(var(--primary))" },
  { id: "revenue", label: "Pipeline", color: "hsl(var(--success))" },
] as const;

type SeriesId = (typeof SERIES)[number]["id"];

/** One chart, five lenses — the same day viewed as volume or revenue. */
export function PerformanceChart({
  daily,
}: {
  daily: Array<{ day: string; sent: number; delivered: number; replies: number; optOuts: number; conversations: number; qualified: number; appointments: number; revenue: number }>;
}) {
  const [series, setSeries] = useState<SeriesId>("replies");
  const active = SERIES.find((s) => s.id === series)!;
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base font-display">Performance Trend</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {SERIES.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={s.id === series ? "default" : "outline"}
              className="rounded-full h-7 text-xs"
              onClick={() => setSeries(s.id)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="perfG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={active.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={active.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<DayTooltip />} />
              <Area
                type="monotone"
                dataKey={series}
                stroke={active.color}
                strokeWidth={2}
                fill="url(#perfG)"
                name={active.label}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/** Rich hover card: every metric for that day, not just the active series. */
function DayTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: Record<string, number> }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  const rows: Array<[string, string]> = [
    ["Messages", Number(d['sent'] ?? 0).toLocaleString()],
    ["Delivered", Number(d['delivered'] ?? 0).toLocaleString()],
    ["Replies", Number(d['replies'] ?? 0).toLocaleString()],
    ["Conversations", Number(d['conversations'] ?? 0).toLocaleString()],
    ["Appointments", Number(d['appointments'] ?? 0).toLocaleString()],
    ["Opt-Outs", Number(d['optOuts'] ?? 0).toLocaleString()],
    ["Pipeline", formatMoney(Number(d['revenue'] ?? 0))],
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
      <div className="font-display font-bold text-sm text-foreground mb-1.5">{String(label ?? "")}</div>
      <div className="space-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-6 text-xs">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Campaign leaderboard ranked by appointments booked. */
export function CampaignLeaderboard({
  campaigns,
}: {
  campaigns: Array<{ id: string; name: string; status: string; sent: number; replies: number; appointments: number; qualified: number; replyRate: number; optOutRate: number }>;
}) {
  const top = Math.max(...campaigns.map((c) => c.appointments || c.replies), 1);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Campaign Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No Campaign Activity Yet.</div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c, i) => (
              <Link
                key={c.id}
                to="/app/campaigns/$campaignId"
                params={{ campaignId: c.id }}
                className="block rounded-xl border border-border p-3 transition hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-muted-foreground text-sm w-5">{i + 1}</span>
                  <span className="font-display font-bold text-foreground text-sm truncate">{c.name}</span>
                  <Badge variant="outline" className="ml-auto uppercase text-[10px] shrink-0">{c.status}</Badge>
                </div>
                <div className="mt-2 h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(((c.appointments || c.replies) / top) * 100, 3)}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
                  <span className="font-display font-bold text-foreground">{c.appointments} Appointments</span>
                  <span className="text-muted-foreground">{(c.replyRate * 100).toFixed(1)}% Reply Rate</span>
                  <span className="text-muted-foreground">{c.qualified} Qualified</span>
                  <span className={c.optOutRate > 0.05 ? "text-danger" : "text-muted-foreground"}>
                    {(c.optOutRate * 100).toFixed(1)}% Opt-Out
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Number health grid with reputation buckets and rotation status. */
export function NumberHealthPanel({
  data,
}: {
  data: {
    rows: Array<{ id: string; phone: string; status: string | null; health_score: number | null; optout_rate: number | null }>;
    healthy: number;
    cooling: number;
    flagged: number;
    avgReputation: number;
    rotation: boolean;
  };
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-primary" /> Number Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <HealthTile icon={CircleCheck} label="Healthy" value={String(data.healthy)} tone="success" />
          <HealthTile icon={Snowflake} label="Cooling" value={String(data.cooling)} tone="warn" />
          <HealthTile icon={ShieldAlert} label="Flagged" value={String(data.flagged)} tone="danger" />
          <HealthTile label="Avg Reputation" value={`${data.avgReputation}%`} />
          <HealthTile label="Rotation" value={data.rotation ? "Active" : "Single"} tone={data.rotation ? "success" : undefined} />
        </div>
        {data.rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <div className="font-display font-bold text-foreground">No Sending Numbers Yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              Buy Local Numbers To Start Rotating Traffic And Building Carrier Reputation.
            </div>
            <Button asChild size="sm" className="rounded-full mt-3">
              <Link to="/app/numbers">Manage Numbers</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.rows.map((n) => {
              const score = Number(n.health_score ?? 0);
              const tone = score >= 80 ? "bg-success" : score >= 50 ? "bg-warn" : "bg-danger";
              return (
                <div key={n.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{n.phone}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${tone}`} aria-hidden />
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="uppercase">{n.status ?? "active"}</span>
                    <span>{score}% · {((n.optout_rate ?? 0) * 100).toFixed(1)}% Opt-Out</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon?: typeof CircleCheck;
  label: string;
  value: string;
  tone?: "success" | "warn" | "danger";
}) {
  const color = tone === "success" ? "text-success" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className={`mt-1 font-display text-xl font-black ${color}`}>{value}</div>
    </div>
  );
}

/** Winning copy so operators can clone what already works. */
export function BestMessagePanel({
  best,
}: {
  best: { body: string; sent: number; replies: number; replyRate: number; campaigns: number } | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Quote className="h-4 w-4 text-primary" /> Best Performing Message
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!best ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No Outbound Copy To Score Yet.</div>
        ) : (
          <>
            <div className="rounded-2xl rounded-bl-sm bg-primary px-4 py-3 text-sm text-primary-foreground">
              {best.body}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Reply Rate" value={`${(best.replyRate * 100).toFixed(0)}%`} />
              <MiniStat label="Times Sent" value={best.sent.toLocaleString()} />
              <MiniStat label="Used In" value={`${best.campaigns} Campaign${best.campaigns === 1 ? "" : "s"}`} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-sm text-foreground">{value}</div>
    </div>
  );
}

const INTENT_TONE: Record<string, string> = {
  appointment: "border-success/40 text-success",
  qualified: "border-success/40 text-success",
  question: "border-primary/40 text-primary",
  negative: "border-warn/40 text-warn",
  optout: "border-danger/40 text-danger",
  neutral: "border-border text-muted-foreground",
};

/** Live conversation feed keeps the page feeling alive. */
export function RecentConversations({
  recent,
}: {
  recent: Array<{ id: string; name: string; place: string; body: string; intent: string; at: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Latest Conversations
        </CardTitle>
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
          <Link to="/app/inbox">Open Conversations <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No Inbound Replies Yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((r) => (
              <div key={r.id} className="py-2.5 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">{r.name}</span>
                    <Badge variant="outline" className={`rounded-full text-[10px] ${INTENT_TONE[r.intent] ?? ""}`}>
                      {INTENT_LABELS[r.intent as Intent] ?? "Replied"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{r.body}</div>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{ago(r.at)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Just Now";
  if (mins < 60) return `${mins} Min Ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} Hr Ago`;
  return `${Math.round(hrs / 24)} Days Ago`;
}
