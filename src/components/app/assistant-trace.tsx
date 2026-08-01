import { Check, Loader2 } from "lucide-react";
import type { JobSpec } from "@/lib/assistant.shared";
import { US_STATES } from "@/lib/us-geo";

export type TraceStep = { label: string; value: string };

const SOURCE_LABEL: Record<string, string> = {
  business: "Business Search",
  records: "Public Records",
  upload: "Uploaded List",
};

/** Turns the assembled spec into the human-readable reasoning trail the AI "thought out loud". */
export function buildTraceSteps(spec: JobSpec): TraceStep[] {
  const steps: TraceStep[] = [];
  if (spec.sourceType) steps.push({ label: "Identified Source", value: SOURCE_LABEL[spec.sourceType] ?? spec.sourceType });
  if (spec.recordType) steps.push({ label: "Record Type", value: spec.recordType });
  if (spec.niches.length) steps.push({ label: "Industry", value: spec.niches.join(", ") });
  const stateName = spec.state ? US_STATES.find((s) => s.code === spec.state)?.name ?? spec.state : null;
  if (spec.counties.length) {
    // Counties often already carry their state suffix ("Hillsborough, FL") — don't double it.
    const suffix = spec.state && !spec.counties.some((c) => c.toUpperCase().endsWith(spec.state!.toUpperCase()))
      ? `, ${spec.state}`
      : "";
    steps.push({ label: "Location", value: `${spec.counties.join(", ")}${suffix}` });
  } else if (stateName) {
    steps.push({ label: "Location", value: stateName });
  }
  if (spec.recencyDays) steps.push({ label: "Recency Window", value: `Last ${spec.recencyDays} Days` });
  if (spec.mobileOnly) steps.push({ label: "Filtering For Mobile Numbers", value: "Enabled" });
  if (spec.skipTrace) steps.push({ label: "Skip Tracing Missing Numbers", value: "Enabled" });
  if (spec.removeFranchises) steps.push({ label: "Removing Franchises", value: "Enabled" });
  if (spec.dedupe) steps.push({ label: "Deduping Against Past Lists", value: "Enabled" });
  if (spec.industry) steps.push({ label: "Recommended Playbook", value: spec.industry });
  return steps;
}

/**
 * The live activity feed. `revealed` counts how many rows are visible so the
 * page reads as the assistant working through the request, not a form filling in.
 */
export function AssistantTrace({
  steps,
  revealed,
  thinking,
}: {
  steps: TraceStep[];
  revealed: number;
  thinking: boolean;
}) {
  const visible = steps.slice(0, revealed);
  const done = revealed >= steps.length && !thinking;

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/60 p-5">
      <div className="flex items-center gap-2">
        {done ? (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-success/15 text-success">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        <span className="font-display text-sm font-bold text-foreground">
          {done ? "Job Assembled" : "Building Your Job…"}
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {visible.map((s, i) => (
          <li
            key={`${s.label}-${i}`}
            className="trace-in flex items-baseline gap-2.5 text-sm"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={3} />
            <span className="text-muted-foreground">{s.label}:</span>
            <span className="font-medium text-foreground">{s.value}</span>
          </li>
        ))}
        {!done && (
          <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="ml-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {thinking ? "Interpreting Your Request…" : "Building Preview…"}
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * The same reasoning trail rendered as an inline thread card (§22): assembly
 * status lives in the conversation, in chronological order, not in a side rail.
 */
export function AssistantTraceCard({
  steps,
  revealed,
  thinking,
}: {
  steps: TraceStep[];
  revealed: number;
  thinking: boolean;
}) {
  if (!steps.length && !thinking) return null;
  return <AssistantTrace steps={steps} revealed={revealed} thinking={thinking} />;
}
