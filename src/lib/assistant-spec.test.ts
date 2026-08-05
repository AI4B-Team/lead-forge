import { describe, expect, it } from "vitest";
import { EMPTY_SPEC, jobParamsFromSpec, patchSpec } from "./assistant.shared";

describe("panel edits patch the spec", () => {
  const spec = patchSpec(EMPTY_SPEC, {
    sourceType: "records",
    recordType: "Code Violation",
    states: ["IL"],
    state: "IL",
    counties: ["Cook, IL"],
    mobileOnly: true,
    dedupe: true,
    maxResults: 25,
  });

  it("keeps untouched fields when Max Leads changes", () => {
    const next = patchSpec(spec, { maxResults: 2 });
    expect(next.maxResults).toBe(2);
    expect(next.recordType).toBe("Code Violation");
    expect(next.mobileOnly).toBe(true);
    expect(next.dedupe).toBe(true);
    expect(next.counties).toEqual(["Cook, IL"]);
  });

  it("carries the record type into the job params the coverage gate reads", () => {
    const next = patchSpec(spec, { maxResults: 2 });
    const params = jobParamsFromSpec(next, { name: "Test", counties: next.counties });
    expect(params["record_type"]).toBe("Code Violation");
    expect(params["mobile_only"]).toBe(true);
    expect(params["dedupe"]).toBe(true);
    expect(params["max_results"]).toBe(2);
    expect(params["counties"]).toEqual(["Cook, IL"]);
  });
});
