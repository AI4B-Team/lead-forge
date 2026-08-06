const STATE_NAMES = new Set(US_STATES.map((s) => s.name.toLowerCase()));

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
  /**
   * Names that genuinely match more than one county inside the allowed scope.
   * These are NEVER auto-selected — the caller must ask which one.
   */
  ambiguous: Array<{ name: string; options: string[] }>;
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s,'.-]/g, " ").replace(/\s+/g, " ");
}

/**
 * Full state names (case-insensitive) and two-letter codes. Codes are matched
 * case-sensitively against the raw message, so the word "in" is not Indiana.
 */
function statesIn(text: string, raw: string): string[] {
  const out: string[] = [];
  for (const s of US_STATES) {
    const name = s.name.toLowerCase();
    if (
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text) ||
      new RegExp(`\\b${s.code}\\b`).test(raw) ||
      new RegExp(`\\b${s.code.toLowerCase()}\\b`).test(text.replace(/\bin\b/g, " "))
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
  const namedStates = statesIn(text, message);
  const hint = opts.stateHint?.toUpperCase() ?? null;

  // Scope FIRST. A state already in the spec (or named in this message) is a
  // hard boundary: "Miami-Dade" with state=FL may never also produce Dade
  // County GA and Miami County IN. Crossing a state the operator never named
  // tripled a 500-lead run into 1,500 and blocked it on credits.
  // An existing spec state is the hard boundary. It is applied before county
  // matching, so fragments cannot discover names in any other state.
  const scope = hint ? [hint] : namedStates.length > 0 ? namedStates : Object.keys(COUNTIES_BY_STATE);

  // Candidate (county, state) pairs whose county name appears in the text,
  // with the span of text they matched so a shorter name swallowed by a longer
  // one ("Dade" inside "Miami-Dade") can be discarded.
  const hits: Array<{ county: string; state: string; start: number; end: number }> = [];
  for (const state of scope) {
    const counties = COUNTIES_BY_STATE[state] ?? [];
    for (const county of counties) {
      const bare = county.toLowerCase();
      if (bare.length < 4) continue;
      const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // A county that shares its name with a state (Florida, PR) only counts
      // when the operator actually said "county" — otherwise "in Florida"
      // would silently target a Puerto Rican municipality.
      const re = STATE_NAMES.has(bare)
        ? new RegExp(`\\b${escaped}\\s+(county|parish|borough|municipio)\\b`)
        : new RegExp(`\\b${escaped}\\b`);
      const m = re.exec(text);
      if (m) hits.push({ county, state, start: m.index, end: m.index + bare.length });
    }
  }

  // An exact/longer name wins outright: never keep a fuzzy fragment alongside
  // the fuller name it sits inside.
  const kept = hits.filter(
    (h) => !hits.some((o) => o !== h && o.start <= h.start && o.end >= h.end && o.county.length > h.county.length),
  );

  const byCounty = new Map<string, Array<{ county: string; state: string }>>();
  for (const h of kept) {
    const key = h.county.toLowerCase();
    byCounty.set(key, [...(byCounty.get(key) ?? []), h]);
  }

  const counties: string[] = [];
  const ambiguous: Array<{ name: string; options: string[] }> = [];
  for (const options of byCounty.values()) {
    const inScope = options.filter((o) => scope.includes(o.state));
    const narrowed =
      inScope.filter((o) => namedStates.includes(o.state)).length > 0
        ? inScope.filter((o) => namedStates.includes(o.state))
        : inScope.filter((o) => o.state === hint).length > 0
          ? inScope.filter((o) => o.state === hint)
          : inScope;
    if (!narrowed.length) continue;
    // More than one candidate: never select several.
    if (narrowed.length > 1) {
      ambiguous.push({
        name: narrowed[0]!.county,
        options: narrowed.map((o) => formatCounty(o.county, o.state)),
      });
      // Inside a state the operator named, the only safe move is to ask.
      if (namedStates.length || hint) continue;
      // With no state context at all, stay deterministic and narrow: one
      // county, alphabetically first, and the caller still asks to confirm.
      const guess = [...narrowed].sort((a, b) => a.state.localeCompare(b.state))[0]!;
      const guessLabel = formatCounty(guess.county, guess.state);
      if (!counties.some((c) => c.toLowerCase() === guessLabel.toLowerCase())) counties.push(guessLabel);
      continue;
    }
    const pick = narrowed[0]!;
    const label = formatCounty(pick.county, pick.state);
    if (!counties.some((c) => c.toLowerCase() === label.toLowerCase())) counties.push(label);
  }

  const countyStates = [...new Set(counties.map((c) => c.split(",")[1]!.trim().toUpperCase()))];
  const states = hint ? [hint] : [...new Set([...countyStates, ...namedStates])];

  return {
    counties,
    states,
    namedCounty: counties.length > 0,
    stateOnly: counties.length === 0 && namedStates.length > 0,
    ambiguous,
  };
}
