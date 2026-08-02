/**
 * Funnel arithmetic for the Job Progress / Results page.
 *
 * Every stage reports the number of records REMAINING after that stage runs.
 * Stages that remove records carry a negative delta badge; stages that only
 * pass records through (Skip Trace, and Verify when nothing fails) carry a
 * neutral annotation instead — a zero is never rendered as "−0", because that
 * reads like a failure.
 *
 * The invariant that must always hold, on every surface and in the export:
 *   remaining[i] === remaining[i - 1] - removed[i]
 * and clean === the "Ready To Send" card === the exported clean file rows.
 */

export type FunnelStageKey =
  | "found"
  | "deduped"
  | "verified"
  | "skipTraced"
  | "scrubbed"
  | "clean";

export type FunnelStage = {
  key: FunnelStageKey;
  label: string;
  /** Records still in the pipeline after this stage. */
  remaining: number;
  /** Records this stage removed (always >= 0). */
  removed: number;
  /** Delta badge text, or null when the stage removed nothing. */
  delta: string | null;
  /** Neutral text shown when there is no delta (pass-through stages). */
  annotation: string | null;
};

export type FunnelInput = {
  found: number;
  deduped: number;
  verified: number;
  /** How many records were skip traced (a fill, not a removal). */
  traced: number;
  scrubbed: number;
  clean: number;
};

const n = (v: number | null | undefined) => Math.max(0, Math.round(v ?? 0));

/**
 * Normalize raw job counters into a monotonically narrowing funnel. Each stage
 * is clamped to the previous one so the story is always a drop.
 */
export function buildFunnel(input: FunnelInput): FunnelStage[] {
  const found = n(input.found);
  const deduped = Math.min(n(input.deduped), found);
  const verified = Math.min(n(input.verified), deduped);
  const traced = Math.min(n(input.traced), verified);
  // Skip Trace fills missing phones — it never removes rows.
  const skipTraced = verified;
  const scrubbed = Math.min(n(input.scrubbed), skipTraced);
  const clean = Math.min(n(input.clean), scrubbed);

  const stage = (
    key: FunnelStageKey,
    label: string,
    remaining: number,
    prev: number | null,
    opts?: { annotation?: string; removalNoun?: string },
  ): FunnelStage => {
    const removed = prev == null ? 0 : Math.max(0, prev - remaining);
    return {
      key,
      label,
      remaining,
      removed,
      delta: removed > 0 ? `−${removed.toLocaleString()}${opts?.removalNoun ? ` ${opts.removalNoun}` : ""}` : null,
      annotation: removed > 0 ? null : (opts?.annotation ?? null),
    };
  };

  return [
    stage("found", "Found", found, null, { annotation: "Raw Records" }),
    stage("deduped", "Deduped", deduped, found, { annotation: "No Duplicates" }),
    stage("verified", "Verified", verified, deduped, { annotation: "All Verified" }),
    stage("skipTraced", "Skip Traced", skipTraced, skipTraced, {
      annotation: traced > 0 ? `${traced.toLocaleString()} Traced` : "0 Traced — All Had Phones",
    }),
    stage("scrubbed", "Scrubbed", scrubbed, skipTraced, { annotation: "All Checked" }),
    stage("clean", "Clean", clean, scrubbed, { removalNoun: "Scrubbed" }),
  ];
}

/** Bar fill for a stage, proportional to Found with a visible floor. */
export function stageFillPercent(remaining: number, found: number, min = 8) {
  const max = Math.max(found, 1);
  if (remaining <= 0) return 0;
  return Math.min(100, Math.max(min, Math.round((remaining / max) * 100)));
}

/**
 * Arithmetic guard: every stage must equal the previous stage minus its own
 * removal, and Clean must match the Ready-To-Send / export row count.
 */
export function funnelViolations(
  stages: FunnelStage[],
  expectations?: { readyToSend?: number; exportedRows?: number },
): string[] {
  const errors: string[] = [];
  stages.forEach((s, i) => {
    if (i === 0 || s.key === "skipTraced") return;
    const prev = stages[i - 1]!.remaining;
    if (prev - s.removed !== s.remaining) {
      errors.push(`${s.label}: ${prev} − ${s.removed} ≠ ${s.remaining}`);
    }
  });
  const clean = stages.find((s) => s.key === "clean")?.remaining ?? 0;
  if (expectations?.readyToSend != null && expectations.readyToSend !== clean) {
    errors.push(`Ready To Send (${expectations.readyToSend}) ≠ Clean (${clean})`);
  }
  if (expectations?.exportedRows != null && expectations.exportedRows !== clean) {
    errors.push(`Exported rows (${expectations.exportedRows}) ≠ Clean (${clean})`);
  }
  return errors;
}