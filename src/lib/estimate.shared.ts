/**
 * Pre-run row + credit estimate. Shared so the List Builder can requote live as
 * the operator changes the row cap, and the server quotes the exact same math.
 */
import type { JobSpec } from "./assistant.shared";
import { enrichmentProfile, isNonUsRun, templateOutputType } from "./pipeline-options";

/** Heuristic ceiling per search string, per source kind. */
export const ROWS_PER_SEARCH_CEILING = { business: 800, records: 1200 } as const;

/**
 * Expected share of scraped records that arrive with no phone, and therefore
 * need skip tracing. Business listings usually publish a number; public-record
 * rows usually don't.
 */
export const SKIP_TRACE_GAP_RATE = { business: 0.15, records: 0.8 } as const;

export type SpecEstimate = { rows: number; skipTraceCredits: number; scrapeCredits: number };

/** Quick presets offered next to the numeric row-cap input. */
export const MAX_ROWS_PRESETS = [25, 100, 500, 1000, 5000] as const;

/** Rough, honest pre-run estimate. Never presented as an exact bill. */
export function estimateSpec(spec: JobSpec): SpecEstimate | null {
  // Property Scan quotes from its own buy-box funnel (see estimateScan), and
  // uploads have nothing to quote until the file is mapped.
  if (!spec.sourceType || spec.sourceType === "upload" || spec.sourceType === "property_scan") return null;
  // Sources that never skip trace never quote skip-trace credits: creators and
  // marketplace sellers are email-first, datasets have no enrichment at all,
  // and non-US runs are email-only because SMS is US-only.
  const profile = enrichmentProfile(spec.templateId);
  const noPhoneWork =
    profile === "creator" ||
    profile === "seller" ||
    templateOutputType(spec.templateId) === "data" ||
    isNonUsRun({ templateId: spec.templateId, country: spec.country });

  const geo = Math.max(1, spec.counties.length || 1);
  const niches = Math.max(1, spec.niches.length);
  const cap = spec.maxResults && spec.maxResults > 0 ? spec.maxResults : null;
  // One search runs per niche × county, and the cap applies to each search.
  const rows =
    spec.sourceType === "records"
      ? Math.min(cap ?? ROWS_PER_SEARCH_CEILING.records, ROWS_PER_SEARCH_CEILING.records) * geo
      : Math.min(cap ?? ROWS_PER_SEARCH_CEILING.business, ROWS_PER_SEARCH_CEILING.business) * geo * niches;

  return {
    rows,
    skipTraceCredits:
      spec.skipTrace && !noPhoneWork
        ? Math.round(
            rows *
              (spec.sourceType === "records"
                ? SKIP_TRACE_GAP_RATE.records
                : SKIP_TRACE_GAP_RATE.business),
          )
        : 0,
    scrapeCredits: Math.round(rows / 10),
  };
}
