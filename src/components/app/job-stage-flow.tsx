import { cn } from "@/lib/utils";
import { ChevronRight, Download, Eraser, ShieldCheck, PhoneCall, Rocket } from "lucide-react";

export type JobStages = {
  found: number;
  scrubbed: number;
  verified: number;
  skipTraced: number;
  ready: number;
};

const STAGES: Array<{ key: keyof JobStages; label: string; icon: typeof Download }> = [
  { key: "found", label: "Found", icon: Download },
  { key: "scrubbed", label: "Scrubbed", icon: Eraser },
  { key: "verified", label: "Verified", icon: ShieldCheck },
  { key: "skipTraced", label: "Skip Traced", icon: PhoneCall },
  { key: "ready", label: "Ready", icon: Rocket },
];

/**
 * Horizontal stage flow for the Jobs table: every row tells the pipeline story
 * Found → Scrubbed → Verified → Skip Traced → Ready with counts and progress.
 */
export function JobStageFlow({ stages, className }: { stages: JobStages; className?: string }) {
  const max = Math.max(stages.found, 1);
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {STAGES.map((s, i) => {
        const value = stages[s.key] ?? 0;
        const pct = Math.max(4, Math.round((value / max) * 100));
        const isLast = s.key === "ready";
        const active = value > 0;
        return (
          <div key={s.key} className="flex items-center gap-1">
            <div className="w-[50px]">
              <div className="flex items-center gap-1">
                <s.icon
                  className={cn(
                    "h-3 w-3 shrink-0",
                    isLast && active ? "text-primary" : active ? "text-foreground" : "text-muted-foreground/50",
                  )}
                />
                <span
                  className={cn(
                    "truncate text-[11px] font-semibold tabular-nums",
                    isLast && active ? "text-primary" : active ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {value.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700 ease-out", isLast ? "bg-primary" : "bg-foreground/30")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-0.5 truncate text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
            {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />}
          </div>
        );
      })}
    </div>
  );
}
