import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { launchCampaignFromJob } from "@/lib/jobs.functions";
import { updateCampaignConfig, previewCampaign, scheduleCampaignDrops } from "@/lib/campaigns.functions";
import { getRegistration } from "@/lib/numbers.functions";
import { TagPicker } from "@/components/app/tag-picker";
import { BrandPicker } from "@/components/app/brand-picker";
import { BotTrainer } from "@/components/app/bot-trainer";
import { ShieldCheck, BrainCircuit, Zap, CalendarClock, BadgeCheck, ArrowRight } from "lucide-react";
import { DEFAULT_DROP_TIMES, formatTime12 } from "@/lib/drops";
import { TimePicker12h } from "@/components/app/time-picker-12h";
import { DripEditor, type DripStep } from "@/components/app/drip-editor";

export const Route = createFileRoute("/_authenticated/app/campaigns/new")({
  head: () => ({ meta: [{ title: "New Campaign — LeadTrace" }] }),
  component: NewCampaign,
});

const DEFAULT_STEPS: DripStep[] = [
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
  const [brandId, setBrandId] = useState<string | null>(null);
  const [dropSize, setDropSize] = useState(500);
  const [dropTimes, setDropTimes] = useState<string[]>(DEFAULT_DROP_TIMES);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [startTime, setStartTime] = useState("10:00");
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "resend">("skip");
  const [steps, setSteps] = useState<DripStep[]>(DEFAULT_STEPS);
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
  // Instant = first drop leaves immediately; scheduled = first drop at the
  // chosen local date/time, remaining drops follow the drop-time slots.
  const startAt =
    sendMode === "schedule"
      ? new Date(`${startDate}T${startTime}:00`).toISOString()
      : new Date().toISOString();

  const { data: preview } = useQuery({
    queryKey: [
      "campaign-preview",
      selectedJob,
      dropSize,
      dropTimes,
      sendMode,
      sendMode === "schedule" ? startAt : "now",
      steps.map((s) => s.body).join("|"),
    ],
    queryFn: () =>
      previewFn({
        data: {
          jobId: selectedJob,
          dropSize,
          dropTimes,
          bodies: steps.map((s) => s.body),
          startAt,
          instant: sendMode === "now",
        },
      }),
    enabled: !!selectedJob,
  });

  const submit = async (mode: "now" | "schedule" = sendMode) => {
    if (!brandId) return toast.error("Pick Or Create A Brand First");
    if (!selectedJob) return toast.error("Pick A Ready List First");
    if (!name.trim()) return toast.error("Name Your Campaign");
    const cleanSteps = steps.filter((s) => s.body.trim().length > 0);
    if (!cleanSteps.length) return toast.error("Write At Least One Message");
    const when =
      mode === "schedule" ? new Date(`${startDate}T${startTime}:00`) : new Date();
    if (mode === "schedule" && Number.isNaN(when.getTime())) return toast.error("Pick A Valid Send Date & Time");
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
          brand_id: brandId,
          drop_size: dropSize,
          drop_times: dropTimes,
          duplicate_policy: duplicatePolicy,
          steps: cleanSteps.map((s, i) => ({
            step_order: i + 1,
            delay_minutes: s.delay_minutes,
            message_variants: [s.body.trim().slice(0, 320)],
          })),
        },
      });
      await scheduleFn({
        data: {
          campaignId,
          recipients: preview?.recipients ?? 0,
          startAt: when.toISOString(),
          instant: mode === "now",
        },
      });
      toast.success(mode === "now" ? "Campaign Created — First Drop Sending Now" : "Campaign Scheduled");
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

      <Step n={1} title="Brand & Bot Training" hint="The Bot Only Speaks From Approved Brand Material.">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {workspaceId && <BrandPicker workspaceId={workspaceId} value={brandId} onChange={setBrandId} />}
            {brandId ? (
              <BotTrainer key={brandId} brandId={brandId} heading="Train This Brand" />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <BrainCircuit className="h-5 w-5 text-primary mx-auto" />
                <div className="font-display font-bold text-foreground mt-2">Start With Your Brand</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Select A Brand Above, Or Create One — Then Train The Bot With Text, Dictation, Files Or URLs.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Step>

      <Step n={2} title="Pick A Ready List" hint="Only Clean, Scrubbed Lists Can Be Loaded.">
        <Card>
          <CardContent className="pt-6">
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
      </Step>

      <Step n={3} title="Campaign Setup" hint="Naming, Tagging, Pacing And Quiet Hours.">
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
              <div>
                <Label>Drop Size</Label>
                <Input type="number" min={50} max={5000} step={50} value={dropSize} onChange={(e) => setDropSize(Number(e.target.value) || 500)} />
                <div className="text-[11px] text-muted-foreground mt-1">Operator-Proven Default: 500 Contacts Per Drop.</div>
              </div>
              <div>
                <Label>Duplicates</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(["skip", "resend"] as const).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={duplicatePolicy === p ? "default" : "outline"}
                      className="rounded-full h-8"
                      onClick={() => setDuplicatePolicy(p)}
                    >
                      {p === "skip" ? "Skip Already-Messaged" : "Allow Resend"}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>When To Send</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={sendMode === "now" ? "default" : "outline"}
                    className="rounded-full h-8"
                    onClick={() => setSendMode("now")}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" /> Send Instantly
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sendMode === "schedule" ? "default" : "outline"}
                    className="rounded-full h-8"
                    onClick={() => setSendMode("schedule")}
                  >
                    <CalendarClock className="h-3.5 w-3.5 mr-1" /> Schedule Drop
                  </Button>
                </div>
                {sendMode === "now" ? (
                  <div className="text-[11px] text-muted-foreground mt-2">
                    First Drop Goes Out Right Away. Remaining Drops Follow Your Drop Times Below.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
                    <Label className="text-xs">First Drop Date & Time</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 w-[160px]"
                      />
                      <TimePicker12h value={startTime} onChange={setStartTime} />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Starts {formatTime12(startTime)} Local · Compliant Outreach Runs 8:00 AM – 8:00 PM Recipient Local
                      Time, And A New Drop Never Starts After 6:00 PM.
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Drop Times (Local)</Label>
                <div className="mt-1 grid gap-2">
                  {dropTimes.map((t, i) => (
                    <TimePicker12h
                      key={i}
                      value={t}
                      onChange={(v) => setDropTimes(dropTimes.map((x, idx) => (idx === i ? v : x)))}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">New Drops Never Start After 6:00 PM Recipient Local Time.</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quiet Start</Label>
                  <TimePicker12h value={quietStart} onChange={setQuietStart} className="mt-1" />
                </div>
                <div>
                  <Label>Quiet End</Label>
                  <TimePicker12h value={quietEnd} onChange={setQuietEnd} className="mt-1" />
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
              <div>· A New Drop Never Starts After 6:00 PM Recipient Local Time.</div>
              <div>· Outreach Hours: 8:00 AM – 8:00 PM Recipient Local Time (TCPA).</div>
            </CardContent>
          </Card>
        </div>
      </Step>

      <Step n={4} title="Drip Sequence" hint="Each Touch Waits Its Own Duration Before Sending.">
        <DripEditor steps={steps} onChange={setSteps} />
      </Step>

      {preview && (
        <Step n={5} title="Review · Cost & Drop Plan" hint="Exact Recipients, Duplicates Removed And Credit Estimate.">
          <Card>
            <CardContent className="pt-6">
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
        </Step>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline" className="rounded-full"><Link to="/app/campaigns">Cancel</Link></Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => {
            setSendMode("schedule");
            void submit("schedule");
          }}
          disabled={saving}
        >
          <CalendarClock className="h-4 w-4 mr-1" /> {saving ? "Working…" : "Schedule Drop"}
        </Button>
        <Button className="rounded-full" onClick={() => submit("now")} disabled={saving}>
          <Zap className="h-4 w-4 mr-1" /> {saving ? "Working…" : "Send Now"}
        </Button>
      </div>
    </div>
  );
}

/** Numbered section wrapper so the builder reads top-to-bottom. */
function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="grid place-items-center h-7 w-7 rounded-full bg-primary text-primary-foreground font-display font-bold text-xs shrink-0">
          {n}
        </span>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground leading-tight">{title}</h2>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-black text-foreground">{value}</div>
    </div>
  );
}