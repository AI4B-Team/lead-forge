/**
 * Pure conversation intelligence used by the Conversations workspace.
 * No I/O — safe to import on the client and inside server functions.
 */
import { classifyIntent, type Intent } from "@/lib/performance-intel";

export type { Intent };
export { classifyIntent };

export type Sentiment = "positive" | "neutral" | "negative";

const POSITIVE = /(thanks|thank you|great|perfect|sounds good|awesome|yes|interested|please|appreciate)/i;
const NEGATIVE = /(not interested|stop|remove|no thanks|angry|scam|spam|wrong number|leave me alone|never)/i;

export function sentimentOf(text: string | null | undefined): Sentiment {
  const t = (text ?? "").trim();
  if (!t) return "neutral";
  if (NEGATIVE.test(t)) return "negative";
  if (POSITIVE.test(t)) return "positive";
  return "neutral";
}

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

/** Auto-detected conversation labels, ordered by importance. */
export type ConvoBadge =
  | "Hot Lead"
  | "Appointment"
  | "Price Request"
  | "Qualified"
  | "Interested"
  | "Objection"
  | "Question"
  | "Opted Out";

const PRICE = /(price|pricing|cost|how much|quote|estimate|rate|\$)/i;
const OBJECTION = /(too expensive|not now|maybe later|already have|busy|call back later|not the right time|no budget)/i;

export function detectBadges(bodies: string[], isOptout: boolean): ConvoBadge[] {
  const out: ConvoBadge[] = [];
  const inboundText = bodies.join(" \n ");
  const intent = classifyIntent(inboundText, isOptout);
  if (isOptout) out.push("Opted Out");
  if (intent === "appointment") out.push("Appointment");
  if (PRICE.test(inboundText)) out.push("Price Request");
  if (intent === "qualified") out.push("Interested");
  if (OBJECTION.test(inboundText)) out.push("Objection");
  if (/\?/.test(inboundText)) out.push("Question");
  if (out.includes("Appointment") || (out.includes("Price Request") && out.includes("Interested"))) {
    out.unshift("Hot Lead");
  }
  if (bodies.length >= 3 && !isOptout && !out.includes("Qualified") && out.includes("Interested")) {
    out.push("Qualified");
  }
  return Array.from(new Set(out)).slice(0, 4);
}

export const BADGE_TONE: Record<ConvoBadge, "success" | "warn" | "danger" | "info"> = {
  "Hot Lead": "danger",
  Appointment: "info",
  "Price Request": "warn",
  Qualified: "success",
  Interested: "success",
  Objection: "warn",
  Question: "info",
  "Opted Out": "danger",
};

/**
 * 0-100 likelihood-to-convert score from observable signals: reply depth,
 * intent, recency and opt-out state. Deterministic so it never flickers.
 */
export function leadScore(opts: {
  inboundCount: number;
  outboundCount: number;
  intent: Intent;
  lastAt: string;
  isOptout: boolean;
  hasPhoneType?: string | null;
}): number {
  if (opts.isOptout) return 4;
  let s = 34;
  s += Math.min(opts.inboundCount, 5) * 6;
  if (opts.intent === "appointment") s += 34;
  else if (opts.intent === "qualified") s += 22;
  else if (opts.intent === "question") s += 12;
  else if (opts.intent === "negative") s -= 22;
  const hoursOld = (Date.now() - new Date(opts.lastAt).getTime()) / 3_600_000;
  if (hoursOld < 4) s += 10;
  else if (hoursOld < 24) s += 6;
  else if (hoursOld > 24 * 7) s -= 8;
  if (opts.hasPhoneType === "mobile" || opts.hasPhoneType === "wireless") s += 4;
  if (opts.outboundCount > 4 && opts.inboundCount === 0) s -= 10;
  return Math.max(2, Math.min(99, Math.round(s)));
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Very Likely To Convert";
  if (score >= 68) return "Strong Signal";
  if (score >= 48) return "Worth Working";
  if (score >= 25) return "Low Signal";
  return "Cold";
}

export function starsFor(score: number): number {
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

/** Human day labels instead of raw "4d" deltas. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function relativeShort(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just Now";
  if (m < 60) return `${m} Min Ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} Hour${h === 1 ? "" : "s"} Ago`;
  const d = Math.round(h / 24);
  return `${d} Day${d === 1 ? "" : "s"} Ago`;
}

/** Slash commands available in the composer. */
export const SLASH_COMMANDS = [
  { cmd: "/friendly", label: "Friendly Rewrite", hint: "Warm, casual tone" },
  { cmd: "/professional", label: "Professional Rewrite", hint: "Polished and direct" },
  { cmd: "/pricing", label: "Pricing Response", hint: "Answer pricing without over-promising" },
  { cmd: "/qualify", label: "Qualify", hint: "Ask the next qualifying question" },
  { cmd: "/followup", label: "Follow Up", hint: "Nudge a quiet lead" },
  { cmd: "/rebook", label: "Rebook", hint: "Offer new times" },
  { cmd: "/close", label: "Close", hint: "Ask for the appointment" },
] as const;

export type SlashCommand = (typeof SLASH_COMMANDS)[number]["cmd"];
