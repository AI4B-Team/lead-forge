import { ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildFunnel, stageFillPercent } from "@/lib/funnel-math";

export type FunnelStages = {
  found: number;
  deduped: number;
  /** Marketing wording for the Verified stage; app surfaces pass `verified`. */
  textable?: number;
  verified?: number;
  skipTraced?: number;
  scrubbed: number;
  clean: number;
};

/**
 * The signature Pipeline Funnel. Each card shows the records REMAINING after
 * that stage, connected left-to-right by arrows so the journey reads as one
 * continuous narrowing. Clean is the finish line: brand-red outline, check
 * mark, and a "Ready To Launch" caption.
 *
 * Stage math and wording come from `@/lib/funnel-math` — the single source of
 * truth guarded by `funnel-math.test.ts`.
 */
export function PipelineFunnel({
  stages,
  traced,
  size = "lg",
  className,
}: {
  stages: FunnelStages;
  /** How many records were skip traced (fills, never removals). */
  traced?: number;
  size?: "lg" | "sm";
  className?: string;
}) {
  const small = size === "sm";
  const verified = stages.verified ?? stages.textable ?? stages.deduped;
  const built = buildFunnel({
    found: stages.found,
    deduped: stages.deduped,
    verified,
    traced: traced ?? stages.skipTraced ?? 0,
    scrubbed: stages.scrubbed,
    clean: stages.clean,
  });
  const found = built[0]!.remaining;

  return (
    <div className={cn("flex items-stretch", className)}>
      {built.map((s, i) => {
        const isClean = s.key === "clean";
        const pct = stageFillPercent(s.remaining, found, small ? 12 : 8);
        return (
          <div key={s.key} className="flex min-w-0 flex-1 items-stretch">
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-xl border",
                  small ? "h-9" : "h-28",
                  isClean
                    ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]"
                    : "border-border bg-muted/60",
                )}
              >
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-out",
                    isClean ? "bg-primary" : "bg-foreground/12",
                  )}
                  style={{ height: `${pct}%` }}
                />
                {!small && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                    {isClean && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
                    <span
                      className={cn(
                        "font-display font-black tabular-nums",
                        isClean ? "text-2xl text-primary" : "text-xl text-foreground",
                      )}
                    >
                      {s.remaining.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "mt-1.5 truncate text-center font-semibold uppercase tracking-wider",
                  small ? "text-[9px]" : "text-[10px]",
                  isClean ? "text-primary" : "text-muted-foreground",
                )}
              >
                {s.label}
              </div>
              {!small && (
                <div
                  className={cn(
                    "truncate text-center text-[10px] tabular-nums",
                    s.delta ? "font-semibold text-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {s.delta ?? s.annotation ?? "\u00A0"}
                </div>
              )}
            </div>
            {i < built.length - 1 && (
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center",
                  small ? "h-9 w-4" : "h-28 w-6",
                )}
                aria-hidden
              >
                <ChevronRight
                  className={cn("text-muted-foreground/60", small ? "h-3 w-3" : "h-4 w-4")}
                  strokeWidth={2.5}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
