import { describe, expect, it } from "vitest";
import { EMPTY_SPEC, withStates, type JobSpec } from "./assistant.shared";
import { nextQuestion, speakTurn, stickyCounties } from "./assistant-dialogue";

const records = (over: Partial<JobSpec> = {}): JobSpec => ({
  ...EMPTY_SPEC,
  sourceType: "records",
  ...over,
});

describe("assistant dialogue", () => {
  it("keeps a county named in the first message through later turns", () => {
    const acc = stickyCounties(["pre-foreclosures in hillsborough county", "pre-foreclosure"]);
    expect(acc.counties).toEqual(["Hillsborough, FL"]);
    expect(acc.namedCounty).toBe(true);
  });

  it("does not widen a named county to the whole state", () => {
    const acc = stickyCounties(["hillsborough county"]);
    expect(acc.counties).toHaveLength(1);
  });

  it("asks for counties instead of assuming all of them", () => {
    const spec = withStates(records({ recordType: "Tax Default / Delinquency" }), ["FL"]);
    expect(nextQuestion(spec)).toMatch(/Which counties in FL/);
  });

  it("echoes what it captured and names what it inferred", () => {
    const spec = withStates(
      records({ recordType: "Pre-Foreclosure", counties: ["Hillsborough, FL"], recencyDays: 90 }),
      ["FL"],
    );
    const out = speakTurn({
      modelReply: "",
      spec,
      priorSpec: EMPTY_SPEC,
      userTexts: ["pre-foreclosures in hillsborough county"],
    });
    expect(out.reply).toMatch(/Hillsborough County, FL/);
    expect(out.reply).toMatch(/last 90 days/);
    expect(out.reply).toMatch(/didn't specify/);
    expect(out.complete).toBe(true);
  });

  it("always says something, and asks the next question when incomplete", () => {
    const out = speakTurn({
      modelReply: "",
      spec: withStates(records(), ["FL"]),
      priorSpec: EMPTY_SPEC,
      userTexts: ["florida"],
    });
    expect(out.reply.trim().length).toBeGreaterThan(0);
    expect(out.question).toMatch(/record type/i);
    expect(out.complete).toBe(false);
  });

  it("acknowledges a hand edit in the panel", () => {
    const out = speakTurn({
      modelReply: "",
      spec: withStates(records({ recordType: "Probate", counties: ["Cook, IL"] }), ["IL"]),
      priorSpec: EMPTY_SPEC,
      userTexts: ["probate in cook county"],
      panelEdits: ["Counties"],
    });
    expect(out.reply).toMatch(/I see you changed Counties/);
  });
});

describe("pruneUnbackedFallbacks", () => {
  const covered = ["Cook, IL — Code Violation"];
  it("drops a fallback market we cannot actually run", () => {
    const out = pruneUnbackedFallbacks(
      "Hillsborough isn't covered. Would you like to search in a nearby covered market, such as any of the Florida counties?",
      covered,
    );
    expect(out.removed).toBe(true);
    expect(out.reply).not.toMatch(/Florida/);
  });
  it("keeps a fallback that names a verified market", () => {
    const out = pruneUnbackedFallbacks("Want me to run the nearest covered market, Cook County IL, instead?", covered);
    expect(out.removed).toBe(false);
    expect(out.reply).toMatch(/Cook/);
  });
});
