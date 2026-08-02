import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PIPELINE_STAGE_KEYS,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGE_SHORT_LABEL,
  type PipelineStageCounts,
  type PipelineStageKey,
} from "@/lib/pipeline-stages";

export type JobStages = PipelineStageCounts;

const CELL = "w-[58px]";

/**
 * Column header for the Lists table pipeline column. The six stage names are
 * printed ONCE here, aligned to the number cells below, so each row can carry
 * numbers only and nothing wraps.
 */
export function JobStageFlowHeader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {PIPELINE_STAGE_KEYS.map((key, i) => (
        <div key={key} className="flex items-center gap-1">
          <div className={cn(CELL, "text-[10px] uppercase leading-none tracking-wider whitespace-nowrap")}>
            {PIPELINE_STAGE_SHORT_LABEL[key]}
          </div>
          {i < PIPELINE_STAGE_KEYS.length - 1 && <span className="w-3 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

/**
 * Per-row mini pipeline: numbers only, arrow separators, aligned under the
 * shared header labels. Hover any number for the full stage name and delta.
 * Stages a run does not use (data-output lists) render as "–".
 */
export function JobStageFlow({
  stages,
  className,
  traced,
  activeKeys,
}: {
  stages: JobStages;
  className?: string;
  /** How many records needed skip tracing (annotation, never the remaining count). */
  traced?: number;
  /** Stages this run actually uses; others render blank. */
  activeKeys?: readonly PipelineStageKey[];
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {PIPELINE_STAGE_KEYS.map((key, i) => {
        const used = !activeKeys || activeKeys.includes(key);
        const value = stages[key] ?? 0;
        const prevKey = i > 0 ? PIPELINE_STAGE_KEYS[i - 1]! : null;
        const prev = prevKey ? (stages[prevKey] ?? 0) : null;
        const removed = prev == null ? 0 : Math.max(0, prev - value);
        const isLast = key === "clean";
        const active = value > 0;
        return (
          <div key={key} className="flex items-center gap-1">
            {used ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      CELL,
                      "cursor-default text-[12px] font-semibold tabular-nums leading-none",
                      isLast && active ? "text-primary" : active ? "text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {value.toLocaleString()}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {PIPELINE_STAGE_LABEL[key]} — {value.toLocaleString()} Remaining
                  {key === "skipTraced"
                    ? `, ${(traced ?? 0).toLocaleString()} Needed Tracing`
                    : removed > 0
                      ? `, ${removed.toLocaleString()} Removed`
                      : ""}
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className={cn(CELL, "text-[12px] leading-none text-muted-foreground/40")}>–</span>
            )}
            {i < PIPELINE_STAGE_KEYS.length - 1 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}
