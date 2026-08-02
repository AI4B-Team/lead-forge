import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Gauge,
  Rocket,
  CircleDot,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { HealthCheck, Projection, Suggestion } from "@/lib/campaign-insights";
import { humanDuration } from "@/components/app/drip-editor";

export type WizardStep = { id: string; label: string; done: boolean };

/** Vertical wizard rail so the builder reads as a process, not a form. */
export function WizardProgress({ steps, active }: { steps: WizardStep[]; active: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display uppercase tracking-wider text-muted-foreground">
          Build Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="relative">
          {steps.map((s, i) => {
            const current = s.id === active;
            return (
              <li key={s.id} className="flex items-start gap-3 pb-3 last:pb-0">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid place-items-center h-6 w-6 rounded-full text-[11px] font-display font-bold shrink-0 transition ${
                      s.done
                        ? "bg-success text-white"
                        : current
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {i < steps.length - 1 && <span className="w-px flex-1 min-h-4 bg-border mt-1" />}
                </div>
                <a
                  href={`#step-${s.id}`}
                  className={`text-sm leading-6 ${current || s.done ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

/** Live compliance + deliverability panel replacing the old bullet list. */
export function CampaignHealthPanel({
  checks,
  deliverability,
  perDay,
  durationDays,
}: {
  checks: HealthCheck[];
  deliverability: number;
  perDay: number;
  durationDays: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" /> Campaign Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-2">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${c.ok ? "bg-success" : "bg-warn"}`}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground leading-tight">{c.label}</div>
                <div className="text-[11px] text-muted-foreground">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Est. Deliverability</span>
            <span className="text-foreground font-display text-base">{deliverability}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${deliverability}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Messages / Day</div>
              <div className="font-display font-bold text-foreground">{perDay.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Projected Duration</div>
              <div className="font-display font-bold text-foreground">{durationDays} Days</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Live summary of everything the operator has configured so far. */
export function CampaignSummaryPanel({
  name,
  brandName,
  listName,
  projection,
  replyRate,
}: {
  name: string;
  brandName: string;
  listName: string;
  projection: Projection;
  replyRate: number;
}) {
  const rows: Array<[string, string]> = [
    ["Campaign", name || "Untitled"],
    ["AI Agent", brandName || "Not Set Up"],
    ["List", listName || "Not Selected"],
    ["Contacts", projection.recipients.toLocaleString()],
    ["Daily Cap", projection.perDay.toLocaleString()],
    ["Touches", String(projection.touches)],
    ["Duration", `${projection.durationDays} Days`],
    ["Projected Messages", projection.projectedMessages.toLocaleString()],
    ["Est. Credits", projection.credits.toLocaleString()],
    ["Est. Cost", `$${projection.dollars.toLocaleString()}`],
    ["Expected Reply Rate", `${replyRate}%`],
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-primary" /> Campaign Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-semibold text-foreground text-right truncate">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Heuristic AI coaching so the builder feels intelligent, not static. */
export function AiSuggestionsPanel({ suggestions, replyRate }: { suggestions: Suggestion[]; replyRate: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((s) => (
          <div key={s.text} className="flex items-start gap-2 text-sm">
            {s.tone === "ok" ? (
              <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warn mt-0.5 shrink-0" />
            )}
            <span className="text-muted-foreground">{s.text}</span>
          </div>
        ))}
        <div className="pt-1 flex items-center justify-between text-sm border-t border-border mt-2 pt-2">
          <span className="text-muted-foreground">Expected Reply Rate</span>
          <span className="font-display font-bold text-foreground">{replyRate}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Phone mockup that re-renders every time the sequence changes. */
export function PhonePreview({
  messages,
  lead,
  readingSeconds,
  spam,
  personalization,
}: {
  messages: Array<{ label: string; body: string }>;
  lead: { name: string; context: string };
  readingSeconds: number;
  spam: "Low" | "Medium" | "High";
  personalization: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" /> AI Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-[1.75rem] border-4 border-foreground/85 bg-surface-muted p-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-foreground/25" />
          <div className="text-center">
            <div className="font-display font-bold text-sm text-foreground">{lead.name}</div>
            <div className="text-[11px] text-muted-foreground">{lead.context}</div>
          </div>
          <div className="mt-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6">Write A Touch To See The Preview.</div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {m.label}
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {m.body}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Reading Time" value={`${readingSeconds}s`} />
          <MiniStat label="Spam Score" value={spam} tone={spam === "Low" ? "ok" : spam === "Medium" ? "warn" : "bad"} />
          <MiniStat label="Personalized" value={`${personalization}%`} />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "warn" ? "text-warn" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border border-border p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display font-bold text-sm ${color}`}>{value}</div>
    </div>
  );
}

/** Per-touch expected reply contribution under the drip editor. */
export function SequenceAnalytics({
  touches,
}: {
  touches: Array<{ label: string; delay: number; lift: number; chars: number }>;
}) {
  const max = Math.max(...touches.map((t) => t.lift), 1);
  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Sequence Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {touches.map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm font-semibold text-foreground">{t.label}</span>
            <span className="w-36 shrink-0 text-xs text-muted-foreground">
              {t.delay <= 0 ? "Immediately" : `${humanDuration(t.delay)} Later`}
            </span>
            <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(t.lift / max) * 100}%` }} />
            </div>
            <span className="w-24 text-right text-xs font-semibold text-foreground">
              {i === 0 ? `${t.lift}% Reply` : `+${t.lift}%`}
            </span>
            <span className="w-20 text-right text-[11px] text-muted-foreground">{t.chars} Chars</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Launch review — the rocket moment instead of a bare Send button. */
export function LaunchReview({
  projection,
  checks,
  onLaunch,
  onSchedule,
  saving,
  scheduleLabel,
}: {
  projection: Projection;
  checks: HealthCheck[];
  onLaunch: () => void;
  onSchedule: () => void;
  saving: boolean;
  scheduleLabel: string;
}) {
  const blocking = checks.filter((c) => !c.ok);
  return (
    <Card className="border-primary/40 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" /> Ready To Launch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Big label="Contacts" value={projection.recipients.toLocaleString()} />
          <Big label="Touches" value={String(projection.touches)} />
          <Big label="Messages" value={projection.projectedMessages.toLocaleString()} />
          <Big label="Per Day" value={projection.perDay.toLocaleString()} />
          <Big label="Completion" value={`${projection.durationDays} Days`} />
          <Big label="Est. Cost" value={`$${projection.dollars.toLocaleString()}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          {checks.map((c) => (
            <Badge
              key={c.label}
              variant="outline"
              className={`rounded-full gap-1 ${c.ok ? "border-success/40 text-success" : "border-warn/40 text-warn"}`}
            >
              {c.ok ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {c.label}
            </Badge>
          ))}
        </div>
        {blocking.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {blocking.length} Item{blocking.length === 1 ? "" : "s"} Still Open — You Can Still Build And Schedule.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-full" size="lg" onClick={onLaunch} disabled={saving}>
            <Rocket className="h-4 w-4 mr-1" /> {saving ? "Working…" : "Launch Campaign"}
          </Button>
          <Button variant="outline" className="rounded-full" size="lg" onClick={onSchedule} disabled={saving}>
            {scheduleLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-black text-foreground">{value}</div>
    </div>
  );
}
