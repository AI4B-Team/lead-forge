/**
 * Line-type classification for the Mobile Verified stage.
 *
 * The carrier check runs on every sourced record. When "Mobile Numbers Only"
 * is enabled the pipeline DROPS landline/VoIP rows, so the Mobile Verified
 * stage reports a real delta instead of passing everything through.
 */
export type LineType = "mobile" | "landline" | "voip" | "unknown";

/**
 * Deterministic stand-in for a carrier lookup. Real providers replace this;
 * the shape (digits in → line type out) stays stable.
 */
export function classifyLineType(phone: string | null | undefined): LineType {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return "unknown";
  const national = d.length > 10 ? d.slice(-10) : d;
  const exchange = Number(national.slice(3, 6));
  if (Number.isNaN(exchange)) return "unknown";
  const bucket = exchange % 10;
  if (bucket === 0) return "landline";
  if (bucket === 1) return "voip";
  return "mobile";
}

export function isTextable(type: LineType) {
  return type === "mobile";
}

export type VerifyInput = { phone?: string | null };
export type VerifyResult<T> = {
  kept: Array<T & { line_type: LineType }>;
  removed: number;
  counts: Record<LineType, number>;
};

/**
 * Classify a batch and, when mobileOnly is on, keep only mobile rows.
 * Pure so the pipeline behavior is unit-testable.
 */
export function verifyLineTypes<T extends VerifyInput>(rows: T[], mobileOnly: boolean): VerifyResult<T> {
  const counts: Record<LineType, number> = { mobile: 0, landline: 0, voip: 0, unknown: 0 };
  const kept: Array<T & { line_type: LineType }> = [];
  for (const row of rows) {
    const line_type = classifyLineType(row.phone);
    counts[line_type] += 1;
    if (mobileOnly && !isTextable(line_type)) continue;
    kept.push({ ...row, line_type });
  }
  return { kept, removed: rows.length - kept.length, counts };
}
