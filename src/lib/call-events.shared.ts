/**
 * Voice-channel helpers shared by the inbox, dashboard and number settings.
 * Pure — no I/O — so it is safe on the client and inside server functions.
 */

export type MessageChannel = "sms" | "voice";
export type CallEvent = "voicemail" | "missed" | "answered" | "forwarded";

export const CALL_EVENT_LABEL: Record<CallEvent, string> = {
  voicemail: "Voicemail",
  missed: "Missed Call",
  answered: "Answered Call",
  forwarded: "Forwarded Call",
};

/** A callback is a strong buy signal — these outcomes pull a human in. */
export const CALLBACK_NEEDS_REPLY: CallEvent[] = ["voicemail", "missed"];

export function isVoice(channel: string | null | undefined): boolean {
  return channel === "voice";
}

export function callEventLabel(event: string | null | undefined): string {
  return CALL_EVENT_LABEL[(event ?? "voicemail") as CallEvent] ?? "Call";
}

export function durationLabel(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return m ? `${m}:${String(s % 60).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}

/**
 * Forwarding scope. Pool-wide is today's only shipped option, but the setting
 * is modelled as a scope so per-number and per-campaign routing can be added
 * later without reshaping the data or the server contract.
 */
export type ForwardScope = "pool" | "numbers" | "campaign";

export const FORWARD_SCOPES: Array<{
  value: ForwardScope;
  label: string;
  hint: string;
  available: boolean;
}> = [
  { value: "pool", label: "Every Number In My Pool", hint: "One line answers every callback.", available: true },
  { value: "numbers", label: "Selected Numbers", hint: "Route specific numbers to a different line.", available: false },
  { value: "campaign", label: "By Campaign", hint: "Send each campaign's callbacks to its own rep.", available: false },
];

/**
 * States commonly treated as all-party (two-party) consent for call recording.
 * Informational only — jurisdiction rules change and this is not legal advice.
 */
export const ALL_PARTY_CONSENT_STATES = [
  "CA", "CT", "DE", "FL", "IL", "MD", "MA", "MI", "MT", "NV", "NH", "OR", "PA", "WA",
] as const;

export const RECORDING_CONSENT_NOTICE =
  "Call recording is governed by state wiretap law, which is separate from texting rules. Some states are one-party consent; others require all parties to consent. Recording callers from those states without a disclosure can create liability.";

export const RECORDING_DISCLOSURE_LINE =
  "This call may be recorded and transcribed for quality and record-keeping.";

/** Prepend the disclosure to a greeting exactly once. */
export function withDisclosure(greeting: string, enabled: boolean): string {
  const g = greeting.trim();
  const has = g.toLowerCase().includes("may be recorded");
  if (!enabled) return has ? g.replace(RECORDING_DISCLOSURE_LINE, "").trim() : g;
  if (has) return g;
  return `${RECORDING_DISCLOSURE_LINE} ${g}`.trim();
}