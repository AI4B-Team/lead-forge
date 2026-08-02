import { describe, expect, it } from "vitest";
import { SMS_RATE_PER_SEGMENT, estimateSegments, launchEstimate } from "./launch-estimate";

const chars = (n: number) => "a".repeat(n);

describe("segment estimation", () => {
  it("handles GSM-7 boundaries", () => {
    expect(estimateSegments(chars(160))).toBe(1);
    expect(estimateSegments(chars(161))).toBe(2);
    expect(estimateSegments(chars(306))).toBe(2);
    expect(estimateSegments(chars(307))).toBe(3);
    expect(estimateSegments("")).toBe(1);
  });
});

describe("launch estimate", () => {
  it("assumes one segment per message with no templates", () => {
    const e = launchEstimate(8);
    expect(e.assumed).toBe(true);
    expect(e.messages).toBe(32);
    expect(e.segments).toBe(32);
    expect(e.cost).toBeCloseTo(32 * SMS_RATE_PER_SEGMENT);
  });

  it("bills real segment counts when templates exist", () => {
    const e = launchEstimate(8, { templates: [chars(200), chars(100)] });
    expect(e.assumed).toBe(false);
    expect(e.steps).toBe(2);
    expect(e.messages).toBe(16);
    expect(e.segments).toBe(8 * (2 + 1));
    expect(e.cost).toBeCloseTo(24 * SMS_RATE_PER_SEGMENT);
  });
});
