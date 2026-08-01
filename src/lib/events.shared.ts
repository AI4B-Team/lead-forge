// Event catalogue shared by the server emitter and the settings UI.
export const EVENT_TYPES = [
  "job.completed",
  "leads.new",
  "lead.flagged_dnc",
  "lead.flagged_litigator",
  "campaign.launched",
  "message.reply_received",
  "brand.approved",
  "credits.low",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
