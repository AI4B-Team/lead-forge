/**
 * List (job) lifecycle status type + display labels. Pure display helpers —
 * intentionally not database-backed config.
 */
export type JobStatus =
  | "queued"
  | "scraping"
  | "enriching"
  | "skiptracing"
  | "scrubbing"
  | "ready"
  | "failed";

export function statusLabel(s: JobStatus): string {
  return {
    queued: "Queued",
    scraping: "Scraping",
    enriching: "Enriching",
    skiptracing: "Skip Tracing",
    scrubbing: "Scrubbing",
    ready: "Ready",
    failed: "Failed",
  }[s];
}
