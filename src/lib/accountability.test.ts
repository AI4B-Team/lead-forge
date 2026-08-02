import { describe, expect, it } from "vitest";
import {
  NO_LIMITS, detectAnomalies, evaluateExport, evaluateSpend, exportWatermark, watermarkRow,
} from "./accountability.shared";
import { can, hasTeamControls } from "./team-roles.shared";

describe("role gating", () => {
  it("never lets a viewer spend or export", () => {
    expect(can("viewer", "build_list")).toBe(false);
    expect(can("viewer", "export_list")).toBe(false);
  });
  it("keeps admin-only actions away from members", () => {
    expect(can("member", "export_list")).toBe(true);
    expect(can("member", "edit_suppression")).toBe(false);
    expect(can("member", "manage_limits")).toBe(false);
    expect(can("admin", "manage_limits")).toBe(true);
  });
});

describe("caps and thresholds", () => {
  const limits = { ...NO_LIMITS, monthly_credit_cap: 1000, approval_threshold_credits: 300 };

  it("blocks a spend that would exceed the monthly cap", () => {
    const v = evaluateSpend({ amount: 200, usedThisMonth: 900, limits, enforced: true });
    expect(v.outcome).toBe("blocked");
  });
  it("routes a large single spend to approval", () => {
    const v = evaluateSpend({ amount: 500, usedThisMonth: 0, limits, enforced: true });
    expect(v.outcome).toBe("needs_approval");
  });
  it("allows an ordinary spend", () => {
    expect(evaluateSpend({ amount: 50, usedThisMonth: 0, limits, enforced: true }).outcome).toBe("allow");
  });
  it("does not enforce caps off a team plan", () => {
    const v = evaluateSpend({ amount: 5000, usedThisMonth: 900, limits, enforced: false });
    expect(v.outcome).toBe("allow");
  });
  it("caps export volume the same way", () => {
    const l = { ...NO_LIMITS, monthly_export_row_cap: 10_000 };
    expect(evaluateExport({ rowCount: 5000, rowsThisMonth: 8000, limits: l, enforced: true }).outcome).toBe("blocked");
  });
});

describe("plan gating", () => {
  it("reserves caps for team plans", () => {
    expect(hasTeamControls("starter")).toBe(false);
    expect(hasTeamControls("business")).toBe(true);
  });
});

describe("watermarking", () => {
  it("stamps who and when into the file", () => {
    const mark = exportWatermark("sarah@acme.com", new Date("2026-08-02T15:04:00Z"));
    expect(mark).toContain("sarah@acme.com");
    const row = watermarkRow(["phone", "name"], mark);
    expect(row.phone).toBe(mark);
    expect(row.name).toBe("");
  });
});

describe("anomaly detection", () => {
  it("stays quiet without history", () => {
    expect(detectAnomalies({
      creditsThisMonth: 5000, creditsBaseline: 0,
      exportRowsThisMonth: 0, exportRowsBaseline: 0,
      monthsOfHistory: 0, offHoursExportRows: 0,
    })).toEqual([]);
  });
  it("flags a spike against the member's own baseline", () => {
    const flags = detectAnomalies({
      creditsThisMonth: 4000, creditsBaseline: 500,
      exportRowsThisMonth: 0, exportRowsBaseline: 0,
      monthsOfHistory: 3, offHoursExportRows: 0,
    });
    expect(flags.some((f) => f.kind === "credit_spike")).toBe(true);
  });
});
