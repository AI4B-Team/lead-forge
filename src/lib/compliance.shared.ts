/**
 * Spec §21 — single computed compliance state for the whole workspace.
 * Every surface (Compliance Center, Settings rail, dashboard) renders from this
 * one function so statuses and percentages can never disagree.
 */
import { RESCRUB_DAYS, scrubAgeDays } from "./compliance-rules";

export type TenDlcStage = "not_started" | "brand" | "campaign" | "in_review" | "live";

export type ComplianceInput = {
  brandStatus?: string | null;
  campaignStatus?: string | null;
  stopHandling: boolean;
  replyDetection: boolean;
  lastScrubAt?: string | null;
  suppressionTotal: number;
};

export type ComplianceCheck = {
  label: string;
  ok: boolean;
  weight: number;
  detail: string;
};

export type ComplianceState = {
  score: number;
  label: "Healthy" | "Needs Attention" | "At Risk";
  tone: "success" | "warn" | "danger";
  stage: TenDlcStage;
  tenDlcLabel: "Registered" | "In Review" | "Not Started";
  tenDlcTone: "success" | "warn" | "muted";
  registrationSteps: Array<{ label: string; done: boolean; note: string }>;
  registrationPct: number;
  checks: ComplianceCheck[];
  affecting: string[];
};

export function tenDlcStage(brand?: string | null, campaign?: string | null): TenDlcStage {
  if (campaign === "approved") return "live";
  if (campaign === "pending" || campaign === "submitted") return "in_review";
  if (brand === "approved") return "campaign";
  if (brand === "pending" || brand === "submitted") return "brand";
  return "not_started";
}

const STAGE_ORDER: TenDlcStage[] = ["not_started", "brand", "campaign", "in_review", "live"];

export function computeCompliance(input: ComplianceInput): ComplianceState {
  const stage = tenDlcStage(input.brandStatus, input.campaignStatus);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const age = scrubAgeDays(input.lastScrubAt);
  const scrubFresh = age !== null && age < RESCRUB_DAYS;

  const checks: ComplianceCheck[] = [
    {
      label: stage === "live" ? "10DLC Registered" : "10DLC In Review",
      ok: stage === "live",
      weight: 40,
      detail:
        stage === "live"
          ? "Carrier Approved — Sending Live."
          : stage === "not_started"
            ? "Texting Brand Not Submitted Yet."
            : "Awaiting Carrier Approval.",
    },
    {
      label: "STOP Handling Enabled",
      ok: input.stopHandling,
      weight: 20,
      detail: "Opt-Out Footer And Automatic STOP Processing.",
    },
    {
      label: "Reply Detection Active",
      ok: input.replyDetection,
      weight: 15,
      detail: "Inbound Replies Pause The Drip Automatically.",
    },
    {
      label: scrubFresh ? "DNC Database Current" : "DNC Scrub Stale",
      ok: scrubFresh,
      weight: 15,
      detail:
        age === null
          ? "No Scrub Run Recorded Yet."
          : `Last Scrub ${age} Day${age === 1 ? "" : "s"} Ago (Limit ${RESCRUB_DAYS}).`,
    },
    {
      label: "Suppression Lists Active",
      ok: input.suppressionTotal > 0,
      weight: 10,
      detail:
        input.suppressionTotal > 0
          ? `${input.suppressionTotal.toLocaleString()} Numbers Suppressed Across Every Campaign.`
          : "Import Your Existing Opt-Outs Before Your First Send.",
    },
  ];

  const score = Math.round(checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0));
  const label = score >= 90 ? "Healthy" : score >= 70 ? "Needs Attention" : "At Risk";
  const tone = score >= 90 ? "success" : score >= 70 ? "warn" : "danger";

  const registrationSteps = [
    {
      label: "Texting Brand",
      done: stageIndex >= 2,
      note: stageIndex >= 2 ? "Brand Approved" : stageIndex >= 1 ? "Submitted — In Review" : "Not Submitted",
    },
    {
      label: "Campaign",
      done: stageIndex >= 3,
      note: stageIndex >= 3 ? "Campaign Submitted" : "Waiting On Brand Approval",
    },
    {
      label: "Sample Review",
      done: stage === "live",
      note: stage === "live" ? "Samples Approved" : "Awaiting Carrier Approval",
    },
    {
      label: "Sending Live",
      done: stage === "live",
      note: stage === "live" ? "Sending Enabled" : "Locked Until Review Clears",
    },
  ];

  return {
    score,
    label,
    tone,
    stage,
    tenDlcLabel: stage === "live" ? "Registered" : stage === "not_started" ? "Not Started" : "In Review",
    tenDlcTone: stage === "live" ? "success" : stage === "not_started" ? "muted" : "warn",
    registrationSteps,
    registrationPct: Math.round(
      (registrationSteps.filter((s) => s.done).length / registrationSteps.length) * 100,
    ),
    checks,
    affecting: checks.filter((c) => !c.ok).map((c) => `${c.label}: ${c.detail}`),
  };
}

/** Removed = duplicates/invalid dropped before scrub. Keeps every audit row reconciling. */
export function removedCount(r: {
  total?: number | null;
  clean_count?: number | null;
  dnc_count?: number | null;
  litigator_count?: number | null;
}): number {
  const total = r.total ?? 0;
  return Math.max(0, total - (r.clean_count ?? 0) - (r.dnc_count ?? 0) - (r.litigator_count ?? 0));
}

/** A scrub run row's related job, used to label audit rows. */
export type JobRef = {
  name?: string | null;
  source_type?: string | null;
  params?: unknown;
};

const SOURCE_LABELS: Record<string, string> = {
  upload: "Uploaded List",
  business_search: "Business Search",
  public_records: "Public Records",
  assistant: "AI Assistant",
};

/**
 * Human label for a scrub audit row: the job's name when it has one, otherwise
 * a niche/geography label derived from its params, otherwise the source type.
 */
export function jobLabel(row: { jobs?: JobRef | null }): string {
  const job = row.jobs;
  if (!job) return "Scrub Run";
  if (job.name && job.name.trim()) return job.name.trim();
  const p = (job.params ?? {}) as Record<string, unknown>;
  const niche = typeof p["niche"] === "string" ? (p["niche"] as string) : "";
  const geo =
    typeof p["geography"] === "string"
      ? (p["geography"] as string)
      : typeof p["state"] === "string"
        ? (p["state"] as string)
        : "";
  const parts = [niche, geo].filter(Boolean);
  if (parts.length > 0) return parts.join(" – ");
  const src = job.source_type ?? "";
  return SOURCE_LABELS[src] ?? "Scrub Run";
}
