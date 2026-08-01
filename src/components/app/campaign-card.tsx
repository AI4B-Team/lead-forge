import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquareQuote, UserRound, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignTagMenu } from "@/components/app/campaign-tag-menu";
import { TagBadge } from "@/components/app/tag-badge";
import { healthLabel, timeAgo, emptyStats, type CampaignStats } from "@/lib/campaign-stats";

type Tone = "green" | "blue" | "yellow" | "gray" | "red" | "purple";

const TONE: Record<string, Tone> = {
  running: "green",
  active: "green",
  sending: "green",
  scheduled: "blue",
  paused: "yellow",
  draft: "gray",
  failed: "red",
  review: "purple",
};

const LABEL: Record<string, string> = { review: "Needs Review" };

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-success/10 text-success border-success/25",
  blue: "bg-info/10 text-info border-info/25",
  yellow: "bg-warn/10 text-warn border-warn/25",
  gray: "bg-muted text-muted-foreground border-border",
  red: "bg-danger/10 text-danger border-danger/25",
  purple: "bg-review/10 text-review border-review/25",
};

const DOT_CLASS: Record<Tone, string> = {
  green: "bg-success",
  blue: "bg-info",
  yellow: "bg-warn",
  gray: "bg-muted-foreground",
  red: "bg-danger",
  purple: "bg-review",
};

export function CampaignStatusBadge({ status }: { status?: string | null }) {
  const key = (status ?? "draft").toLowerCase();
  const tone = TONE[key] ?? "gray";
  const label = LABEL[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <Badge variant="outline" className={cn(TONE_CLASS[tone], "gap-1.5 text-[11px] font-semibold")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[tone], tone === "green" && "animate-pulse")} />
      {label}
    </Badge>
  );
}

function healthTone(health: number) {
  if (health >= 85) return "bg-success";
  if (health >= 70) return "bg-info";
  if (health >= 50) return "bg-warn";
  return "bg-danger";
}

function SubStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="font-display text-base font-bold tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

/** Campaign card as a mini dashboard: one dominant number, live AI signal, latest reply. */
export function CampaignCard({
  campaign: c,
  stats,
  tag,
  workspaceId,
}: {
  campaign: any;
  stats?: CampaignStats;
  tag?: any;
  workspaceId?: string | null;
}) {
  const s = stats ?? emptyStats();
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-2">
          <CampaignStatusBadge status={c.status} />
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {workspaceId ? (
              <CampaignTagMenu workspaceId={workspaceId} campaignId={c.id} tag={tag} />
            ) : (
              tag && <TagBadge tag={tag} />
            )}
          </div>
        </div>

        <Link to="/app/campaigns/$campaignId" params={{ campaignId: c.id }} className="mt-3 block">
          <div className="font-display text-lg font-bold leading-tight text-foreground group-hover:text-primary">
            {c.name}
          </div>
        </Link>

        {/* Health bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" /> Health
            </span>
            <span className="tabular-nums text-foreground">
              {s.health}% · {healthLabel(s.health)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", healthTone(s.health))} style={{ width: `${s.health}%` }} />
          </div>
        </div>

        {/* Dominant number */}
        <div className="mt-4 flex items-end gap-2">
          <div className="font-display text-4xl font-black leading-none tabular-nums text-foreground">
            {s.sent.toLocaleString()}
          </div>
          <div className="pb-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sent</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
          <SubStat label="Delivered" value={`${s.deliveryRate}%`} />
          <SubStat label="Replies" value={s.replies} />
          <SubStat label="AI Chats" value={s.aiChats} />
          <SubStat label="Opt-Outs" value={s.optOuts} />
        </div>

        {/* Latest reply proof */}
        {s.latestReply ? (
          <div className="mt-4 rounded-xl border border-border bg-surface-muted/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <MessageSquareQuote className="h-3 w-3" /> Latest Reply
              <span className="ml-auto normal-case tracking-normal">{timeAgo(s.latestReply.at)}</span>
            </div>
            <div className="mt-1.5 line-clamp-2 text-sm italic text-foreground">“{s.latestReply.body}”</div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            No Replies Yet — Conversations Will Appear Here Live.
          </div>
        )}

        {/* AI activity strip */}
        {c.bot_enabled && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              <Bot className="h-3.5 w-3.5" /> AI Active
            </span>
            <span className="text-muted-foreground">
              Handling <span className="font-bold tabular-nums text-foreground">{s.aiChats}</span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Waiting <span className="font-bold tabular-nums text-foreground">{s.awaiting}</span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <UserRound className="h-3 w-3" /> Needs Human{" "}
              <span className={cn("font-bold tabular-nums", s.needsHuman > 0 ? "text-warn" : "text-foreground")}>{s.needsHuman}</span>
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Cap {c.daily_cap ?? 500}/Day</span>
          <span>Reply Rate {s.replyRate}% · Opt-Out {s.optOutRate}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
