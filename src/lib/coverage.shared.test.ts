import { describe, expect, it } from "vitest";
import { isCovered } from "./coverage.shared";

const rows = [
  {
    fips: "12086",
    county_name: "Miami-Dade",
    state: "FL",
    record_type: "code_violation",
    status: "verified",
    verified_at: null,
    last_success_at: null,
    sample_row_count: 1,
  },
];

describe("per-county coverage", () => {
  it("maps the display label to the database record-type key", () => {
    expect(isCovered(rows, "Miami-Dade, FL", "Code Violation")).toBe(true);
  });

  it("does not let an uncovered county change a covered county's result", () => {
    const results = ["Miami-Dade, FL", "Clay, FL"].map((county) => ({
      county,
      covered: isCovered(rows, county, "Code Violation"),
    }));
    expect(results).toEqual([
      { county: "Miami-Dade, FL", covered: true },
      { county: "Clay, FL", covered: false },
    ]);
  });
});