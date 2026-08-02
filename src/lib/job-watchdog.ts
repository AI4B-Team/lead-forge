/**
 * Stuck-job watchdog (spec §23). Any running stage that reports no progress
 * events for two hours is surfaced as "Needs Attention" (amber) with a retry
 * action and a plain-language reason — retry-then-pause per §2.4, never a
 * silent failure. The Running stat only counts genuinely active jobs.
 */
export const STALL_HOURS = 2;
const STALL_MS = STALL_HOURS * 60 * 60 * 1000;

export const RUNNING_STATUSES = new Set(["scraping", "enriching", "skiptracing", "scrubbing"]);

export function isRunningStatus(status?: string | null) {
  return RUNNING_STATUSES.has(status ?? "");
}

/** A running job whose last progress event (or start) is older than 2h. */
export function isStalled(input: {
  status?: string | null;
  lastEventAt?: string | null;
  createdAt?: string | null;
  now?: number;
}) {
  if (!isRunningStatus(input.status)) return false;
  const stamp = input.lastEventAt ?? input.createdAt;
  if (!stamp) return false;
  const now = input.now ?? Date.now();
  return now - new Date(stamp).getTime() > STALL_MS;
}

export function stallReason(stage?: string | null) {
  const label = STAGE_PHRASE[stage ?? ""] ?? "this run";
  return `No progress reported on ${label} for over ${STALL_HOURS} hours. Nothing has been lost — retry to resume from the last completed stage.`;
}

const STAGE_PHRASE: Record<string, string> = {
  scraping: "the Found stage",
  enriching: "the Mobile Verified stage",
  skiptracing: "the Skip Traced stage",
  scrubbing: "the Scrubbed stage",
};
