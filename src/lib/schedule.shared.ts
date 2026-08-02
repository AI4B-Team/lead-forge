// ---------------------------------------------------------------------------
// Recurring-run cadences. One vocabulary for the RESCAN dropdown, the Lists
// row, the run engine, and the notification copy. Pure + client-safe.
// ---------------------------------------------------------------------------

export type Cadence = "one_time" | "every_2h" | "every_12h" | "daily" | "weekly" | "custom";

export const CADENCES: readonly Cadence[] = [
  "one_time",
  "every_2h",
  "every_12h",
  "daily",
  "weekly",
  "custom",
];

/** Rows written before the cadence vocabulary widened still say "12h". */
const LEGACY: Record<string, Cadence> = {
  one_time: "one_time",
  "2h": "every_2h",
  "12h": "every_12h",
  every_2h: "every_2h",
  every_12h: "every_12h",
  daily: "daily",
  weekly: "weekly",
  custom: "custom",
};

export function normalizeCadence(value?: string | null): Cadence {
  return (value && LEGACY[value]) || "one_time";
}

const FIXED_MINUTES: Partial<Record<Cadence, number>> = {
  every_2h: 120,
  every_12h: 720,
  daily: 1440,
  weekly: 10080,
};

/** Minutes between runs, or null when the list does not repeat. */
export function cadenceMinutes(cadence: Cadence, customMinutes?: number | null): number | null {
  if (cadence === "one_time") return null;
  if (cadence === "custom") {
    const m = Math.round(customMinutes ?? 0);
    return m >= 15 ? m : null;
  }
  return FIXED_MINUTES[cadence] ?? null;
}

export function nextRunFrom(
  cadence: Cadence,
  customMinutes: number | null | undefined,
  from: Date = new Date(),
): string | null {
  const minutes = cadenceMinutes(cadence, customMinutes);
  if (!minutes) return null;
  return new Date(from.getTime() + minutes * 60_000).toISOString();
}

const BASE_LABEL: Record<Cadence, string> = {
  one_time: "One-Time",
  every_2h: "Every 2 Hours",
  every_12h: "Every 12 Hours",
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom",
};

/** "Every 90 Minutes" / "Every 6 Hours" for a custom interval. */
export function formatInterval(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  if (m % 10080 === 0) return `Every ${m / 10080} Week${m / 10080 > 1 ? "s" : ""}`;
  if (m % 1440 === 0) return `Every ${m / 1440} Day${m / 1440 > 1 ? "s" : ""}`;
  if (m % 60 === 0) return `Every ${m / 60} Hour${m / 60 > 1 ? "s" : ""}`;
  return `Every ${m} Minutes`;
}

export function cadenceLabel(cadence: Cadence, customMinutes?: number | null): string {
  if (cadence === "custom") {
    const m = cadenceMinutes("custom", customMinutes);
    return m ? formatInterval(m) : "Custom";
  }
  return BASE_LABEL[cadence];
}

/** Short badge for a list name row ("Daily", "2h", "Every 90m"). */
export function cadenceShortBadge(cadence: Cadence, customMinutes?: number | null): string | null {
  if (cadence === "one_time") return null;
  if (cadence === "every_2h") return "2h";
  if (cadence === "every_12h") return "12h";
  if (cadence === "daily") return "Daily";
  if (cadence === "weekly") return "Weekly";
  const m = cadenceMinutes("custom", customMinutes);
  if (!m) return null;
  if (m % 1440 === 0) return `${m / 1440}d`;
  if (m % 60 === 0) return `${m / 60}h`;
  return `${m}m`;
}

/** "Next Aug 8" / "Next 4:30 PM" for sub-daily cadences. */
export function formatNextRun(iso?: string | null, minutes?: number | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const subDaily = (minutes ?? 1440) < 1440;
  return subDaily
    ? `Next ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : `Next ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/** The full RESCAN summary a Lists row shows: "Weekly · Next Aug 8". */
export function scheduleSummary(input: {
  cadence: Cadence;
  customMinutes?: number | null;
  nextRunAt?: string | null;
  active?: boolean;
}): string | null {
  if (input.cadence === "one_time") return null;
  const label = cadenceLabel(input.cadence, input.customMinutes);
  if (input.active === false) return `${label} · Paused`;
  const next = formatNextRun(input.nextRunAt, cadenceMinutes(input.cadence, input.customMinutes));
  return next ? `${label} · ${next}` : label;
}

export function isRecurring(cadence: Cadence, active?: boolean): boolean {
  return cadence !== "one_time" && active !== false;
}
