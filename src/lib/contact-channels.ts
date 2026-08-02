// ---------------------------------------------------------------------------
// Contact-with-channels model. A lead is a contact that may carry any subset of
// channels. Reachability — not mere presence — is what the UI expresses: line
// type and suppression stay as compliance metadata *inside* the phone channel.
// ---------------------------------------------------------------------------

export type ChannelKind = "phone" | "email" | "address" | "website" | "social";

/** The three channels LeadTrace actually acts on today. */
export const OUTREACH_CHANNEL_KINDS: ChannelKind[] = ["phone", "email", "address"];

export type ContactChannel = {
  kind: ChannelKind;
  /** Usable = we can legally/technically reach the contact on this channel. */
  usable: boolean;
  label: string;
  value: string;
  /** Compliance / quality detail shown on hover. */
  detail: string[];
};

export type ChannelContact = {
  phone?: string | null;
  phone_type?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  website?: string | null;
  socials?: Record<string, string> | null;
  disposition?: string | null;
};

const LINE_TYPE_LABEL: Record<string, string> = {
  mobile: "Mobile",
  landline: "Landline",
  voip: "VoIP",
  unknown: "Line Type Unknown",
};

export function isTextablePhone(c: ChannelContact): boolean {
  if (!c.phone) return false;
  if (c.disposition === "dnc" || c.disposition === "litigator") return false;
  return (c.phone_type ?? "unknown") === "mobile";
}

export function mailingAddress(c: ChannelContact): string {
  return [c.address, [c.city, c.state].filter(Boolean).join(", "), c.zip]
    .filter(Boolean)
    .join(" · ");
}

/** Only channels that exist are returned — absent channels are never rendered. */
export function contactChannels(c: ChannelContact): ContactChannel[] {
  const out: ContactChannel[] = [];

  if (c.phone) {
    const lineType = LINE_TYPE_LABEL[c.phone_type ?? "unknown"] ?? "Line Type Unknown";
    const detail = [lineType];
    if (c.disposition === "dnc") detail.push("DNC Suppressed — Not Textable");
    else if (c.disposition === "litigator") detail.push("Litigator — Blocked");
    else if ((c.phone_type ?? "unknown") !== "mobile") detail.push("Not Textable — SMS Requires A Mobile Line");
    else detail.push("Textable");
    out.push({ kind: "phone", usable: isTextablePhone(c), label: "Phone", value: c.phone, detail });
  }

  if (c.email) {
    const usable = c.disposition !== "litigator";
    out.push({
      kind: "email",
      usable,
      label: "Email",
      value: c.email,
      detail: [usable ? "Email-Reachable" : "Litigator — Excluded From Outreach"],
    });
  }

  if (c.address) {
    out.push({
      kind: "address",
      usable: true,
      label: "Mailing Address",
      value: mailingAddress(c),
      detail: ["Mailable"],
    });
  }

  if (c.website) {
    out.push({
      kind: "website",
      usable: true,
      label: "Website",
      value: c.website,
      detail: ["Data Only — No Outreach"],
    });
  }

  for (const [network, handle] of Object.entries(c.socials ?? {})) {
    if (!handle) continue;
    out.push({
      kind: "social",
      usable: true,
      label: network.charAt(0).toUpperCase() + network.slice(1),
      value: String(handle),
      detail: ["Data Only — No Outreach"],
    });
  }

  return out;
}

/** Per-channel eligible counts for campaign launch. */
export function channelEligibility(contacts: ChannelContact[]) {
  let sms = 0;
  let email = 0;
  let mail = 0;
  for (const c of contacts) {
    if (isTextablePhone(c)) sms += 1;
    if (c.email && c.disposition !== "litigator") email += 1;
    if (c.address) mail += 1;
  }
  return { sms, email, mail };
}
