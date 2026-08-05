import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Building2,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
  Layers,
  Landmark,
  MapPin,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Scenario = {
  sourceLabel: string;
  sourceIcon: typeof MapPin;
  request: string;
  /** Record count after each pipeline stage, in order. */
  counts: [number, number, number, number, number];
  /** Whether skip trace runs for this scenario (it is optional). */
  skipTrace: boolean;
};

export const SCENARIOS: Scenario[] = [
  {
    sourceLabel: "Google Maps",
    sourceIcon: MapPin,
    request: "Roofers In Texas",
    counts: [1240, 1103, 780, 566, 554],
    skipTrace: true,
  },
  {
    sourceLabel: "Uploaded CSV",
    sourceIcon: FileSpreadsheet,
    request: "Roofing Leads.csv",
    counts: [2480, 2114, 1690, 1218, 1204],
    skipTrace: false,
  },
  {
    sourceLabel: "Public Records",
    sourceIcon: Landmark,
    request: "Restaurants In Phoenix",
    counts: [860, 742, 585, 431, 424],
    skipTrace: true,
  },
  {
    sourceLabel: "Mixed Sources",
    sourceIcon: Layers,
    request: "Dentists In Florida",
    counts: [3120, 2680, 2038, 1512, 1487],
    skipTrace: false,
  },
];

type Stage = {
  label: string;
  running: string;
  sub?: string;
  icon: typeof MapPin;
  optional?: boolean;
  /** Live sub-checks revealed one at a time while the stage runs. */
  checks?: string[];
};

const STAGES: Stage[] = [
  { label: "Records Received", running: "Receiving records…", icon: MapPin },
  { label: "Duplicates Removed", running: "Removing duplicates…", icon: Building2 },
  {
    label: "Contacts Verified",
    running: "Verifying contacts…",
    sub: "Mobile • Landline • Email",
    icon: Smartphone,
  },
  {
    label: "DNC & Litigator Scrubbed",
    running: "Running compliance checks…",
    icon: ShieldCheck,
    checks: ["National DNC", "Litigator Database", "Suppression Lists"],
  },
  { label: "Ready To Contact", running: "Packaging your list…", icon: CheckCircle2 },
];

const STAGE_MS = 1400;

function useCountUp(target: number, from: number, active: boolean, ms = STAGE_MS) {
  const [value, setValue] = useState(active ? target : from);
  useEffect(() => {
    if (!active) {
      setValue(from);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, from, active, ms]);
  return value;
}

/**
 * Scroll-triggered "live run" of the pipeline. Cycles through different input
 * sources (generated search, uploaded CSV, public records, mixed) so visitors
 * see that LeadTrace processes any list — not just scraped searches.
 */
export function LivePipeline({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [active, setActive] = useState(-1);

  const scenario = SCENARIOS[scenarioIndex]!;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (started) setActive(0);
  }, [started, scenarioIndex]);

  useEffect(() => {
    if (active < 0) return;
    if (active < STAGES.length) {
      const t = setTimeout(() => setActive((a) => a + 1), STAGE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setActive(-1);
      setScenarioIndex((i) => (i + 1) % SCENARIOS.length);
    }, 3200);
    return () => clearTimeout(t);
  }, [active]);

  const done = active >= STAGES.length;
  const percent = useMemo(() => {
    if (active < 0) return 0;
    return Math.min(100, Math.round(((active + (done ? 0 : 0.5)) / STAGES.length) * 100));
  }, [active, done]);

  const SourceIcon = scenario.sourceIcon;

  return (
    <div ref={ref} className={cn("rounded-3xl border border-border bg-surface p-6 md:p-8", className)}>
      {/* Legend: input → processing → output */}
      <div className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Input
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <SourceIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{scenario.sourceLabel}</span>
          </div>
        </div>
        <Connector />
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            LeadTrace Processing
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{scenario.request}</div>
        </div>
        <Connector />
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-primary">Output</div>
          <div className="mt-1 text-sm font-semibold text-foreground">Ready To Contact</div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Live Run
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
            done ? "bg-primary/10 text-primary" : "bg-foreground/5 text-muted-foreground",
          )}
        >
          {done ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Processing… {percent}%
            </>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {STAGES.map((s, i) => {
          const state = active > i ? "done" : active === i ? "running" : "idle";
          const optionalSkipped = i === 2 && !scenario.skipTrace;
          return (
            <StageRow
              key={s.label}
              stage={s}
              state={state}
              target={scenario.counts[i]!}
              from={i === 0 ? 0 : scenario.counts[i - 1]!}
              max={scenario.counts[0]!}
              skipTraceNote={i === 2 ? (scenario.skipTrace ? "Skip Trace Applied" : "Skip Trace Not Needed") : undefined}
              dimNote={optionalSkipped}
            />
          );
        })}
      </div>

      {/* Optional modules */}
      <div className="mt-7 rounded-2xl border border-border bg-surface-muted p-4">
        <div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Modules In This Run
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Module on label="Remove Duplicates" />
          <Module on label="Verify Contacts" />
          <Module on={scenario.skipTrace} label="Skip Trace (If Needed)" />
          <Module on label="DNC Check" />
          <Module on label="Ready" />
        </div>
      </div>

    </div>
  );
}

function Connector() {
  return (
    <div className="grid place-items-center text-muted-foreground/60">
      <ArrowDown className="h-4 w-4 md:hidden" />
      <span className="hidden md:block">→</span>
    </div>
  );
}

function Module({ on, label }: { on?: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold",
        on ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {on ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/50" />
      )}
      {label}
    </span>
  );
}

function StageRow({
  stage,
  state,
  target,
  from,
  max,
  skipTraceNote,
  dimNote,
}: {
  stage: Stage;
  state: "idle" | "running" | "done";
  target: number;
  from: number;
  max: number;
  skipTraceNote?: string;
  dimNote?: boolean;
}) {
  const value = useCountUp(target, from, state !== "idle");
  const width = state === "idle" ? 0 : (value / max) * 100;
  const [checkStep, setCheckStep] = useState(0);

  useEffect(() => {
    if (state !== "running" || !stage.checks) {
      setCheckStep(state === "done" ? (stage.checks?.length ?? 0) : 0);
      return;
    }
    const timers = stage.checks.map((_, i) =>
      setTimeout(() => setCheckStep(i + 1), ((i + 1) * STAGE_MS) / (stage.checks!.length + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, [state, stage.checks]);

  const Icon = stage.icon;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon
            className={cn("h-4 w-4 shrink-0", state === "idle" ? "text-muted-foreground/50" : "text-primary")}
          />
          <span
            className={cn(
              "truncate text-sm font-semibold",
              state === "idle" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {state === "running" ? stage.running : stage.label}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 font-display text-lg font-black tabular-nums",
            state === "idle" ? "text-muted-foreground/40" : "text-foreground",
          )}
        >
          {state === "idle" ? "—" : value.toLocaleString()}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>

      {(stage.sub || skipTraceNote) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {stage.sub && <span>{stage.sub}</span>}
          {skipTraceNote && (
            <span
              className={cn(
                "rounded-full border border-border bg-foreground/5 px-2 py-0.5 font-semibold",
                dimNote ? "text-muted-foreground/70" : "text-foreground",
              )}
            >
              {skipTraceNote}
            </span>
          )}
        </div>
      )}

      {stage.checks && state !== "idle" && (
        <div className="mt-2 space-y-1">
          {stage.checks.map((c, i) => {
            const passed = checkStep > i;
            return (
              <div
                key={c}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  passed ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
                <span>
                  Checking {c}…{passed ? " Passed" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
