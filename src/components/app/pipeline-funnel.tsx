import { cn } from "@/lib/utils";

export type FunnelStages = {
  found: number;
  deduped: number;
  textable: number;
  scrubbed: number;
  clean: number;
};

const LABELS: Array<{ key: keyof FunnelStages; label: string }> = [
  { key: "found", label: "Found" },
  { key: "deduped", label: "Deduped" },
  { key: "textable", label: "Textable" },
  { key: "scrubbed", label: "Scrubbed" },
  { key: "clean", label: "Clean" },
];

/**
 * The signature Pipeline Funnel: record counts flowing Found → Deduped →
 * Textable → Scrubbed → Clean, with the drop at each stage labeled.
 */
export function PipelineFunnel({
  stages,
  size = "lg",
  className,
}: {
  stages: FunnelStages;
  size?: "lg" | "sm";
  className?: string;
}) {
  const max = Math.max(stages.found, 1);
  const small = size === "sm";

  return (
    <div className={cn("flex items-end gap-1.5", className)}>
      {LABELS.map((s, i) => {
        const value = stages[s.key] ?? 0;
        const prev = i === 0 ? null : stages[LABELS[i - 1]!.key] ?? 0;
        const drop = prev == null ? 0 : Math.max(0, prev - value);
        const pct = Math.max(6, Math.round((value / max) * 100));
        const isClean = s.key === "clean";
        return (
          <div key={s.key} className="flex-1 min-w-0">
            <div
              className={cn(
                "relative w-full rounded-lg overflow-hidden bg-muted",
                small ? "h-8" : "h-28",
              )}
            >
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-out",
                  isClean ? "bg-primary" : "bg-foreground/15",
                )}
                style={{ height: `${pct}%` }}
              />
              {!small && (
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-1 text-center font-display font-black text-sm",
                    isClean ? "text-primary-foreground" : "text-foreground",
                  )}
                >
                  {value.toLocaleString()}
                </div>
              )}
            </div>
            <div
              className={cn(
                "mt-1 truncate text-center uppercase tracking-wider font-semibold text-muted-foreground",
                small ? "text-[9px]" : "text-[10px]",
              )}
            >
              {s.label}
            </div>
            {!small && (
              <div className="text-center text-[10px] text-muted-foreground">
                {drop > 0 ? `−${drop.toLocaleString()}` : "\u00A0"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
