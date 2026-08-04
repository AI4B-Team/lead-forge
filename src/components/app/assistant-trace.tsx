import { Check, Loader2, Square } from "lucide-react";
import { specStates, type JobSpec } from "@/lib/assistant.shared";
import { US_STATES } from "@/lib/us-geo";
import { availableOptions, enabledOptions } from "@/lib/pipeline-options";
import { getTemplate, type Template } from "@/lib/templates";
import {
  FIELD_SLOT_LABEL, fieldFilled, fieldsForSpec, isOptionalField,
} from "@/lib/template-schema";

export type TraceStep = {
  label: string;
  value: string;
  /**
   * "on" = filled green check, it will happen. "available" = empty checkbox,
   * an option that is offered but off by default.
   */
  state?: "on" | "available";
};

/**
 * Required slots come from the selected template's field schema, so a URL
 * scraper asks for a URL and a social template never asks for counties.
 */
export function openSlots(spec: JobSpec, uploadReady = false, template?: Template | null): string[] {
  const open: string[] = [];
  if (!spec.sourceType && !template) return ["Source"];
  for (const field of fieldsForSpec(spec, template)) {
    if (isOptionalField(field)) continue;
    if (fieldFilled(field, spec, uploadReady)) continue;
    const label = FIELD_SLOT_LABEL[field];
    if (!open.includes(label)) open.push(label);
  }
  return open;
}

export function specSlotsComplete(spec: JobSpec, uploadReady = false, template?: Template | null): boolean {
  return Boolean(spec.sourceType || template) && openSlots(spec, uploadReady, template).length === 0;
}

const SOURCE_LABEL: Record<string, string> = {
  business: "Business Search",
  records: "Public Records",
  upload: "Uploaded List",
  street_scan: "Property Scan",
};

/** Turns the assembled spec into the human-readable reasoning trail the AI "thought out loud". */
export function buildTraceSteps(spec: JobSpec): TraceStep[] {
  const steps: TraceStep[] = [];
  const picked = spec.templateId ? getTemplate(spec.templateId) : undefined;
  if (picked) steps.push({ label: "Identified Source", value: picked.title });
  else if (spec.sourceType) steps.push({ label: "Identified Source", value: SOURCE_LABEL[spec.sourceType] ?? spec.sourceType });
  if (spec.recordType) steps.push({ label: "Record Type", value: spec.recordType });
  if (spec.visualCriteria.length) steps.push({ label: "Visual Criteria", value: spec.visualCriteria.join(", ") });
  if (spec.niches.length) steps.push({ label: "Industry", value: spec.niches.join(", ") });
  if (spec.targetUrl) steps.push({ label: "Target URL", value: spec.targetUrl });
  if (spec.filters) steps.push({ label: "Filters", value: spec.filters });
  const states = specStates(spec);
  const stateNames = states.map((code) => US_STATES.find((s) => s.code === code)?.name ?? code);
  if (spec.counties.length) {
    // Counties often already carry their state suffix ("Hillsborough, FL") — don't double it.
    const suffix =
      states.length === 1 && !spec.counties.some((c) => c.toUpperCase().endsWith(states[0]!.toUpperCase()))
        ? `, ${states[0]}`
        : "";
    steps.push({ label: "Location", value: `${spec.counties.join(", ")}${suffix}` });
  } else if (stateNames.length) {
    steps.push({ label: "Location", value: stateNames.join(", ") });
  }
  if (spec.recencyDays) steps.push({ label: "Recency Window", value: `Last ${spec.recencyDays} Days` });
  if (spec.sourceType && spec.sourceType !== "upload" && spec.maxResults) {
    steps.push({ label: "Max Leads", value: spec.maxResults.toLocaleString() });
  }
  // Toggle lines use the exact List Builder labels, in panel order, so the two
  // lists can be checked off against each other.
  for (const option of enabledOptions(spec)) {
    steps.push({ label: option.checklistLabel ?? option.label, value: "Enabled" });
  }
  // Relevant-but-off options read as "available", never as a committed step.
  for (const option of availableOptions(spec)) {
    steps.push({ label: option.checklistLabel ?? option.label, value: "Available — Off", state: "available" });
  }
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
  open = [],
}: {
  steps: TraceStep[];
  revealed: number;
  thinking: boolean;
  /** Required slots still missing; while non-empty the card stays neutral. */
  open?: string[];
}) {
  const visible = steps.slice(0, revealed);
  const complete = open.length === 0;
  const done = complete && revealed >= steps.length && !thinking;

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
          {done ? "List Assembled" : complete ? "Building Your List…" : "Assembling…"}
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {visible.map((s, i) => {
          const offered = s.state === "available";
          return (
            <li
              key={`${s.label}-${i}`}
              className="trace-in flex items-baseline gap-2.5 text-sm"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {offered ? (
                <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" strokeWidth={2} />
              ) : (
                <Check
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${complete ? "text-success" : "text-muted-foreground"}`}
                  strokeWidth={3}
                />
              )}
              <span className={offered ? "text-muted-foreground/70" : "text-muted-foreground"}>{s.label}:</span>
              <span
                className={
                  offered
                    ? "text-muted-foreground/70"
                    : complete
                      ? "font-medium text-foreground"
                      : "text-foreground/80"
                }
              >
                {s.value}
              </span>
            </li>
          );
        })}
        {open.map((label) => (
          <li key={`open-${label}`} className="flex items-baseline gap-2.5 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <span>{label} — Waiting On You</span>
          </li>
        ))}
        {!done && complete && (
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
  open,
}: {
  steps: TraceStep[];
  revealed: number;
  thinking: boolean;
  open?: string[];
}) {
  if (!steps.length && !thinking) return null;
  return <AssistantTrace steps={steps} revealed={revealed} thinking={thinking} open={open} />;
}
