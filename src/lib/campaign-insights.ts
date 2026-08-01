import { segmentsFor } from "@/lib/drops";
import { spinOnce } from "@/lib/spintax";

export type TouchInput = { delay_minutes: number; body: string };

/** Per-touch expected reply contribution — decaying returns after touch 1. */
export function replyLift(index: number): number {
  const curve = [12, 4, 2, 1, 0.7, 0.5];
  return curve[index] ?? 0.3;
}

export function totalReplyRate(touches: number): number {
  let total = 0;
  for (let i = 0; i < touches; i++) total += replyLift(i);
  return Math.round(total * 10) / 10;
}

/** Rough SMS spam risk from length, caps, links and trigger words. */
export function spamScore(body: string): { level: "Low" | "Medium" | "High"; reasons: string[] } {
  const reasons: string[] = [];
  const text = spinOnce(body);
  if (text.length > 320) reasons.push("Message Runs Over 2 Segments");
  const letters = text.replace(/[^A-Za-z]/g, "");
  const caps = letters.replace(/[^A-Z]/g, "").length;
  if (letters.length > 12 && caps / letters.length > 0.4) reasons.push("Heavy Capitalization");
  if (/https?:\/\/|www\./i.test(text)) reasons.push("Contains A Link");
  if (/(free|guarantee|winner|cash|urgent|act now|!!!)/i.test(text)) reasons.push("Carrier Trigger Words");
  const level = reasons.length === 0 ? "Low" : reasons.length === 1 ? "Medium" : "High";
  return { level, reasons };
}

/** Share of touches that use at least one merge token. */
export function personalizationScore(bodies: string[]): number {
  if (!bodies.length) return 0;
  const withToken = bodies.filter((b) => /\{\{\s*\w+\s*\}\}/.test(b)).length;
  const base = Math.round((withToken / bodies.length) * 85);
  const firstName = bodies.some((b) => /\{\{\s*first_name\s*\}\}/.test(b)) ? 15 : 0;
  return Math.min(100, base + firstName);
}

/** ~180 words per minute reading speed, floored at 2 seconds. */
export function readingSeconds(bodies: string[]): number {
  const words = bodies.reduce((n, b) => n + spinOnce(b).split(/\s+/).filter(Boolean).length, 0);
  return Math.max(2, Math.round((words / 180) * 60));
}

export type Projection = {
  recipients: number;
  touches: number;
  segmentsPerContact: number;
  projectedMessages: number;
  credits: number;
  dollars: number;
  perDay: number;
  durationDays: number;
  sequenceDays: number;
};

export function projectCampaign({
  recipients,
  bodies,
  dailyCap,
  totalDelayMinutes,
}: {
  recipients: number;
  bodies: string[];
  dailyCap: number;
  totalDelayMinutes: number;
}): Projection {
  const touches = bodies.length;
  const segmentsPerContact = bodies.reduce((n, b) => n + segmentsFor(spinOnce(b)), 0);
  const projectedMessages = recipients * touches;
  const credits = recipients * segmentsPerContact;
  const perDay = Math.max(1, dailyCap);
  const sendDays = recipients ? Math.ceil(recipients / perDay) : 0;
  const sequenceDays = Math.ceil(totalDelayMinutes / (60 * 24));
  return {
    recipients,
    touches,
    segmentsPerContact,
    projectedMessages,
    credits,
    dollars: Math.round(credits * 0.006 * 100) / 100,
    perDay,
    durationDays: sendDays + sequenceDays,
    sequenceDays,
  };
}

export type HealthCheck = { label: string; ok: boolean; detail: string };

export function healthChecks({
  registered,
  brandPicked,
  listPicked,
  numbersAvailable,
  quietValid,
  dropTimesValid,
}: {
  registered: boolean;
  brandPicked: boolean;
  listPicked: boolean;
  numbersAvailable: number;
  quietValid: boolean;
  dropTimesValid: boolean;
}): HealthCheck[] {
  return [
    { label: "TCPA Ready", ok: quietValid && dropTimesValid, detail: quietValid && dropTimesValid ? "Quiet Hours & Drop Times Compliant" : "Fix Quiet Hours Or Drop Times" },
    { label: "Brand Approved", ok: registered, detail: registered ? "10DLC Campaign Approved" : "Registration Pending" },
    { label: "Brand Selected", ok: brandPicked, detail: brandPicked ? "Bot Speaks From Approved Material" : "Pick Or Create A Brand" },
    { label: "List Selected", ok: listPicked, detail: listPicked ? "Clean, Scrubbed Records Loaded" : "Pick A Ready List" },
    { label: "Numbers Available", ok: numbersAvailable > 0, detail: numbersAvailable > 0 ? `${numbersAvailable} Active In Pool` : "Buy Or Activate A Number" },
    { label: "STOP Handling Enabled", ok: true, detail: "Inbound STOP Suppresses Instantly" },
  ];
}

/** Deliverability estimate driven by compliance state and message hygiene. */
export function deliverability(checks: HealthCheck[], spam: "Low" | "Medium" | "High"): number {
  const passing = checks.filter((c) => c.ok).length;
  const base = 80 + Math.round((passing / checks.length) * 18);
  const penalty = spam === "High" ? 12 : spam === "Medium" ? 5 : 0;
  return Math.max(50, Math.min(99, base - penalty));
}

export type Suggestion = { text: string; tone: "warn" | "ok" };

export function aiSuggestions({
  touches,
  bodies,
  dailyCap,
  recipients,
}: {
  touches: TouchInput[];
  bodies: string[];
  dailyCap: number;
  recipients: number;
}): Suggestion[] {
  const out: Suggestion[] = [];
  const longest = bodies.find((b) => spinOnce(b).length > 160);
  if (longest) out.push({ text: "Shorten A Touch — Over 160 Characters Costs A Second Segment", tone: "warn" });
  const second = touches[1];
  if (second && second.delay_minutes < 120) out.push({ text: "Increase Touch 2 Delay To At Least 2 Hours", tone: "warn" });
  if (personalizationScore(bodies) < 70) out.push({ text: "Add {{first_name}} Or {{city}} To Lift Personalization", tone: "warn" });
  if (touches.length < 3) out.push({ text: "Add A Third Touch — Most Replies Land After Follow-Up Two", tone: "warn" });
  const hasSpintax = bodies.some((b) => /\{[^{}]*\|[^{}]*\}/.test(b));
  if (!hasSpintax) out.push({ text: "Add Spintax Variety So Carriers See Rotating Wording", tone: "warn" });
  if (recipients > 0 && dailyCap > 0 && recipients / dailyCap > 30) {
    out.push({ text: "Raise Daily Cap Or Split The List — Delivery Would Take Over A Month", tone: "warn" });
  }
  if (!out.length) out.push({ text: "Sequence Looks Strong — Pacing, Length And Personalization All Pass", tone: "ok" });
  return out.slice(0, 5);
}

/** Render merge tokens with sample lead values for previews. */
export function renderSample(body: string, lead: Record<string, string>): string {
  return spinOnce(body).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => lead[k] ?? k);
}
