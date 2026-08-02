// Canonical job naming (§4.1): "{Record type} – {Location} – {Mon DD}" with
// "· Run #N" appended when the same search has run more than once, plus a
// cadence badge for recurring scans. Pure + client-safe so the dashboard,
// Jobs page, and job detail header all render identical titles.

export type CadenceKey = "one_time" | "12h" | "daily" | "weekly";

export const CADENCE_BADGE: Record<CadenceKey, string | null> = {
  one_time: null,
  "12h": "12h",
  daily: "Daily",
  weekly: "Weekly",
};

export function cadenceBadge(schedule: string | null | undefined): string | null {
  if (!schedule) return null;
  return CADENCE_BADGE[schedule as CadenceKey] ?? null;
}

export type JobParams = Record<string, unknown> | null;

export type NamableJob = {
  id: string;
  source_type: string;
  record_type?: string | null;
  params?: JobParams;
  created_at: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter(Boolean) : [];
}

/** "roofer" / "hvac contractor" → "Roofer" / "HVAC Contractor". */
const ACRONYMS = new Set(["hvac", "hoa", "mls", "b2b", "llc", "cpa", "hd", "ac", "it", "rv"]);

export function titleCaseLabel(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(" ");
}

/** What kind of records this job pulls — the first half of the title. */
export function jobRecordLabel(job: NamableJob): string {
  const p = (job.params ?? {}) as Record<string, unknown>;
  if (job.source_type === "upload") return "Uploaded List";
  if (job.source_type === "records") {
    return str(p.record_type) || str(job.record_type) || "Public Records";
  }
  // Full labels, title-cased, joined with " + " — never truncated to "X +1".
  const niches = list(p.niches).map(titleCaseLabel);
  if (niches.length) return niches.join(" + ");
  return str(p.record_type) || "Business Search";
}

/** Where the job pulled from — the second half of the title. */
export function jobLocationLabel(job: NamableJob): string {
  const p = (job.params ?? {}) as Record<string, unknown>;
  if (job.source_type === "upload") return str(p.file_name) || "CSV Import";
  const county = str(p.county);
  if (county) return county;
  const counties = list(p.counties);
  const state = str(p.state);
  if (counties.length === 1) return state ? `${counties[0]}, ${state}` : counties[0]!;
  if (counties.length > 1) return `${counties.length} Counties${state ? `, ${state}` : ""}`;
  return state || "All Areas";
}

/**
 * "Mon DD" in the VIEWER's time zone. Names are also computed server-side
 * (Workers run in UTC), which rolled evening jobs to the next day — callers
 * pass the browser's resolved time zone to keep the title in sync with the
 * Last Scrub timestamp.
 */
function monthDay(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
}

/** Stable identity of the underlying search, used to number repeat runs. */
export function jobSearchKey(job: NamableJob): string {
  return [job.source_type, jobRecordLabel(job), jobLocationLabel(job)]
    .join("|")
    .toLowerCase();
}

export function formatJobName(job: NamableJob, runIndex = 1, timeZone?: string): string {
  const base = `${jobRecordLabel(job)} – ${jobLocationLabel(job)} – ${monthDay(job.created_at, timeZone)}`;
  return runIndex > 1 ? `${base} · Run #${runIndex}` : base;
}

/**
 * Number every job within its search group by creation order (oldest = Run #1)
 * and return the display name per job id.
 */
export function assignJobNames<T extends NamableJob>(
  jobs: T[],
  timeZone?: string,
): Map<string, { name: string; runIndex: number; runTotal: number }> {
  const groups = new Map<string, T[]>();
  for (const j of jobs) {
    const key = jobSearchKey(j);
    const arr = groups.get(key);
    if (arr) arr.push(j);
    else groups.set(key, [j]);
  }
  const out = new Map<string, { name: string; runIndex: number; runTotal: number }>();
  for (const group of groups.values()) {
    const ordered = [...group].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    ordered.forEach((j, i) => {
      const runIndex = i + 1;
      out.set(j.id, {
        name: formatJobName(j, runIndex, timeZone),
        runIndex,
        runTotal: ordered.length,
      });
    });
  }
  return out;
}