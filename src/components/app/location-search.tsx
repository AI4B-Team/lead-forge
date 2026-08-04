import { useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { COUNTIES_BY_STATE, US_STATES, formatCounty, parseCounty } from "@/lib/us-geo";

/**
 * One combined location input for Street Scan. A market is described the way an
 * operator says it — "Hillsborough", "FL", "Tampa", "33610" — so we resolve the
 * typed text against states, counties and ZIPs and keep the result as chips.
 * Location is the primary filter, so this renders first in the builder.
 */
export type LocationValue = {
  states: string[];
  counties: string[];
  city: string | null;
  zips: string[];
};

type Suggestion =
  | { kind: "state"; label: string; code: string }
  | { kind: "county"; label: string; county: string; state: string }
  | { kind: "zip"; label: string; zip: string }
  | { kind: "city"; label: string; city: string };

const MAX_SUGGESTIONS = 8;

function suggest(query: string, value: LocationValue): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: Suggestion[] = [];

  if (/^\d{5}$/.test(q) && !value.zips.includes(q)) {
    out.push({ kind: "zip", label: `ZIP ${q}`, zip: q });
  }

  for (const s of US_STATES) {
    if (out.length >= MAX_SUGGESTIONS) break;
    if (s.name.toLowerCase().startsWith(q) || s.code.toLowerCase() === q) {
      if (!value.states.includes(s.code)) {
        out.push({ kind: "state", label: `${s.name} (Entire State)`, code: s.code });
      }
    }
  }

  for (const [state, counties] of Object.entries(COUNTIES_BY_STATE)) {
    for (const county of counties) {
      if (out.length >= MAX_SUGGESTIONS) break;
      if (!county.toLowerCase().startsWith(q)) continue;
      const label = formatCounty(county, state);
      if (value.counties.some((c) => c.toLowerCase() === label.toLowerCase())) continue;
      out.push({ kind: "county", label: `${label} County`, county, state });
    }
    if (out.length >= MAX_SUGGESTIONS) break;
  }

  if (!/^\d+$/.test(q) && out.length < MAX_SUGGESTIONS) {
    out.push({ kind: "city", label: `Use "${query.trim()}" As A City`, city: query.trim() });
  }
  return out.slice(0, MAX_SUGGESTIONS);
}

export function LocationSearch({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => suggest(query, value), [query, value]);

  const apply = (s: Suggestion) => {
    setQuery("");
    if (s.kind === "state") {
      onChange({ ...value, states: [...value.states, s.code] });
      return;
    }
    if (s.kind === "county") {
      const label = formatCounty(s.county, s.state);
      const states = value.states.includes(s.state) ? value.states : [...value.states, s.state];
      onChange({ ...value, states, counties: [...value.counties, label] });
      return;
    }
    if (s.kind === "zip") {
      onChange({ ...value, zips: [...value.zips, s.zip] });
      return;
    }
    onChange({ ...value, city: s.city });
  };

  const chips: Array<{ key: string; label: string; remove: () => void }> = [
    ...value.counties.map((c) => ({
      key: `c:${c}`,
      label: `${c} County`,
      remove: () => onChange({ ...value, counties: value.counties.filter((x) => x !== c) }),
    })),
    ...value.states
      // A state chip is only meaningful when no county inside it is selected.
      .filter((st) => !value.counties.some((c) => parseCounty(c).state === st))
      .map((st) => ({
        key: `s:${st}`,
        label: `${US_STATES.find((s) => s.code === st)?.name ?? st} (Entire State)`,
        remove: () => onChange({ ...value, states: value.states.filter((x) => x !== st) }),
      })),
    ...value.zips.map((z) => ({
      key: `z:${z}`,
      label: `ZIP ${z}`,
      remove: () => onChange({ ...value, zips: value.zips.filter((x) => x !== z) }),
    })),
    ...(value.city
      ? [{ key: "city", label: value.city, remove: () => onChange({ ...value, city: null }) }]
      : []),
  ];

  return (
    <div>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions[0]) {
              e.preventDefault();
              apply(suggestions[0]);
            }
          }}
          className="pl-9"
          placeholder="Search state, county, city, or ZIP"
          aria-label="Search state, county, city, or ZIP"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-sm">
          {suggestions.map((s) => (
            <button
              key={`${s.kind}:${s.label}`}
              type="button"
              onClick={() => apply(s)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="outline" className="gap-1 py-1 font-normal">
              {chip.label}
              <button type="button" onClick={chip.remove} aria-label={`Remove ${chip.label}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {chips.length === 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Start with where you buy. A county covers the whole county; add ZIPs to work a tighter
          farm area.
        </p>
      )}
    </div>
  );
}
