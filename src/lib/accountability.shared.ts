// ---------------------------------------------------------------------------
// Pure math for team accountability: cap evaluation, export watermarks and
// anomaly detection. No IO here so every rule is directly testable.
//
// Distinct from the compliance record on purpose: this log answers "who spent
// our credits and who moved our data", not "what did we send and who opted
// out". Merging them would ruin the compliance log's value as a clean,
// single-purpose legal record.
// ---------------------------------------------------------------------------

export type MemberLimits = {
  monthly_credit_cap: number | null;
  monthly_export_row_cap: number | null;
  approval_threshold_credits: number | null;
  export_approval_threshold_rows: number | null;
};

export const NO_LIMITS: MemberLimits = {
  monthly_credit_cap: null,
  monthly_export_row_cap: null,
  approval_threshold_credits: null,
  export_approval_threshold_rows: null,
};

export type SpendVerdict =
  | { outcome: "allow" }
  | { outcome: "needs_approval"; reason: string }
  | { outcome: "blocked"; reason: string };

/** Credits: cap blocks, threshold routes to an admin. */
export function evaluateSpend(input: {
  amount: number;
  usedThisMonth: number;
  limits: MemberLimits;
  enforced: boolean;
}): SpendVerdict {
  const { amount, usedThisMonth, limits, enforced } = input;
  if (!enforced || amount <= 0) return { outcome: "allow" };
  const cap = limits.monthly_credit_cap;
  if (cap != null && usedThisMonth + amount > cap) {
    const left = Math.max(0, cap - usedThisMonth);
    return {
      outcome: "blocked",
      reason: `This Would Use ${amount.toLocaleString()} Credits But Only ${left.toLocaleString()} Of Your ${cap.toLocaleString()} Monthly Credits Remain. Ask An Admin To Raise Your Cap.`,
    };
  }
  const threshold = limits.approval_threshold_credits;
  if (threshold != null && amount > threshold) {
    return {
      outcome: "needs_approval",
      reason: `Spends Above ${threshold.toLocaleString()} Credits Need Admin Approval.`,
    };
  }
  return { outcome: "allow" };
}

/** Exports: row-volume cap blocks, threshold routes to an admin. */
export function evaluateExport(input: {
  rowCount: number;
  rowsThisMonth: number;
  limits: MemberLimits;
  enforced: boolean;
}): SpendVerdict {
  const { rowCount, rowsThisMonth, limits, enforced } = input;
  if (!enforced || rowCount <= 0) return { outcome: "allow" };
  const cap = limits.monthly_export_row_cap;
  if (cap != null && rowsThisMonth + rowCount > cap) {
    const left = Math.max(0, cap - rowsThisMonth);
    return {
      outcome: "blocked",
      reason: `This Export Is ${rowCount.toLocaleString()} Rows But Only ${left.toLocaleString()} Of Your ${cap.toLocaleString()} Monthly Export Rows Remain.`,
    };
  }
  const threshold = limits.export_approval_threshold_rows;
  if (threshold != null && rowCount > threshold) {
    return {
      outcome: "needs_approval",
      reason: `Exports Above ${threshold.toLocaleString()} Rows Need Admin Approval.`,
    };
  }
  return { outcome: "allow" };
}

/** Traceable stamp carried by every generated file. */
export function exportWatermark(who: string, when: Date = new Date()): string {
  const stamp = when.toISOString().replace("T", " ").slice(0, 16);
  return `Exported By ${who} · ${stamp} UTC · LeadTrace`;
}

/** Filename suffix so a leaked file names its source without opening it. */
export function watermarkSuffix(who: string, when: Date = new Date()): string {
  const handle = who.split("@")[0]!.replace(/[^A-Za-z0-9._-]/g, "") || "member";
  return `${handle}-${when.toISOString().slice(0, 10)}`;
}

/** Footer row appended to exported rows so the stamp survives a copy-paste. */
export function watermarkRow(
  columns: string[],
  watermark: string,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  columns.forEach((c, i) => { row[c] = i === 0 ? watermark : ""; });
  return row;
}

export type Anomaly = { kind: "credit_spike" | "export_spike" | "off_hours"; summary: string };

/**
 * Compare a member against their OWN baseline, not the team's — a heavy user is
 * not suspicious, a sudden 4x is. Needs history before it will cry wolf.
 */
export function detectAnomalies(input: {
  creditsThisMonth: number;
  creditsBaseline: number;      // their average of prior months
  exportRowsThisMonth: number;
  exportRowsBaseline: number;
  monthsOfHistory: number;
  offHoursExportRows: number;   // rows exported 10pm–6am local
}): Anomaly[] {
  const out: Anomaly[] = [];
  const SPIKE = 4;
  if (input.monthsOfHistory >= 1) {
    if (input.creditsBaseline >= 50 && input.creditsThisMonth > input.creditsBaseline * SPIKE) {
      out.push({
        kind: "credit_spike",
        summary: `Credit Spend Is ${(input.creditsThisMonth / input.creditsBaseline).toFixed(1)}× Their Usual ${Math.round(input.creditsBaseline).toLocaleString()}/Month.`,
      });
    }
    if (input.exportRowsBaseline >= 100 && input.exportRowsThisMonth > input.exportRowsBaseline * SPIKE) {
      out.push({
        kind: "export_spike",
        summary: `Exported ${input.exportRowsThisMonth.toLocaleString()} Rows — ${(input.exportRowsThisMonth / input.exportRowsBaseline).toFixed(1)}× Their Usual Volume.`,
      });
    }
  }
  if (input.offHoursExportRows >= 5000) {
    out.push({
      kind: "off_hours",
      summary: `${input.offHoursExportRows.toLocaleString()} Rows Exported Between 10pm And 6am.`,
    });
  }
  return out;
}

export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
