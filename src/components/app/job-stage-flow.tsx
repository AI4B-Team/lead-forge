import { cn } from "@/lib/utils";
import { ChevronRight, Download, Layers, ShieldCheck, PhoneCall, Eraser, Rocket } from "lucide-react";
import {
  PIPELINE_STAGE_KEYS,
  PIPELINE_STAGE_LABEL,
  type PipelineStageCounts,
  type PipelineStageKey,
} from "@/lib/pipeline-stages";

export type JobStages = PipelineStageCounts;

const ICONS: Record<PipelineStageKey, typeof Download> = {
  found: Download,
  deduped: Layers,
  verified: ShieldCheck,
  skipTraced: PhoneCall,
  scrubbed: Eraser,
  clean: Rocket,
};

/**
 * Horizontal stage flow for the Jobs table using the canonical vocabulary
 * (§23): Found → Deduped → Mobile Verified → Skip Traced → Scrubbed → Clean.
 * Labels always render in full — no truncation.
 */
export function JobStageFlow({ stages, className }: { stages: JobStages; className?: string }) {
  const max = Math.max(stages.found, 1);
  return (
    <div className={cn("flex items-start gap-1", className)}>
      {PIPELINE_STAGE_KEYS.map((key, i) => {
        const value = stages[key] ?? 0;
        const pct = Math.max(4, Math.round((value / max) * 100));
        const isLast = key === "clean";
        const active = value > 0;
        return (
          <div key={key} className="flex items-start gap-1">
            <div className="w-[68px]">
              <div className="flex items-center gap-1">
                {(() => {
                  const Icon = ICONS[key];
                  return (
                    <Icon
                      className={cn(
                        "h-3 w-3 shrink-0",
                        isLast && active ? "text-primary" : active ? "text-foreground" : "text-muted-foreground/50",
                      )}
                    />
                  );
                })()}
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    isLast && active ? "text-primary" : active ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {value.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    isLast ? "bg-primary" : "bg-foreground/30",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-0.5 text-[9px] uppercase leading-tight tracking-wider text-muted-foreground">
                {PIPELINE_STAGE_LABEL[key]}
              </div>
            </div>
            {i < PIPELINE_STAGE_KEYS.length - 1 && (
              <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}
