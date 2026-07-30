import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { launchCampaignFromJob } from "@/lib/jobs.functions";
import { updateCampaignConfig, previewCampaign, scheduleCampaignDrops } from "@/lib/campaigns.functions";
import { TagPicker } from "@/components/app/tag-picker";
import { ShieldCheck, Sparkles } from "lucide-react";
import { spinCount, spinSample } from "@/lib/spintax";
import { DEFAULT_DROP_TIMES } from "@/lib/drops";

export const Route = createFileRoute("/_authenticated/app/campaigns/new")({
  head: () => ({ meta: [{ title: "New Campaign — LeadTrace" }] }),
  component: NewCampaign,
});

const DEFAULT_STEPS = [
  { step_order: 1, delay_minutes: 0, body: "Hi {{first_name}} — quick question about your {{niche}} in {{city}}?" },
  { step_order: 2, delay_minutes: 180, body: "Following up — any interest?" },
  { step_order: 3, delay_minutes: 60 * 24 * 2, body: "Still exploring options in {{city}}? Happy to send info." },
  { step_order: 4, delay_minutes: 60 * 24 * 5, body: "Last check-in — want me to close this out?" },
];

function NewCampaign() {
  const { workspaceId } = useWorkspaceId();
  const navigate = useNavigate();
  const launchFn = useServerFn(launchCampaignFromJob);
  const configFn = useServerFn(updateCampaignConfig);
  const previewFn = useServerFn(previewCampaign);
  const scheduleFn = useServerFn(scheduleCampaignDrops);

  const [selectedJob, setSelectedJob] = useState<string>("");
  const [name, setName] = useState("");
  const [dailyCap, setDailyCap] = useState(500);
  const [quietStart, setQuietStart] = useState("21:00");
  const [quietEnd, setQuietEnd] = useState("09:00");
  const [tagId, setTagId] = useState<string | null>(null);
  const [dropSize, setDropSize] = useState(500);
  const [dropTimes, setDropTimes] = useState<string[]>(DEFAULT_DROP_TIMES);
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "resend">("skip");
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [saving, setSaving] = useState(false);

  const { data: jobs } = useQuery({
    queryKey: ["ready-jobs", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, source_type, status, rows_deduped, created_at, params")
        .eq("workspace_id", workspaceId!)
        .eq("status", "ready")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  // Review preview: real recipient count, duplicates found, drop plan, and
  // estimated credit cost before anything is created.
  const { data: preview } = useQuery({
    queryKey: ["campaign-preview", selectedJob, dropSize, dropTimes, steps.map((s) => s.body).join("|")],
    queryFn: () =>
      previewFn({
        data: {
          jobId: selectedJob,
          dropSize,
          dropTimes,
          bodies: steps.map((s) => s.body),
        },
      }),
    enabled: !!selectedJob,
  });

  const submit = async () => {
    if (!selectedJob) return toast.error("Pick A Ready List First");
    if (!name.trim()) return toast.error("Name Your Campaign");
    setSaving(true);
    try {
      const { campaignId } = await launchFn({ data: { jobId: selectedJob, name: name.trim() } });
      await configFn({
        data: {
          campaignId,
          daily_cap: dailyCap,
          quiet_start: quietStart,
          quiet_end: quietEnd,
          tag_id: tagId,
          drop_size: dropSize,
          drop_times: dropTimes,
          duplicate_policy: duplicatePolicy,
          steps: steps.map((s) => ({
            step_order: s.step_order,
            delay_minutes: s.delay_minutes,
            message_variants: [s.body],
          })),
        },
      });
      await scheduleFn({ data: { campaignId, recipients: preview?.recipients ?? 0 } });
      toast.success("Campaign Created");
      navigate({ to: "/app/campaigns/$campaignId", params: { campaignId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Campaign"
        description="Only Clean Leads Are Loaded. STOP Suppresses The Number Forever."
        actions={<Button asChild variant="outline" className="rounded-full"><Link to="/app/campaigns">Cancel</Link></Button>}
      />

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base font-display">Pick A Ready List</CardTitle></CardHeader>
        <CardContent>
          {!jobs?.length ? (
            <div className="text-sm text-muted-foreground">No Ready Lists Yet. Run A Job First.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {jobs.map((j) => {
                const active = j.id === selectedJob;
                const params = (j.params ?? {}) as { name?: string };
                return (
                  <button
                    key={j.id}
                    onClick={() => setSelectedJob(j.id)}
                    className={`text-left rounded-xl border p-4 transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="uppercase text-[10px]">{j.source_type}</Badge>
                      <span className="text-xs text-muted-foreground">{j.rows_deduped ?? 0} Rows</span>
                    </div>
                    <div className="font-display font-bold mt-2 text-foreground">{params.name ?? `Job ${j.id.slice(0, 8)}`}</div>
                    <div className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Basics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 Roof Homeowners — Tampa" />
            </div>
            {workspaceId && <TagPicker workspaceId={workspaceId} value={tagId} onChange={setTagId} />}
            <div>
              <Label>Daily Cap (Per Campaign)</Label>
              <Input type="number" min={1} max={5000} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value) || 0)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Drop Size</Label>
                <Input type="number" min={50} max={5000} step={50} value={dropSize} onChange={(e) => setDropSize(Number(e.target.value) || 500)} />
                <div className="text-[11px] text-muted-foreground mt-1">Operator-Proven Default: 500 Contacts Per Drop.</div>
              </div>
              <div>
                <Label>Duplicates</Label>
                <div className="mt-1 flex gap-1">
                  {(["skip", "resend"] as const).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={duplicatePolicy === p ? "default" : "outline"}
                      className="rounded-full capitalize h-8"
                      onClick={() => setDuplicatePolicy(p)}
                    >
                      {p === "skip" ? "Skip Already-Messaged" : "Allow Resend"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Drop Times (Local)</Label>
              <div className="mt-1 grid grid-cols-4 gap-2">
                {dropTimes.map((t, i) => (
                  <Input
                    key={i}
                    type="time"
                    value={t}
                    onChange={(e) => setDropTimes(dropTimes.map((x, idx) => (idx === i ? e.target.value : x)))}
                    className="h-8"
                  />
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">New Drops Never Start After 6PM Recipient Local Time.</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quiet Start</Label>
                <Input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
              </div>
              <div>
                <Label>Quiet End</Label>
                <Input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Compliance</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>· Only Leads With <span className="text-foreground font-semibold">scrub_status = clean</span> Are Loaded.</div>
            <div>· Sending Blocked Until 10DLC Campaign Is Approved.</div>
            <div>· Inbound STOP Adds The Number To Suppression Instantly.</div>
            <div>· Sending Numbers Auto-Cool Above 5% Opt-Out Rate.</div>
            <div>· A New Drop Never Starts After 6PM Recipient Local Time.</div>
          </CardContent>
        </Card>
      </div>

      {preview && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base font-display">Review · Cost & Drop Plan</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric label="Recipients" value={preview.recipients.toLocaleString()} />
              <Metric label="Duplicates Removed" value={preview.duplicates.toLocaleString()} />
              <Metric label="Segments" value={preview.cost.segments.toLocaleString()} />
              <Metric label="Est. Credits" value={preview.cost.credits.toLocaleString()} />
            </div>
            <div className="mt-4 rounded-xl border border-border p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                {preview.drops.length} Drop{preview.drops.length === 1 ? "" : "s"} · {dropSize} Contacts Each
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {preview.drops.slice(0, 12).map((d) => (
                  <div key={d.drop_index} className="rounded-lg bg-surface-muted px-3 py-2">
                    <div className="font-semibold text-foreground">Drop {d.drop_index}</div>
                    <div className="text-muted-foreground">{new Date(d.scheduled_at).toLocaleString()} · {d.size}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base font-display">Drip Sequence</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {steps.map((s, i) => (
            <div key={s.step_order} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-foreground">Touch {s.step_order}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Label className="text-xs">Delay (Min)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={s.delay_minutes}
                    onChange={(e) => setSteps(steps.map((x, idx) => idx === i ? { ...x, delay_minutes: Number(e.target.value) || 0 } : x))}
                    className="h-8 w-24"
                  />
                </div>
              </div>
              <Textarea
                rows={2}
                value={s.body}
                onChange={(e) => setSteps(steps.map((x, idx) => idx === i ? { ...x, body: e.target.value } : x))}
              />
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                <span>Tokens: <code>{`{{first_name}}`}</code> <code>{`{{city}}`}</code> <code>{`{{state}}`}</code> <code>{`{{address}}`}</code></span>
                <span>Spintax: <code>{`{Hi|Hello|Hey}`}</code> rotates automatically.</span>
              </div>
              <SpintaxPreview body={s.body} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-2">
        <Button asChild variant="outline" className="rounded-full"><Link to="/app/campaigns">Cancel</Link></Button>
        <Button className="rounded-full" onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create Campaign"}</Button>
      </div>
    </div>
  );
}

function SpintaxPreview({ body }: { body: string }) {
  const count = spinCount(body);
  const samples = count > 1 ? spinSample(body, 3) : [];
  if (count <= 1) return null;
  return (
    <div className="rounded-lg bg-surface-muted p-3 space-y-1">
      <div className="text-xs font-semibold text-foreground flex items-center gap-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {count.toLocaleString()} Unique Variations
      </div>
      {samples.map((v, i) => (
        <div key={i} className="text-xs text-muted-foreground">→ {v}</div>
      ))}
    </div>
  );
}