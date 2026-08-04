import { describe, expect, it } from "vitest";
import { parseGeoIntent } from "./geo-intent";

describe("parseGeoIntent", () => {
  it("pins a named county instead of widening to the whole state", () => {
    const g = parseGeoIntent("pre-foreclosures in hillsborough county florida");
    expect(g.counties).toEqual(["Hillsborough County, FL"]);
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
    expect(parseGeoIntent("hillsborough county nh").counties).toEqual(["Hillsborough County, NH"]);
  });

  it("keeps several named counties", () => {
    const g = parseGeoIntent("code violations in cook and dupage counties, IL");
    expect(g.counties.slice().sort()).toEqual(["Cook County, IL", "DuPage County, IL"]);
  });
});
