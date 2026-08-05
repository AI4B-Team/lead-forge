/**
 * Workflow vocabulary for a conversation. These mirror the outcome language
 * used on lead records so a status set in the inbox means the same thing in
 * reporting — one vocabulary, not two.
 */
export const THREAD_STATUSES = [
  { value: "new", label: "New", tone: "muted" },
  { value: "contacted", label: "Contacted", tone: "muted" },
  { value: "responded", label: "Responded", tone: "default" },
  { value: "qualified", label: "Qualified", tone: "success" },
  { value: "appointment", label: "Appointment Set", tone: "success" },
  { value: "not_interested", label: "Not Interested", tone: "muted" },
  { value: "bad_number", label: "Bad Number", tone: "danger" },
  { value: "do_not_contact", label: "Do Not Contact", tone: "danger" },
] as const;

export type ThreadStatus = (typeof THREAD_STATUSES)[number]["value"];

export const THREAD_STATUS_VALUES = THREAD_STATUSES.map((s) => s.value) as unknown as [
  ThreadStatus,
  ...ThreadStatus[],
];

export function threadStatusLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return THREAD_STATUSES.find((s) => s.value === value)?.label ?? null;
}

/** Tab order: All first, then action-oriented buckets. */
export const INBOX_TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "needs_reply", label: "Needs Reply" },
  { value: "starred", label: "Starred" },
  { value: "archived", label: "Archived" },
] as const;

/** Reasons the system archives a thread on its own, in plain language. */
export const AUTO_ARCHIVE_REASONS: Record<string, string> = {
  negative_keyword: "Archived automatically — the reply contained language we stop on",
  suppressed: "Archived automatically — this contact is suppressed",
  optout: "Archived automatically — this contact opted out",
};
