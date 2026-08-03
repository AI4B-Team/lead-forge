import { Badge } from "@/components/ui/badge";
import { statusLabel, type JobStatus } from "@/lib/job-status";
import { cn } from "@/lib/utils";
import { resolveListStatus } from "@/lib/list-status";

type Tone = "green" | "blue" | "yellow" | "gray" | "red" | "purple";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-success/10 text-success border-success/20",
  blue: "bg-info/10 text-info border-info/20",
  yellow: "bg-warn/10 text-warn border-warn/20",
  gray: "bg-muted text-muted-foreground border-border",
  red: "bg-danger/10 text-danger border-danger/20",
  purple: "bg-review/10 text-review border-review/20",
};

const DOT_CLASS: Record<Tone, string> = {
  green: "bg-success",
  blue: "bg-info",
  yellow: "bg-warn",
  gray: "bg-muted-foreground",
  red: "bg-danger",
  purple: "bg-review",
};

const TONE: Record<string, Tone> = {
  ready: "green",
  scraping: "blue",
  enriching: "blue",
  skiptracing: "blue",
  scrubbing: "blue",
  queued: "yellow",
  scheduled: "yellow",
  paused: "gray",
  failed: "red",
  review: "purple",
  attention: "yellow",
};

const EXTRA_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  paused: "Paused",
  review: "Needs Review",
  attention: "Needs Attention",
};

const RUNNING = new Set(["scraping", "enriching", "skiptracing", "scrubbing"]);

export function StatusBadge({ status }: { status: JobStatus | "scheduled" | "paused" | "review" | "attention" }) {
  const tone = TONE[status] ?? "gray";
  const label = EXTRA_LABEL[status] ?? statusLabel(status as JobStatus);
  return (
    <Badge variant="outline" className={cn(TONE_CLASS[tone], "gap-1.5 font-medium")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[tone], RUNNING.has(status) && "animate-pulse")} />
      {label}
    </Badge>
  );
}

/**
 * Lifecycle pill for a list/run — single line, row-height safe. Uses the shared
 * status config so the table and the run detail page always agree.
 */
export function ListStatusBadge({
  status,
  stalled,
  className,
}: {
  status?: string | null;
  stalled?: boolean;
  className?: string;
}) {
  const { tone, label, running } = resolveListStatus(status, stalled);
  return (
    <Badge
      variant="outline"
      className={cn(TONE_CLASS[tone], "gap-1.5 whitespace-nowrap font-medium", className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[tone], running && "animate-pulse")} />
      {label}
    </Badge>
  );
}
