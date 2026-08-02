// ---------------------------------------------------------------------------
// "Request A Source" intake — shared shape, options, and compliance screening.
// Used by the client for instant feedback and re-run on the server, which is
// the authority on whether a request is queued as buildable.
// ---------------------------------------------------------------------------

export type SourceRequestFrequency = "one_time" | "daily" | "weekly" | "monthly";

export const FREQUENCY_OPTIONS: { value: SourceRequestFrequency; label: string; hint: string }[] = [
  { value: "one_time", label: "One Time", hint: "Pull It Once" },
  { value: "daily", label: "Daily", hint: "Fresh Records Every Day" },
  { value: "weekly", label: "Weekly", hint: "Rescan Once A Week" },
  { value: "monthly", label: "Monthly", hint: "Rescan Once A Month" },
];

export const FREQUENCY_LABEL: Record<string, string> = {
  one_time: "One Time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** The fields an adapter can be scoped to deliver. */
export const DESIRED_FIELD_OPTIONS = [
  "Name",
  "Business Name",
  "Phone",
  "Email",
  "Mailing Address",
  "Property Address",
  "Website",
  "Social Profile",
  "Listing Details",
  "Filing Date",
] as const;

export type SourceRequestInput = {
  sourceLabel: string;
  targetUrl?: string | null;
  desiredFields: string[];
  geo?: string | null;
  frequency: SourceRequestFrequency;
  notes?: string | null;
};

export type ScreenResult =
  | { ok: true }
  | { ok: false; category: "login_walled" | "impermissible_data"; reason: string };

/** Sites whose useful data sits behind an account/ToS wall. */
const LOGIN_WALLED = [
  "linkedin",
  "facebook",
  "instagram",
  "tiktok",
  "nextdoor",
  "indeed resume",
  "glassdoor",
  "match.com",
  "tinder",
  "bumble",
  "onlyfans",
  "ancestry",
];

/** Phrases that describe getting past an authentication or access control. */
const LOGIN_PHRASES = [
  "behind a login",
  "behind the login",
  "behind login",
  "behind a paywall",
  "behind the paywall",
  "behind paywall",
  "logged in",
  "log in with",
  "login with my",
  "use my account",
  "my credentials",
  "my password",
  "members only",
  "member area",
  "member portal",
  "bypass",
  "captcha",
  "private profile",
  "private message",
  "scrape dms",
  "direct messages",
  "gated portal",
  "mls login",
  "paid subscription login",
];

/** Data classes that can't be used compliantly for outreach. */
const IMPERMISSIBLE = [
  "ssn",
  "social security",
  "credit score",
  "credit report",
  "credit history",
  "bank account",
  "routing number",
  "account number",
  "card number",
  "medical",
  "health record",
  "patient",
  "prescription",
  "diagnosis",
  "hipaa",
  "tenant screening",
  "employment screening",
  "background check",
  "pre-employment",
  "minors",
  "children under",
  "under 18",
  "students under",
  "biometric",
  "date of birth and ssn",
  "immigration status",
  "religion",
  "sexual orientation",
  "dating profile",
  "password",
];

function haystack(input: SourceRequestInput): string {
  return [input.sourceLabel, input.targetUrl ?? "", input.geo ?? "", input.notes ?? "", input.desiredFields.join(" ")]
    .join(" \n ")
    .toLowerCase();
}

/**
 * LeadTrace only builds sources it can run compliantly. Anything that requires
 * defeating an access control, or that asks for data outside permissible
 * outreach use, is recorded but never queued as buildable.
 */
export function screenSourceRequest(input: SourceRequestInput): ScreenResult {
  const text = haystack(input);

  const phrase = LOGIN_PHRASES.find((p) => text.includes(p));
  if (phrase) {
    return {
      ok: false,
      category: "login_walled",
      reason:
        "This Asks Us To Pull Data From Behind A Login, Paywall, Or Other Access Control. LeadTrace Only Builds Sources It Can Access Publicly And Within The Site's Terms.",
    };
  }

  const site = LOGIN_WALLED.find((s) => text.includes(s));
  if (site) {
    return {
      ok: false,
      category: "login_walled",
      reason:
        "That Site's Useful Data Sits Behind An Account And Its Terms Prohibit Automated Collection, So We Can't Build It As A Source. Public Records And Public Business Listings Are Fair Game.",
    };
  }

  const data = IMPERMISSIBLE.find((d) => text.includes(d));
  if (data) {
    return {
      ok: false,
      category: "impermissible_data",
      reason:
        "That Data Type Can't Be Used Compliantly For Outreach — Credit, Financial, Medical, Screening, And Minors' Data Are Off Limits Regardless Of Source. Ask For Contact Fields Like Name, Phone, Email, And Address Instead.",
    };
  }

  return { ok: true };
}

/** Canonical grouping key — must match the SQL demand report. */
export function sourceRequestKey(input: {
  sourceLabel?: string | null;
  templateId?: string | null;
  recordType?: string | null;
  county?: string | null;
}): string {
  return (
    input.sourceLabel?.trim() ||
    input.templateId?.trim() ||
    input.recordType?.trim() ||
    input.county?.trim() ||
    "unspecified"
  ).toLowerCase();
}