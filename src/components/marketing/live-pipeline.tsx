import { useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2, MapPin, Send, ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep = {
  label: string;
  running: string;
  count: number;
  seconds: number;
  icon: typeof MapPin;
};

export const LIVE_STEPS: PipelineStep[] = [
  { label: "Businesses Found", running: "Finding businesses…", count: 1240, seconds: 15, icon: MapPin },
  { label: "Duplicates Removed", running: "Removing duplicates…", count: 1103, seconds: 20, icon: Building2 },
  { label: "Mobile Verified", running: "Verifying mobile numbers…", count: 780, seconds: 40, icon: Smartphone },
  { label: "DNC & Litigator Scrubbed", running: "Checking DNC + litigators…", count: 566, seconds: 15, icon: ShieldCheck },
  { label: "Ready To Contact", running: "Packaging your list…", count: 554, seconds: 0, icon: CheckCircle2 },
];

/**
 * Scroll-triggered "live run" of the pipeline: each step fills its progress bar
 * in sequence while the record count drops, so visitors watch the list get
 * cleaner instead of reading about it.
 */
export function LivePipeline({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(0);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (active < 0 || active >= LIVE_STEPS.length) return;
    const t = setTimeout(() => setActive((a) => a + 1), 900);
    return () => clearTimeout(t);
  }, [active]);

  const done = active >= LIVE_STEPS.length;

  return (
    <div ref={ref} className={cn("rounded-3xl border border-border bg-surface p-6 md:p-8", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Live Run — “Roofers In Texas”
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            done ? "bg-primary/10 text-primary" : "bg-foreground/5 text-muted-foreground",
          )}
        >
          {done ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Done in about 90 seconds
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Running…
            </>
          )}
        </div>
      </div>

      <div className="mt-7 space-y-5">
        {LIVE_STEPS.map((s, i) => {
          const state = active > i ? "done" : active === i ? "running" : "idle";
          return (
            <div key={s.label}>
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <s.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      state === "idle" ? "text-muted-foreground/50" : "text-primary",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      state === "idle" ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {state === "running" ? s.running : s.label}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-display text-lg font-black tabular-nums",
                    state === "idle" ? "text-muted-foreground/40" : "text-foreground",
                  )}
                >
                  {state === "idle" ? "—" : s.count.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={cn(
                    "h-full rounded-full bg-primary transition-[width] duration-700 ease-out",
                    state === "idle" && "opacity-30",
                  )}
                  style={{ width: state === "idle" ? "0%" : state === "running" ? "60%" : "100%" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-7 text-sm text-muted-foreground">
        Nothing is delivered until every record completes every step.
      </p>
    </div>
  );
}
