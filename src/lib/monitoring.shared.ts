// Shared cadence helpers — imported by server functions and UI alike.

export const CADENCE_LABEL: Record<string, string> = {
  one_time: "One-Time",
  "12h": "Every 12 Hours",
  daily: "Daily",
  weekly: "Weekly",
};

export const RECORD_TYPE_LABEL: Record<string, string> = {
  business: "Business",
  probate: "Probate",
  code_violation: "Code Violation",
  pre_foreclosure: "Pre-Foreclosure",
  tax: "Tax Delinquent",
  vacancy: "Vacancy",
  eviction: "Eviction",
};

export function nextRunFor(schedule: "12h" | "daily" | "weekly", from: Date): string {
  const hours = schedule === "12h" ? 12 : schedule === "daily" ? 24 : 24 * 7;
  return new Date(from.getTime() + hours * 3_600_000).toISOString();
}
