import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Sparkles, Trash2, MessageSquare, Lock } from "lucide-react";
import { spinCount, spinSample } from "@/lib/spintax";
import { segmentsFor } from "@/lib/drops";
import { STOP_FOOTER, hasStopFooter } from "@/lib/compliance-rules";

export type DripStep = { step_order: number; delay_minutes: number; body: string };

const UNITS = [
  { id: "minutes", label: "Minutes", mult: 1 },
  { id: "hours", label: "Hours", mult: 60 },
  { id: "days", label: "Days", mult: 60 * 24 },
] as const;

export type DurationUnit = (typeof UNITS)[number]["id"];

/** Best-fitting {value, unit} pair for a minute count. */
export function splitDuration(minutes: number): { value: number; unit: DurationUnit } {
  if (minutes > 0 && minutes % (60 * 24) === 0) return { value: minutes / (60 * 24), unit: "days" };
  if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

export function toMinutes(value: number, unit: DurationUnit): number {
  return Math.max(0, Math.round(value)) * (UNITS.find((u) => u.id === unit)?.mult ?? 1);
}

/** "2 Days 3 Hours" style duration label. */
export function humanDuration(minutes: number): string {
  if (minutes <= 0) return "0 Minutes";
  const d = Math.floor(minutes / (60 * 24));
  const h = Math.floor((minutes % (60 * 24)) / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d} ${d === 1 ? "Day" : "Days"}`);
  if (h) parts.push(`${h} ${h === 1 ? "Hour" : "Hours"}`);
  if (m) parts.push(`${m} ${m === 1 ? "Minute" : "Minutes"}`);
  return parts.slice(0, 2).join(" ");
}

export function humanDelay(minutes: number): string {
  if (minutes <= 0) return "Immediately";
  return `${humanDuration(minutes)} After Previous`;
}

/**
 * Drip sequence builder. Each touch has its own wait duration (minutes / hours /
 * days) measured from the previous touch, plus Spintax preview and segment count.
 */
export function DripEditor({
  steps,
  onChange,
  max = 12,
}: {
  steps: DripStep[];
  onChange: (next: DripStep[]) => void;
  max?: number;
}) {
  const renumber = (next: DripStep[]) => next.map((s, i) => ({ ...s, step_order: i + 1 }));

  const patch = (i: number, p: Partial<DripStep>) => onChange(renumber(steps.map((s, idx) => (idx === i ? { ...s, ...p } : s))));

  const addStep = () => {
    if (steps.length >= max) return;
    onChange(renumber([...steps, { step_order: steps.length + 1, delay_minutes: 60 * 24, body: "" }]));
  };

  const removeStep = (i: number) => onChange(renumber(steps.filter((_, idx) => idx !== i)));

  const totalMinutes = steps.reduce((a, s) => a + s.delay_minutes, 0);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Drip Sequence
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase">
            {steps.length} Touch{steps.length === 1 ? "" : "es"} · {humanDuration(totalMinutes)} Total
          </Badge>
          <Button size="sm" variant="outline" className="rounded-full h-8" onClick={addStep} disabled={steps.length >= max}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Drip
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((s, i) => {
          const { value, unit } = splitDuration(s.delay_minutes);
          return (
            <div key={i} className="relative rounded-xl border border-border p-4 space-y-3">
              <span className="absolute left-0 top-6 -ml-px h-[calc(100%-1.5rem)] w-0.5 bg-primary/20" aria-hidden />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {s.step_order}
                  </span>
                  <div className="font-semibold text-foreground">Touch {s.step_order}</div>
                  <span className="text-xs text-muted-foreground">· {humanDelay(s.delay_minutes)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs whitespace-nowrap">Wait</Label>
                  <Input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => patch(i, { delay_minutes: toMinutes(Number(e.target.value) || 0, unit) })}
                    className="h-8 w-20"
                  />
                  <Select value={unit} onValueChange={(u) => patch(i, { delay_minutes: toMinutes(value, u as DurationUnit) })}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (<SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {steps.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeStep(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              <Textarea
                rows={2}
                value={s.body}
                onChange={(e) => patch(i, { body: e.target.value })}
                placeholder="Hi {{first_name}} — quick question about your {{niche}} in {{city}}?"
              />
              {/* Opt-out footer is appended server-side and cannot be edited or removed. */}
              {i === 0 && !hasStopFooter(s.body) && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  <span>
                    Auto-Appended: <span className="font-semibold text-foreground">{STOP_FOOTER}</span> — Required, Cannot Be Removed.
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{s.body.length} Chars · {segmentsFor(s.body)} Segment{segmentsFor(s.body) === 1 ? "" : "s"}</span>
                <span>Tokens: <code>{`{{first_name}}`}</code> <code>{`{{city}}`}</code> <code>{`{{state}}`}</code> <code>{`{{address}}`}</code></span>
                <span>Spintax: <code>{`{Hi|Hello|Hey}`}</code> rotates automatically.</span>
              </div>
              <SpintaxPreview body={s.body} />
            </div>
          );
        })}
        {steps.length === 0 && (
          <div className="text-sm text-muted-foreground">No Touches Yet — Add Your First Drip.</div>
        )}
      </CardContent>
    </Card>
  );
}

function SpintaxPreview({ body }: { body: string }) {
  const count = spinCount(body);
  if (count <= 1) return null;
  const samples = spinSample(body, 3);
  return (
    <div className="rounded-lg bg-surface-muted p-3 space-y-1">
      <div className="text-xs font-semibold text-foreground flex items-center gap-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> {count.toLocaleString()} Unique Variations
      </div>
      {samples.map((v, i) => (<div key={i} className="text-xs text-muted-foreground">→ {v}</div>))}
    </div>
  );
}
