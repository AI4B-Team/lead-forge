/** Shared, pure intent classification + revenue math for Performance reporting. */

export type Intent = "appointment" | "qualified" | "question" | "negative" | "optout" | "neutral";

const APPOINTMENT = /(appointment|book|booked|schedule|calendar|meet(ing)?|tomorrow at|works for me|see you)/i;
const QUALIFIED = /(interested|yes|sure|sounds good|tell me more|how much|price|pricing|quote|estimate|call me|what do you|i(?:'| a)m in)/i;
const QUESTION = /\?/;
const NEGATIVE = /(not interested|no thanks|wrong number|remove|stop asking|leave me alone)/i;

export function classifyIntent(body: string | null | undefined, isOptout?: boolean | null): Intent {
  if (isOptout) return "optout";
  const t = (body ?? "").trim();
  if (!t) return "neutral";
  if (NEGATIVE.test(t)) return "negative";
  if (APPOINTMENT.test(t)) return "appointment";
  if (QUALIFIED.test(t)) return "qualified";
  if (QUESTION.test(t)) return "question";
  return "neutral";
}

export const INTENT_LABELS: Record<Intent, string> = {
  appointment: "Appointment Booked",
  qualified: "Interested",
  question: "Asked A Question",
  negative: "Not Interested",
  optout: "Opted Out",
  neutral: "Replied",
};

/** Conservative per-appointment pipeline value used for revenue projections. */
export const DEAL_VALUE = 2000;
export const CLOSE_RATE = 0.22;

export function pipelineValue(appointments: number): number {
  return appointments * DEAL_VALUE;
}

export function projectedClosed(appointments: number): number {
  return Math.round(appointments * CLOSE_RATE);
}

/**
 * Minimum outbound volume the PRIOR period needs before a period-over-period
 * comparison means anything. Below this, growth from ~nothing reads as +100%
 * on every metric, which flatters the numbers instead of reporting them.
 */
export const MIN_HISTORY_EVENTS = 5;

/** Signed percentage change, or null when there is no honest baseline. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
}

export const HOUR_BANDS: Array<{ label: string; from: number; to: number }> = [
  { label: "8–10 AM", from: 8, to: 10 },
  { label: "10 AM–12 PM", from: 10, to: 12 },
  { label: "12–2 PM", from: 12, to: 14 },
  { label: "2–4 PM", from: 14, to: 16 },
  { label: "4–6 PM", from: 16, to: 18 },
  { label: "6–8 PM", from: 18, to: 20 },
];

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
