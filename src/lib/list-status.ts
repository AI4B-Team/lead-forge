/**
 * One config mapping a list's lifecycle status → {tone, label}, shared by the
 * Lists table and the run detail page badge. Lifecycle only: cadence and next
 * run live in the Rescan column, never in the status slot.
 */
import { isRunningStatus } from "@/lib/job-watchdog";

export type ListStatusTone = "green" | "blue" | "red" | "gray" | "yellow";

const RUNNING_STAGE_LABEL: Record<string, string> = {
  scraping: "Scraping",
  enriching: "Enriching",
  skiptracing: "Skip Tracing",
  scrubbing: "Scrubbing",
};

const LIFECYCLE: Record<string, { tone: ListStatusTone; label: string }> = {
  ready: { tone: "green", label: "Ready" },
  failed: { tone: "red", label: "Failed" },
  paused: { tone: "gray", label: "Paused" },
  queued: { tone: "yellow", label: "Queued" },
  review: { tone: "yellow", label: "Needs Review" },
};

export function resolveListStatus(status?: string | null, stalled?: boolean) {
  if (stalled) return { tone: "red" as ListStatusTone, label: "Stalled", running: false };
  const s = status ?? "queued";
  if (isRunningStatus(s))
    return {
      tone: "blue" as ListStatusTone,
      label: `Running · ${RUNNING_STAGE_LABEL[s] ?? "Working"}`,
      running: true,
    };
  const hit = LIFECYCLE[s];
  return { ...(hit ?? { tone: "gray" as ListStatusTone, label: "Queued" }), running: false };
}