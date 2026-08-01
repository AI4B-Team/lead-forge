/**
 * Shared compliance rules (spec §6): scrub freshness + mandatory opt-out footer.
 * Used by both the server send path and the UI so the two can never disagree.
 */
export const RESCRUB_DAYS = 30;

/** Days since a scrub run. Returns null when the list has never been scrubbed. */
export function scrubAgeDays(scrubbedAt?: string | null): number | null {
  if (!scrubbedAt) return null;
  const ms = Date.now() - new Date(scrubbedAt).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

/** True when the list must be re-scrubbed before any outbound message. */
export function isScrubStale(scrubbedAt?: string | null): boolean {
  const age = scrubAgeDays(scrubbedAt);
  return age === null || age >= RESCRUB_DAYS;
}

export const SCRUB_STALE_MESSAGE =
  `This List Was Scrubbed More Than ${RESCRUB_DAYS} Days Ago. Re-Scrub It Before Launching.`;

/** Non-removable opt-out footer appended to every first outbound message. */
export const STOP_FOOTER = "Reply STOP to opt out.";

export function hasStopFooter(body: string): boolean {
  return /\bstop\b/i.test(body);
}

/** Appends the opt-out footer unless the body already carries an opt-out. */
export function withStopFooter(body: string): string {
  const trimmed = body.trim();
  if (hasStopFooter(trimmed)) return trimmed;
  return `${trimmed} ${STOP_FOOTER}`;
}
