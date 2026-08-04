// ---------------------------------------------------------------------------
// Geographic intent parsing. The model is good at prose and bad at scope: it
// answered "hillsborough county" with `state: FL, counties: []`, which the
// builder renders as "All 67 Counties In FL" and prices accordingly.
//
// So scope is decided in code, not by the model: if the operator named a
// county, that county — and only that county — is the target.
// ---------------------------------------------------------------------------

import { COUNTIES_BY_STATE, US_STATES, formatCounty } from "./us-geo";

export type GeoIntent = {
  /** County labels ("Hillsborough, FL") the operator named explicitly. */
  counties: string[];
  /** Two-letter states the operator named (explicitly or via a county). */
  states: string[];
  /** True when a county name appeared — scope must never widen past it. */
  namedCounty: boolean;
  /** True when only a state appeared: ask which counties, never assume all. */
  stateOnly: boolean;
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s,'.-]/g, " ").replace(/\s+/g, " ");
}

/** Two-letter codes and full state names mentioned in the text. */
function statesIn(text: string): string[] {
  const out: string[] = [];
  for (const s of US_STATES) {
    const name = s.name.toLowerCase();
    if (
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text) ||
      new RegExp(`\\b${s.code.toLowerCase()}\\b`).test(text)
    ) {
      out.push(s.code);
    }
  }
  return [...new Set(out)];
}

/**
 * Parse the operator's own words. Ambiguous county names (Hillsborough is in
 * FL and NH) resolve to a state they also named, then to the hint, then to the
 * first state alphabetically — deterministic, and always narrower than "all".
 */
export function parseGeoIntent(
  message: string,
  opts: { stateHint?: string | null } = {},
): GeoIntent {
  const text = normalize(message);
  const namedStates = statesIn(text);
  const hint = opts.stateHint?.toUpperCase() ?? null;

  // Candidate (county, state) pairs whose county name appears in the text.
  const hits: Array<{ county: string; state: string }> = [];
  for (const [state, counties] of Object.entries(COUNTIES_BY_STATE)) {
    for (const county of counties) {
      const bare = county.toLowerCase();
      if (bare.length < 4) continue;
      const re = new RegExp(`\\b${bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(text)) hits.push({ county, state });
    }
  }

  const byCounty = new Map<string, Array<{ county: string; state: string }>>();
  for (const h of hits) {
    const key = h.county.toLowerCase();
    byCounty.set(key, [...(byCounty.get(key) ?? []), h]);
  }

  const counties: string[] = [];
  for (const options of byCounty.values()) {
    const pick =
      options.find((o) => namedStates.includes(o.state)) ??
      options.find((o) => o.state === hint) ??
      [...options].sort((a, b) => a.state.localeCompare(b.state))[0]!;
    const label = formatCounty(pick.county, pick.state);
    if (!counties.some((c) => c.toLowerCase() === label.toLowerCase())) counties.push(label);
  }

  const countyStates = [...new Set(counties.map((c) => c.split(",")[1]!.trim().toUpperCase()))];
  const states = [...new Set([...countyStates, ...namedStates])];

  return {
    counties,
    states,
    namedCounty: counties.length > 0,
    stateOnly: counties.length === 0 && namedStates.length > 0,
  };
}
