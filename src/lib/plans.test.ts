import { describe, expect, it } from "vitest";
import {
  annualMonthly,
  annualTotal,
  chargesPlatformFee,
  extraNumbersCost,
  overageCost,
  packPrice,
  planFor,
  PLANS,
} from "./plans.shared";

describe("plan catalog", () => {
  it("maps stored billing_plan values onto a tier", () => {
    expect(planFor("growth").id).toBe("growth");
    expect(planFor("GROWTH").id).toBe("growth");
    expect(planFor("trial").id).toBe("free");
    expect(planFor(null).id).toBe("free");
    expect(planFor("enterprise").id).toBe("scale");
  });

  it("waives the platform fee for comped and free workspaces", () => {
    expect(chargesPlatformFee("growth")).toBe(true);
    expect(chargesPlatformFee("comped")).toBe(false);
    expect(chargesPlatformFee("trial")).toBe(false);
  });

  it("discounts annual billing by 20%", () => {
    expect(annualMonthly(197)).toBe(158);
    expect(annualTotal(197)).toBe(1896);
  });

  it("prices top-ups per thousand units", () => {
    expect(packPrice("scrape", 5000)).toBe(100);
    expect(packPrice("sms", 10000)).toBe(110);
  });

  it("charges overage only beyond the monthly allowance", () => {
    expect(overageCost(PLANS.growth, 8000)).toBe(0);
    expect(overageCost(PLANS.growth, 9000)).toBe(18);
  });

  it("charges only for numbers beyond the included pool", () => {
    expect(extraNumbersCost(PLANS.starter, 5)).toBe(0);
    expect(extraNumbersCost(PLANS.starter, 7)).toBe(3);
  });
});
