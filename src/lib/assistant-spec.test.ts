import { describe, expect, it } from "vitest";
import { EMPTY_SPEC, jobParamsFromSpec, patchSpec } from "./assistant.shared";
import { ctaBlockers } from "@/components/app/assistant-trace";

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

describe("patchSpec undefined safety", () => {
  it("never lets an undefined patch key clobber a boolean default", () => {
    const spec = { ...EMPTY_SPEC, sourceType: "records" as const };
    expect(spec.mobileOnly).toBe(true);
    const patched = patchSpec(spec, { mobileOnly: undefined, maxResults: 25 });
    expect(patched.mobileOnly).toBe(true);
    expect(patched.dedupe).toBe(true);
    expect(patched.skipTrace).toBe(true);
    expect(patched.maxResults).toBe(25);
  });

  it("still applies real values, including false", () => {
    expect(patchSpec(EMPTY_SPEC, { mobileOnly: false }).mobileOnly).toBe(false);
  });
});

describe("ctaBlockers", () => {
  const records = {
    ...EMPTY_SPEC, sourceType: "records" as const, recordType: "Code Violations",
    state: "IL", states: ["IL"], counties: ["Cook County, IL"], maxResults: 25,
  };

  it("is empty for a complete records spec", () => {
    expect(ctaBlockers(records)).toEqual([]);
  });

  it("names the missing record type", () => {
    expect(ctaBlockers({ ...records, recordType: null })).toContain("Add Record Type");
  });

  it("names missing counties", () => {
    expect(ctaBlockers({ ...records, state: null, states: [], counties: [] })).toContain("Select Counties");
  });

  it("names a cleared Max Leads", () => {
    expect(ctaBlockers({ ...records, maxResults: null })).toEqual(["Set Max Leads"]);
  });
});
