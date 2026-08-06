import { describe, expect, it } from "vitest";
import { parseGeoIntent } from "./geo-intent";

describe("parseGeoIntent", () => {
  it("pins a named county instead of widening to the whole state", () => {
    const g = parseGeoIntent("pre-foreclosures in hillsborough county florida");
    expect(g.counties).toEqual(["Hillsborough, FL"]);
    expect(g.namedCounty).toBe(true);
    expect(g.stateOnly).toBe(false);
  });

  it("flags a state-only ask so we can ask which counties", () => {
    const g = parseGeoIntent("tax delinquent owners in Florida");
    expect(g.counties).toEqual([]);
    expect(g.states).toEqual(["FL"]);
    expect(g.stateOnly).toBe(true);
  });

  it("resolves an ambiguous county name using the state in the message", () => {
    expect(parseGeoIntent("hillsborough county nh").counties).toEqual(["Hillsborough, NH"]);
  });

  it("keeps several named counties", () => {
    const g = parseGeoIntent("code violations in cook and dupage counties, IL");
    expect(g.counties.slice().sort()).toEqual(["Cook, IL", "DuPage, IL"]);
  });

  // The expensive bug: "Miami-Dade" produced Miami-Dade FL + Dade GA + Miami IN,
  // tripling the priced run and blocking it on credits.
  it("scopes county matching to the state already in the spec", () => {
    const g = parseGeoIntent("code violations in Miami-Dade", { stateHint: "FL" });
    expect(g.counties).toEqual(["Miami-Dade, FL"]);
    expect(g.states).toEqual(["FL"]);
    expect(g.ambiguous).toEqual([]);
  });

  it("treats the spec state as a hard boundary before matching", () => {
    const g = parseGeoIntent("code violations in Miami-Dade, GA and Miami, IN", { stateHint: "FL" });
    expect(g.counties).toEqual(["Miami-Dade, FL"]);
    expect(g.states).toEqual(["FL"]);
  });

  it("never crosses a state boundary the operator did not name", () => {
    const g = parseGeoIntent("Miami-Dade county florida code violations");
    expect(g.counties).toEqual(["Miami-Dade, FL"]);
    expect(g.counties.some((c) => c.endsWith(", GA") || c.endsWith(", IN"))).toBe(false);
  });

  it("prefers an exact name over the fragments inside it", () => {
    const g = parseGeoIntent("miami-dade", { stateHint: "FL" });
    expect(g.counties).toEqual(["Miami-Dade, FL"]);
  });

  it("does not resolve a bare 'Miami' to Miami County IN when the state is FL", () => {
    const g = parseGeoIntent("code violations in Miami", { stateHint: "FL" });
    expect(g.counties.filter((c) => !c.endsWith(", FL"))).toEqual([]);
    // Either it resolves inside FL or it asks — it must never pick another state.
    expect(g.counties.length === 0 || g.counties.every((c) => c.endsWith(", FL"))).toBe(true);
  });

  it("asks instead of selecting several when a name matches multiple counties in scope", () => {
    const g = parseGeoIntent("springfield county");
    expect(g.counties.length).toBeLessThanOrEqual(1);
    if (g.counties.length === 0 && g.ambiguous.length) {
      expect(g.ambiguous[0]!.options.length).toBeGreaterThan(1);
    }
  });
});
