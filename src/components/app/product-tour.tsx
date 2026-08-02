import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { getTourStatus, setTourStatus } from "@/lib/help.functions";

/**
 * Single skippable ~60-second product tour. Eight anchored popovers with
 * spotlight dimming, persisted per user so it auto-launches only once.
 * Copy sells the pipeline in lead-gen language, never UI mechanics.
 */
export type TourStep = { anchor: string; title: string; body: string };

export const TOUR_STEPS: TourStep[] = [
  {
    anchor: "nav-new-list",
    title: "Generate Leads",
    body: "Describe what you're after and where. We pull matching records from multiple sources — no downloads, no setup.",
  },
  {
    anchor: "nav-new-list",
    title: "Upload Your List",
    body: "Already have a list? Import your CSV and it runs the same pipeline minus the sourcing.",
  },
  {
    anchor: "credits",
    title: "Skip Trace",
    body: "Need owner names and mobile numbers? Skip trace is metered per hit, so you only pay for what you pull.",
  },
  {
    anchor: "nav-lists",
    title: "Clean & Scrub",
    body: "Every list is deduped, line-type checked, and scrubbed against DNC and litigator data — with a timestamped audit trail.",
  },
  {
    anchor: "nav-brands",
    title: "Set Up Your Brand",
    body: "Add your website, offers, and approved talking points here. The bot writes in your voice and only replies from material you've approved — carrier registration is handled from the same place at no extra cost.",
  },
  {
    anchor: "nav-campaigns",
    title: "SMS Campaigns",
    body: "Send from a rotating pool of local numbers, inside quiet hours, with STOP handled automatically.",
  },
  {
    anchor: "nav-reports",
    title: "Performance & Audit Trail",
    body: "Track delivery, replies, and opt-outs, and pull the timestamped scrub records behind every list you send.",
  },
  {
    anchor: "help",
    title: "Replay Anytime",
    body: "This tour lives behind the help icon, along with tutorials and a direct line to us.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function anchorRect(anchor: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function ProductTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<"welcome" | "steps">("welcome");
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const save = useServerFn(setTourStatus);

  const step = TOUR_STEPS[i];

  useLayoutEffect(() => {
    if (!open || phase !== "steps") return;
    const measure = () => setRect(anchorRect(step.anchor));
    measure();
    const t = window.setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, phase, step]);

  useEffect(() => {
    if (open) {
      setPhase("welcome");
      setI(0);
    }
  }, [open]);

  const finish = useCallback(
    (status: "skipped" | "completed") => {
      save({ data: { status } }).catch(() => {});
      onClose();
    },
    [onClose, save],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish("skipped");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open) return null;

  if (phase === "welcome") {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/60 p-4">
        <div className="w-full max-w-[420px] rounded-2xl border border-border bg-background p-6 shadow-xl">
          <h2 className="font-display text-2xl font-bold text-foreground">Welcome To LeadTrace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sixty seconds, eight stops — how raw data becomes clean, compliant, ready-to-contact leads.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <Button className="rounded-full flex-1" onClick={() => setPhase("steps")}>
              Start Tour
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => finish("skipped")}>
              Skip For Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pad = 6;
  const cardWidth = 380;
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const cardStyle: React.CSSProperties = spot
    ? {
        top: Math.min(Math.max(spot.top, 12), Math.max(window.innerHeight - 240, 12)),
        left: Math.min(spot.left + spot.width + 16, Math.max(window.innerWidth - cardWidth - 16, 16)),
      }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  const last = i === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60]">
      {spot ? (
        <div
          className="absolute rounded-xl ring-2 ring-primary transition-all duration-200 pointer-events-none"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.6)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-foreground/60" />
      )}

      <div
        className="absolute w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background p-5 shadow-xl"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Step {i + 1}/{TOUR_STEPS.length}
          </div>
          <button aria-label="Close tour" onClick={() => finish("skipped")} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-2 font-display text-xl font-bold text-foreground">{step.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>

        <div className="mt-3 h-1 w-full rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-primary transition-all"
            style={{ width: `${((i + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button onClick={() => finish("skipped")} className="text-xs text-muted-foreground hover:text-foreground">
            Skip
          </button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setI((n) => n - 1)}>
                Back
              </Button>
            )}
            {last ? (
              <Button asChild size="sm" className="rounded-full" onClick={() => finish("completed")}>
                <Link to="/app/new-list">Run Your First List</Link>
              </Button>
            ) : (
              <Button size="sm" className="rounded-full" onClick={() => setI((n) => n + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The tour never auto-launches (§12): it starts only from the welcome banner's
 * tour link or Help → Tour. Status is read so callers can tell first-timers apart.
 */
export function useProductTour() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<null | "skipped" | "completed">(null);
  const load = useServerFn(getTourStatus);

  useEffect(() => {
    load({})
      .then((r) => setStatus(r.status))
      .catch(() => {});
  }, [load]);

  return { open, status, start: () => setOpen(true), close: () => setOpen(false) };
}