import { describe, expect, it } from "vitest";
import { brandedFileName, brandedJobTitle } from "./download-name";

const job = "Roofer + HVAC – Hillsborough, FL – Aug 1";

describe("branded download names", () => {
  it("builds the canonical pattern", () => {
    expect(brandedFileName(job, "Clean")).toBe(
      "LeadTrace – Roofer + HVAC – Hillsborough, FL – Aug 1 – Clean.csv",
    );
  });
  it("sorts the four exports together", () => {
    const names = (["Clean", "DNC", "Litigators", "Scrub Audit"] as const).map((t) =>
      brandedFileName(job, t),
    );
    expect(names.every((n) => n.startsWith("LeadTrace – "))).toBe(true);
    expect([...names].sort()).toEqual(names.slice().sort());
  });
  it("sanitizes invalid characters and doubled spaces", () => {
    expect(brandedFileName('Bad/Name:  "X"?', "DNC")).toBe("LeadTrace – Bad-Name - X - – DNC.csv");
  });
  it("prefixes the display title only", () => {
    expect(brandedJobTitle(job)).toBe(`LeadTrace – ${job}`);
  });
});
