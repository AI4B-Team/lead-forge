import { describe, expect, it } from "vitest";
import { jobSpecSchema, patchSpec, EMPTY_SPEC } from "./assistant.shared";
import { canonicalRecordType, RECORD_TYPE_OPTIONS } from "./record-types";

// The List Assembled card and the List Builder panel must render the SAME spec
// value. The panel's Record Type <Select> keys off the option label, so a spec
// holding "code_violation" rendered an empty control while the card showed the
// value — two controls, one spec, two answers.
const LABELS = RECORD_TYPE_OPTIONS.map((r) => r.label);

/** What the panel's Select can actually display for a spec. */
function panelRecordTypeValue(recordType: string | null): string {
  return canonicalRecordType(recordType) ?? "";
}

describe("spec/panel parity — record type", () => {
  const writerForms = [
    "code_violation",
    "Code Violation",
    "code violations",
    "CODE_VIOLATION",
    "probate",
    "pre_foreclosure",
    "lis pendens",
    "tax_default",
    "evictions",
    "vacancy",
  ];

  for (const raw of writerForms) {
    it(`"${raw}" reaches the panel control as a selectable option`, () => {
      const spec = jobSpecSchema.parse({ sourceType: "records", recordType: raw });
      // The card reads spec.recordType directly.
      expect(LABELS).toContain(spec.recordType);
      // The panel control must render that exact same value.
      expect(panelRecordTypeValue(spec.recordType)).toBe(spec.recordType);
      expect(panelRecordTypeValue(spec.recordType)).not.toBe("");
    });
  }

  it("canonicalises a panel patch the same way as a model patch", () => {
    const fromPanel = patchSpec(EMPTY_SPEC, { recordType: "code_violation" });
    expect(fromPanel.recordType).toBe("Code Violation");
    expect(LABELS).toContain(fromPanel.recordType);
  });

  it("leaves an unknown record type visible rather than silently blanking it", () => {
    const spec = jobSpecSchema.parse({ recordType: "Building Permits" });
    expect(spec.recordType).toBe("Building Permits");
  });
});
