// ---------------------------------------------------------------------------
// Outreach channel per list. SMS is the only channel LeadTrace SENDS on; email
// and direct mail are export/handoff channels. The channel is inferred from the
// template and can be overridden in the List Builder.
// ---------------------------------------------------------------------------

import {
  enrichmentProfile,
  isDataSource,
  isNonUsRun,
  US_REALESTATE_PORTAL_IDS,
} from "@/lib/pipeline-options";

export type Channel = "sms" | "email" | "direct_mail";

export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: "SMS",
  email: "Email",
  direct_mail: "Direct Mail",
};

export const CHANNEL_HINT: Record<Channel, string> = {
  sms: "Texting is the only channel LeadTrace sends on. Numbers are line-type checked and DNC scrubbed.",
  email:
    "Email lists deliver a contact-email file. LeadTrace does not send email — export it or hand it to your email tool.",
  direct_mail:
    "Direct-mail lists deliver a standardized mailing-address file. LeadTrace does not print or mail anything.",
};

/** Distress record types where a mailed letter is the normal play. */
const DIRECT_MAIL_RECORD_TYPES = [
  "probate",
  "pre_foreclosure",
  "pre-foreclosure",
  "tax",
  "tax delinquent",
  "code_violation",
  "code violation",
  "vacancy",
  "eviction",
  "divorce",
  "lien",
];

function normalizeRecordType(v?: string | null) {
  return (v ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function offersDirectMail(input: {
  templateId?: string | null;
  sourceType?: string | null;
  recordType?: string | null;
}): boolean {
  if (isDataSource(input.templateId)) return false;
  if (US_REALESTATE_PORTAL_IDS.includes(input.templateId ?? "")) return true;
  if (input.sourceType === "records") return true;
  const rt = normalizeRecordType(input.recordType);
  return DIRECT_MAIL_RECORD_TYPES.map(normalizeRecordType).includes(rt);
}

/**
 * The channel a source defaults to. Creator/social, B2B, marketplace sellers
 * and any non-US geography go out by email; US business + records go by text.
 */
export function inferChannel(input: {
  templateId?: string | null;
  sourceType?: string | null;
  recordType?: string | null;
  country?: string | null;
}): Channel {
  const profile = enrichmentProfile(input.templateId);
  if (profile === "creator" || profile === "seller" || profile === "b2b") return "email";
  if (isNonUsRun({ templateId: input.templateId, country: input.country })) return "email";
  return "sms";
}

/** Channels a user may pick for this source. */
export function channelOptions(input: {
  templateId?: string | null;
  sourceType?: string | null;
  recordType?: string | null;
  country?: string | null;
}): Channel[] {
  const out: Channel[] = [];
  const nonUs = isNonUsRun({ templateId: input.templateId, country: input.country });
  if (!nonUs) out.push("sms");
  out.push("email");
  if (offersDirectMail(input) && !nonUs) out.push("direct_mail");
  return out;
}

export function normalizeChannel(value?: string | null): Channel {
  return value === "email" || value === "direct_mail" ? value : "sms";
}

/** SMS is the only channel with a sending engine behind it. */
export function channelCanLaunch(channel: Channel): boolean {
  return channel === "sms";
}

/** Label of the verify stage in the funnel, per channel. */
export function verifyStageLabel(channel: Channel): string {
  if (channel === "email") return "Email Found";
  if (channel === "direct_mail") return "Address Verified";
  return "Mobile Verified";
}

/** The primary action on a finished run. */
export function channelPrimaryAction(channel: Channel): { label: string; note: string } {
  if (channel === "email") return { label: "Export", note: "Export Or Connect Your Email Tool" };
  if (channel === "direct_mail") return { label: "Export", note: "Export For Your Mail House" };
  return { label: "Launch Campaign", note: "Text Your Clean Leads" };
}

/** What a recurring run does automatically when it lands. */
export function automatedActionLabel(channel: Channel, autoLaunch: boolean): string {
  if (channel !== "sms") return "Export + Notify";
  return autoLaunch ? "Auto-Launch Campaign" : "Notify Me";
}

/** What each channel requires of a record before it counts as deliverable. */
export function channelRequirement(channel: Channel): "phone" | "email" | "address" {
  if (channel === "email") return "email";
  if (channel === "direct_mail") return "address";
  return "phone";
}

/** Phone enrichment + compliance scrub only make sense on the SMS channel. */
export function channelUsesPhonePipeline(channel: Channel): boolean {
  return channel === "sms";
}

export const CHANNEL_LEAD_NOUN: Record<Channel, string> = {
  sms: "Textable Leads",
  email: "Email-Reachable Leads",
  direct_mail: "Mailable Records",
};
