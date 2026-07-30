import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, Send, ShieldAlert, Bot } from "lucide-react";
import { toast } from "sonner";
import { getCampaignDetail, tickCampaign, updateCampaignStatus, updateCampaignConfig } from "@/lib/campaigns.functions";
import { BotConsole } from "@/components/app/bot-console";
import { BotTrainer } from "@/components/app/bot-trainer";
import { BrandPicker } from "@/components/app/brand-picker";
import { DripEditor, type DripStep } from "@/components/app/drip-editor";
import { useWorkspaceId } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated/app/campaigns/$campaignId")({
  head: () => ({ meta: [{ title: "Campaign Detail — LeadTrace" }] }),
  component: CampaignDetail,
});

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
              <Button className="rounded-full bg-success text-white hover:bg-success/90" onClick={() => setStatus("sending")}>
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

      <Card className="mb-6">
        <CardContent className="pt-6">
          <BrandAssignment campaignId={campaignId} brandId={campaign.brand_id ?? null} />
        </CardContent>
      </Card>

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

      <DripSequenceEditor
        campaignId={campaignId}
        steps={steps.map((s) => ({
          step_order: s.step_order,
          delay_minutes: s.delay_minutes,
          body: s.message_variants[0] ?? "",
        }))}
      />

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

      {campaign.brand_id ? (
        <BotTrainer key={campaign.brand_id} brandId={campaign.brand_id} heading="Brand Knowledge (Shared Across Campaigns)" />
      ) : (
        <BotTrainer campaignId={campaignId} heading="Campaign-Only Bot Training" />
      )}

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

/** Attach the campaign to a reusable brand so the bot inherits its knowledge. */
function BrandAssignment({ campaignId, brandId }: { campaignId: string; brandId: string | null }) {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspaceId();
  const saveConfig = useServerFn(updateCampaignConfig);

  const assign = async (id: string | null) => {
    try {
      await saveConfig({ data: { campaignId, brand_id: id } });
      qc.invalidateQueries({ queryKey: ["campaign-detail", campaignId] });
      toast.success(id ? "Brand Linked" : "Brand Cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update Failed");
    }
  };

  if (!workspaceId) return null;
  return <BrandPicker workspaceId={workspaceId} value={brandId} onChange={assign} />;
}

/** Editable drip sequence with per-touch wait duration, saved back to the campaign. */
function DripSequenceEditor({ campaignId, steps }: { campaignId: string; steps: DripStep[] }) {
  const qc = useQueryClient();
  const saveConfig = useServerFn(updateCampaignConfig);
  const [draft, setDraft] = useState<DripStep[]>(steps);
  const [saving, setSaving] = useState(false);
  const key = JSON.stringify(steps);

  useEffect(() => {
    setDraft(steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const dirty = JSON.stringify(draft) !== key;

  const save = async () => {
    const clean = draft.filter((s) => s.body.trim().length > 0);
    if (!clean.length) return toast.error("Write At Least One Message");
    setSaving(true);
    try {
      await saveConfig({
        data: {
          campaignId,
          steps: clean.map((s, i) => ({
            step_order: i + 1,
            delay_minutes: s.delay_minutes,
            message_variants: [s.body.trim().slice(0, 320)],
          })),
        },
      });
      toast.success("Drip Sequence Saved");
      qc.invalidateQueries({ queryKey: ["campaign-detail", campaignId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <DripEditor steps={draft} onChange={setDraft} />
      <div className="mt-3 flex justify-end gap-2">
        {dirty && (
          <Button variant="outline" className="rounded-full" onClick={() => setDraft(steps)} disabled={saving}>
            Reset
          </Button>
        )}
        <Button className="rounded-full" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save Drip Sequence"}
        </Button>
      </div>
    </div>
  );
}
