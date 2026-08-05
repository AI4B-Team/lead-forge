import { describe, expect, it } from "vitest";
import { getDncScrubber } from "@/lib/data-providers/dnc";
describe("H1 fail-closed", () => {
  it("throws when records are present and no credentials are set", async () => {
    delete process.env.DNC_API_URL; delete process.env.DNC_API_KEY;
    await expect(getDncScrubber().scrub(["+13125550100"])).rejects.toThrow(/not configured/);
  });
});
