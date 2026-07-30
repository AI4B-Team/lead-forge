import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, Send, ShieldAlert, Bot } from "lucide-react";
import { toast } from "sonner";
import { getCampaignDetail, tickCampaign, updateCampaignStatus } from "@/lib/campaigns.functions";
import { BotConsole } from "@/components/app/bot-console";

export const Route = createFileRoute("/_authenticated/app/campaigns/$campaignId")({
  head: () => ({ meta: [{ title: "Campaign Detail — LeadTrace" }] }),
  component: CampaignDetail,
});

function fmtDelay(minutes: number) {
  if (minutes < 60) return minutes === 0 ? "Immediately" : `${minutes} Min`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} Hr`;
  return `${Math.round(minutes / (60 * 24))} Day`;
}

function CampaignDetail() {
  const { campaignId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getCampaignDetail);
  const updateStatus = useServerFn(updateCampaignStatus);
  const tick = useServerFn(tickCampaign);

  const { data, isLoading } = useQuery({
    queryKey: ["campaign-detail", campaignId],
    queryFn: () => fetchDetail({ data: { campaignId } }),
    refetchInterval: (q) => (q.state.data?.campaign.status === "sending" ? 3000 : false),
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading Campaign…</div>;
  const { campaign, steps, stats, recentMessages, drops, tag } = data;
  const win = (campaign.send_window ?? {}) as { quiet_start?: string; quiet_end?: string };

  const setStatus = async (status: "sending" | "paused" | "draft") => {
    try {
      await updateStatus({ data: { campaignId, status } });
      toast.success(`Campaign ${status === "sending" ? "Started" : status === "paused" ? "Paused" : "Reset"}`);
      qc.invalidateQueries({ queryKey: ["campaign-detail", campaignId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update Failed");
    }
  };

  const sendBatch = async () => {
    try {
      const res = await tick({ data: { campaignId, batchSize: 50 } });
      if (res.dispatched > 0) toast.success(`Dispatched ${res.dispatched} Messages`);
      else toast.message("Nothing Dispatched", { description: res.reason });
      qc.invalidateQueries({ queryKey: ["campaign-detail", campaignId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send Failed");
    }
  };

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description="Message Variants Rotate · Reply Halts Remaining Steps · Quiet Hours Enforced."
        actions={
          <>
            {tag && (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold border"
                style={{ backgroundColor: `${tag.color}1a`, color: tag.color, borderColor: `${tag.color}55` }}
              >
                {tag.name}
              </span>
            )}
            <Badge variant="outline" className="uppercase">{campaign.status ?? "draft"}</Badge>
            {campaign.status !== "sending" ? (
              <Button className="rounded-full bg-success text-success-foreground hover:bg-success/90" onClick={() => setStatus("sending")}>
                <Play className="mr-1 h-4 w-4" /> Start
              </Button>
            ) : (
              <Button className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => setStatus("paused")}>
                <Pause className="mr-1 h-4 w-4" /> Pause
              </Button>
            )}
            <Button className="rounded-full" variant="outline" onClick={sendBatch} disabled={campaign.status !== "sending"}>
              <Send className="mr-1 h-4 w-4" /> Send Batch
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Stat label="Recipients" value={stats.recipients} />
        <Stat label="Sent" value={stats.sent} />
        <Stat label="Delivered" value={stats.delivered} />
        <Stat label="Replies" value={stats.replies} tone="success" />
        <Stat label="Opt-Outs" value={stats.optOuts} tone="warn" />
        <Stat label="Bot Replies" value={stats.botHandled} />
        <Stat label="Handoffs" value={stats.handoffs} tone="warn" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Card><CardContent className="pt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Daily Cap · Drop Size</div>
          <div className="font-display font-bold text-2xl">{campaign.daily_cap ?? 500} · {campaign.drop_size ?? 500}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Quiet Hours</div>
          <div className="font-display font-bold text-2xl">{win.quiet_start ?? "21:00"} → {win.quiet_end ?? "09:00"}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-2">
          {campaign.bot_enabled ? <Bot className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-warn" />}
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Compliance</div>
            <div className="text-sm text-foreground">
              Clean-Only · STOP Auto-Suppresses{campaign.bot_enabled ? " · Bot On" : ""}
            </div>
          </div>
        </CardContent></Card>
      </div>

      {drops.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base font-display">Drop Schedule</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              {drops.map((d) => (
                <div key={d.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-foreground">Drop {d.drop_index}</div>
                    <Badge variant="outline" className="uppercase text-[10px]">{d.status ?? "pending"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(d.scheduled_at).toLocaleString()}</div>
                  <div className="text-xs text-foreground mt-1">{d.sent_count ?? 0} / {d.size} Sent</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base font-display">Drip Steps</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((s) => (
              <div key={s.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-foreground">Touch {s.step_order}</div>
                  <div className="text-muted-foreground">{fmtDelay(s.delay_minutes)} · {s.message_variants.length} Variant{s.message_variants.length === 1 ? "" : "s"}</div>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {s.message_variants.map((v, i) => (<li key={i}>• {v}</li>))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base font-display">Recent Messages</CardTitle></CardHeader>
        <CardContent>
          {recentMessages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No Messages Yet.</div>
          ) : (
            <div className="space-y-2">
              {recentMessages.slice(0, 20).map((m) => (
                <div key={m.id} className="text-xs flex items-center gap-2 border-b border-border pb-2">
                  <Badge variant="outline" className="uppercase">{m.direction}</Badge>
                  {m.is_optout && <Badge className="bg-warn/20 text-warn border-warn/30">Opt-Out</Badge>}
                  {m.is_bot && <Badge className="bg-primary/15 text-primary border-primary/30">Bot</Badge>}
                  {m.handoff_reason && <Badge variant="outline" className="text-[10px]">Handoff: {m.handoff_reason}</Badge>}
                  <div className="flex-1 truncate text-foreground">{m.body}</div>
                  <div className="text-muted-foreground">{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BotConsole
        campaignId={campaignId}
        enabled={!!campaign.bot_enabled}
        regulated={!!campaign.regulated_vertical}
        config={(campaign.bot_config ?? {}) as Record<string, never>}
      />

      <div className="mt-6 text-right">
        <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/app/campaigns" })}>Back To Campaigns</Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warn" ? "text-warn" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className={`mt-2 font-display text-2xl font-black ${toneClass}`}>{(value ?? 0).toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}