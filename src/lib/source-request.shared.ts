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

/** Does the source need an account, and what kind? Drives the risk tier. */
export type LoginRequirement = "none" | "free_public_records" | "restricted_platform" | "unsure";

export const LOGIN_OPTIONS: { value: LoginRequirement; label: string; hint: string }[] = [
  { value: "none", label: "No Login Needed", hint: "Fully Public Pages Or Records" },
  {
    value: "free_public_records",
    label: "Free Account — Public Records Portal",
    hint: "County / Court / Municipal Portal That Asks For A Free Signup",
  },
  {
    value: "restricted_platform",
    label: "Paid Or Terms-Restricted Platform",
    hint: "MLS, Social Network, Data Vendor, Subscription Site",
  },
  { value: "unsure", label: "Not Sure", hint: "We'll Check The Terms During Review" },
];

export const LOGIN_LABEL: Record<string, string> = {
  none: "No Login",
  free_public_records: "Free Public-Records Login",
  restricted_platform: "Terms-Restricted Login",
  unsure: "Login Unknown",
};

export type SourceRequestInput = {
  sourceLabel: string;
  targetUrl?: string | null;
  desiredFields: string[];
  geo?: string | null;
  frequency: SourceRequestFrequency;
  notes?: string | null;
  loginRequired?: LoginRequirement;
};

/** Acquisition risk tier — separate from whether the data can be cold-contacted. */
export type RiskTier = "standard" | "review" | "rejected";

export type OutreachNote = { level: "ok" | "caution" | "restricted"; text: string };

export type ScreenResult = {
  /** Recorded and moves forward (queued or human review). */
  ok: boolean;
  tier: RiskTier;
  /** Why it needs review, or why it can't be built at all. */
  reason: string | null;
  /** Independent read on using the data for SMS / email / mail. */
  outreach: OutreachNote;
};

export const TIER_LABEL: Record<RiskTier, string> = {
  standard: "Standard",
  review: "Needs Review",
  rejected: "Can't Build",
};

export const TIER_STATUS: Record<RiskTier, string> = {
  standard: "queued",
  review: "needs_review",
  rejected: "screened_out",
};

/** Platforms whose terms explicitly prohibit automated collection. */
const RESTRICTED_PLATFORMS = [
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
  "zillow",
  "mls",
  "crunchbase",
  "yelp api",
  "truepeoplesearch",
];

/**
 * Phrases that signal terms-restricted automated access, or reaching a third
 * party's private/proprietary data. These flag for human review — not rejection.
 */
const REVIEW_PHRASES = [
  "prohibits automated",
  "no scraping",
  "terms prohibit",
  "against their terms",
  "bypass",
  "captcha",
  "use my account",
  "my credentials",
  "my password",
  "shared login",
  "members only",
  "member area",
  "paid subscription",
  "private profile",
  "private message",
  "scrape dms",
  "direct messages",
  "mls login",
  "behind a paywall",
  "behind the paywall",
  "behind paywall",
];

/** Language that marks the source as public records / public listings. */
const PUBLIC_RECORD_PHRASES = [
  "public record",
  "county",
  "clerk",
  "recorder",
  "assessor",
  "tax collector",
  "probate",
  "foreclosure",
  "code violation",
  "code enforcement",
  "permit",
  "court",
  "docket",
  "eviction",
  "lien",
  "business license",
  "llc filing",
  "secretary of state",
  "municipal",
  ".gov",
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
];

/** Consumer-distress record types where cold outreach carries extra rules. */
const SENSITIVE_RECORDS = ["probate", "eviction", "foreclosure", "divorce", "bankruptcy", "tax delinquen"];

function haystack(input: SourceRequestInput): string {
  return [input.sourceLabel, input.targetUrl ?? "", input.geo ?? "", input.notes ?? "", input.desiredFields.join(" ")]
    .join(" \n ")
    .toLowerCase();
}

/**
 * Outreach use is judged independently of acquisition: plenty of data is fine to
 * collect but not fine to cold-contact.
 */
export function outreachNote(input: SourceRequestInput): OutreachNote {
  const text = haystack(input);
  const fields = input.desiredFields.map((f) => f.toLowerCase());
  const wantsPhone = fields.some((f) => f.includes("phone"));
  const wantsEmail = fields.some((f) => f.includes("email"));

  if (SENSITIVE_RECORDS.some((s) => text.includes(s))) {
    return {
      level: "caution",
      text:
        "Collecting These Records Is Fine, But Cold Contact Is Sensitive — We'll Route Phones Through DNC / Litigator Scrubbing And Quiet Hours, And Some States Restrict Distress-Record Solicitation.",
    };
  }
  if (wantsPhone || wantsEmail) {
    return {
      level: "caution",
      text:
        "Contactability Is Judged Separately From Collection: Numbers Get DNC And Litigator Scrubbing Before Any Send, And Consent Rules Under TCPA Still Apply Per Campaign.",
    };
  }
  return {
    level: "ok",
    text: "No Direct Contact Fields Requested — Mail Or Enrichment Use Only Until You Add Phone Or Email.",
  };
}

/**
 * Tier the request by real risk instead of "is it login-walled". Free-login
 * public-records portals queue normally; terms-restricted or third-party
 * proprietary access gets a human look; only impermissible data classes are
 * refused outright.
 */
export function screenSourceRequest(input: SourceRequestInput): ScreenResult {
  const text = haystack(input);
  const login = input.loginRequired ?? "none";
  const outreach = outreachNote(input);

  const data = IMPERMISSIBLE.find((d) => text.includes(d));
  if (data) {
    return {
      ok: false,
      tier: "rejected",
      outreach,
      reason:
        "That Data Class Is Off Limits Regardless Of Source — Credit, Financial, Medical, Screening, Biometric, And Minors' Data. Ask For Contact Fields Like Name, Phone, Email, And Address Instead.",
    };
  }

  if (login === "restricted_platform") {
    return {
      ok: true,
      tier: "review",
      outreach,
      reason:
        "You Marked This As A Paid Or Terms-Restricted Login. We'll Have A Human Read The Terms Before Building — Authenticated Access To A Platform's Proprietary Data Isn't Auto-Approved.",
    };
  }

  const phrase = REVIEW_PHRASES.find((p) => text.includes(p));
  if (phrase) {
    return {
      ok: true,
      tier: "review",
      outreach,
      reason:
        "This Describes Automated Access That May Be Restricted By The Site's Terms, Or Reaching Another Party's Private Data. Flagged For Human Review Before Any Build.",
    };
  }

  const platform = RESTRICTED_PLATFORMS.find((s) => text.includes(s));
  if (platform) {
    return {
      ok: true,
      tier: "review",
      outreach,
      reason:
        "That Platform's Terms Commonly Prohibit Automated Collection, So It Goes To Human Review Rather Than Straight To The Build Queue.",
    };
  }

  if (login === "unsure" && !PUBLIC_RECORD_PHRASES.some((p) => text.includes(p))) {
    return {
      ok: true,
      tier: "review",
      outreach,
      reason:
        "We Can't Tell Yet Whether This Source Allows Automated Access. We'll Check The Terms During Review — No Action Needed From You.",
    };
  }

  return { ok: true, tier: "standard", outreach, reason: null };
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