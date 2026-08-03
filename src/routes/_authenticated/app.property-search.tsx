// Property Search — nationwide lead discovery powered by the Realeflow
// Property Data API. Pick any US city/county/ZIP/address, filter by
// motivated-seller lead types, inspect owner/equity/comps, and save any
// property as a lead ("Property Search (saved)" list).

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2, Building2, UserPlus } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { realeflowAutocomplete, realeflowSearch } from "@/lib/realeflow.functions";
import { addPropertyLead } from "@/lib/property-search.functions";
import type { AutocompleteResult, SearchRequest, SearchResponse } from "@/lib/realeflow/types";
import {
  PropertyIntelDialog,
  fmtMoney,
  fmtNum,
  compAddress,
} from "@/components/app/property-intel-dialog";

export const Route = createFileRoute("/_authenticated/app/property-search")({
  head: () => ({ meta: [{ title: "Property Search — LeadTrace" }] }),
  component: PropertySearchPage,
});

const PAGE_SIZE = 25;

// Motivated-seller lead types (see Realeflow Enums doc). The API narrows
// this to the account's entitlements server-side.
const LEAD_TYPES = [
  { value: "PREFORECLOSURE", label: "Pre-Foreclosure" },
  { value: "LIENS", label: "Liens" },
  { value: "ABSENTEE_OWNER", label: "Absentee Owner" },
  { value: "HIGH_EQUITY", label: "High Equity" },
  { value: "FREE_AND_CLEAR", label: "Free & Clear" },
  { value: "VACANT", label: "Vacant" },
  { value: "SENIOR_OWNER", label: "Senior Owner" },
  { value: "UPSIDE_DOWN", label: "Upside Down" },
] as const;

type Anchor =
  | { kind: "geo"; label: string; lat: number; lng: number }
  | {
      kind: "place";
      label: string;
      place: { state?: string; city?: string; fips?: number; zip?: string };
    };

function anchorFromResult(r: AutocompleteResult): Anchor | null {
  switch (r.type) {
    case "address":
      return r.address.latitude != null && r.address.longitude != null
        ? { kind: "geo", label: r.text, lat: r.address.latitude, lng: r.address.longitude }
        : null;
    case "city":
      return { kind: "place", label: r.text, place: { city: r.city.city, state: r.city.state } };
    case "county":
      return { kind: "place", label: r.text, place: { fips: r.county.fips } };
    case "zip":
      return { kind: "place", label: r.text, place: { zip: r.zip.zip[0] } };
    case "state":
      return { kind: "place", label: r.text, place: { state: r.state.state } };
    default:
      return null;
  }
}

// Numeric coercion (API returns some numbers as strings).
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function str(v: unknown): string {
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

// Build the source_meta.realeflow blob for a saved lead — same shape the
// pipeline's skip-trace stage writes, so RealeflowIntel cards + CSV export
// work identically for search-sourced leads.
function buildRealeflowMeta(rec: Record<string, unknown>, hash: string) {
  return {
    provider: "realeflow-search",
    address_hash: hash,
    owner_name: str(rec.owner_std_name1_full) || null,
    mailing_street: str(rec.mailing_std_street) || null,
    mailing_city: str(rec.mailing_std_city) || null,
    mailing_state: str(rec.mailing_std_state) || null,
    mailing_zip: str(rec.mailing_std_zip) || null,
    property_value: num(rec.property_value),
    estimated_equity: num(rec.estimated_equity),
    estimated_mortgage_balance: num(rec.estimated_mortgage_balance),
    years_owned: num(rec.length_of_ownership),
    absentee_owner:
      !!str(rec.mailing_std_street) &&
      !!str(rec.address_street) &&
      str(rec.mailing_std_street).toUpperCase() !== compAddress(rec).toUpperCase(),
    traced_at: new Date().toISOString(),
  };
}

function PropertySearchPage() {
  const { workspaceId } = useWorkspaceId();
  const autocomplete = useServerFn(realeflowAutocomplete);
  const search = useServerFn(realeflowSearch);
  const saveLead = useServerFn(addPropertyLead);

  // ── location picker ──
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const term = q.trim();
    if (term.length < 3 || (anchor && term === anchor.label)) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await autocomplete({ data: { q: term } });
        setSuggestions(res.filter((r) => anchorFromResult(r) !== null).slice(0, 8));
        setSuggestOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ── filters ──
  const [leadTypes, setLeadTypes] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const toggleLeadType = (v: string) => {
    setLeadTypes((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
    setPage(1);
  };

  // ── search query ──
  const results = useQuery({
    queryKey: ["rf-search", anchor?.label, Array.from(leadTypes).sort().join(","), page],
    enabled: !!anchor,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const body: Omit<SearchRequest, "leadTypes"> & { leadTypes?: string[] } = {
        propertyMainCategory: "RESIDENTIAL",
        page,
        page_size: PAGE_SIZE,
      };
      if (anchor!.kind === "geo") {
        body.geolocation = { lat: anchor!.lat, lng: anchor!.lng };
        body.distance = 5;
      } else {
        body.places = [anchor!.place];
      }
      if (leadTypes.size > 0) body.leadTypes = Array.from(leadTypes);
      return (await search({ data: body })) as SearchResponse;
    },
  });

  const rows = results.data?.data ?? [];
  const total = results.data?.count ?? 0;
  // page × page_size may not exceed 10,000 (API limit)
  const totalPages = Math.min(
    Math.max(1, Math.ceil(total / PAGE_SIZE)),
    Math.floor(10_000 / PAGE_SIZE),
  );

  // ── detail dialog ──
  const [detail, setDetail] = useState<{ hash: string; title: string } | null>(null);

  // ── add-as-lead ──
  const [addingHash, setAddingHash] = useState<string | null>(null);
  const addAsLead = async (rec: Record<string, unknown>, hash: string) => {
    if (!workspaceId) return;
    setAddingHash(hash);
    try {
      const addr = compAddress(rec);
      const res = await saveLead({
        data: {
          workspaceId,
          hash,
          fullName: str(rec.owner_std_name1_full) || null,
          address: addr === "—" ? null : addr,
          city: str(rec.address_city) || null,
          state: str(rec.address_state) || null,
          zip: str(rec.address_zip) || null,
          realeflow: buildRealeflowMeta(rec, hash),
        },
      });
      if (res.duplicate) toast.info("This Property Is Already A Saved Lead");
      else toast.success(`Lead Saved: ${addr}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed To Save Lead");
    } finally {
      setAddingHash(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Property Search"
        description="Search 150M+ Properties Nationwide. Save Any Property As A Lead — Owner, Equity And Comps Included."
      />
      <div className="space-y-4">
        {/* Location picker */}
        <div className="relative max-w-xl">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input
            className="pl-9"
            placeholder="Search Any US City, County, ZIP Or Address…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
          />
          {suggestOpen && suggestions.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-md border bg-card shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const a = anchorFromResult(s);
                    if (!a) return;
                    setAnchor(a);
                    setQ(a.label);
                    setSuggestOpen(false);
                    setPage(1);
                  }}
                >
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14 shrink-0">
                    {s.type}
                  </span>
                  {s.text}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lead type filter chips */}
        <div className="flex flex-wrap gap-2">
          {LEAD_TYPES.map((t) => {
            const active = leadTypes.has(t.value);
            return (
              <button
                key={t.value}
                onClick={() => toggleLeadType(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        {!anchor ? (
          <div className="rounded-lg border bg-card py-20 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Pick A Location Above To Search 150M+ Properties Nationwide.</p>
            <p className="text-xs mt-1">Try "Tampa, FL", "Philadelphia", Or A ZIP Code.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {results.isLoading
                ? "Searching…"
                : results.isError
                  ? ""
                  : `${total.toLocaleString()} Propert${total === 1 ? "y" : "ies"} In ${anchor.label}`}
            </p>

            {results.isError && (
              <p className="text-sm text-destructive">
                {(results.error as Error)?.message || "Search failed"}
              </p>
            )}

            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Address</th>
                    <th className="text-left px-4 py-3">City</th>
                    <th className="text-left px-4 py-3">ZIP</th>
                    <th className="text-left px-4 py-3">Beds</th>
                    <th className="text-left px-4 py-3">Baths</th>
                    <th className="text-left px-4 py-3">Sq Ft</th>
                    <th className="text-left px-4 py-3">Year</th>
                    <th className="text-left px-4 py-3">Est. Value</th>
                    <th className="text-left px-4 py-3">Owner</th>
                    <th className="text-left px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-t">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="h-4 bg-muted/50 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                        No Properties Match These Filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((p, i) => {
                      const rec = p as Record<string, unknown>;
                      const hash = typeof rec.address_hash === "string" ? rec.address_hash : null;
                      const addr = compAddress(rec);
                      return (
                        <tr
                          key={hash ?? i}
                          className={`border-t hover:bg-accent/40 ${hash ? "cursor-pointer" : ""}`}
                          onClick={() =>
                            hash &&
                            setDetail({
                              hash,
                              title: `${addr}, ${str(rec.address_city)} ${str(rec.address_zip)}`,
                            })
                          }
                        >
                          <td className="px-4 py-3">
                            <span className="text-primary hover:underline flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {addr}
                            </span>
                          </td>
                          <td className="px-4 py-3">{str(rec.address_city) || "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs">{str(rec.address_zip) || "—"}</td>
                          <td className="px-4 py-3">{fmtNum(rec.bedrooms)}</td>
                          <td className="px-4 py-3">{fmtNum(rec.bath_total_calc)}</td>
                          <td className="px-4 py-3">{fmtNum(rec.building_area)}</td>
                          <td className="px-4 py-3">{fmtNum(rec.year_built)}</td>
                          <td className="px-4 py-3 font-medium">{fmtMoney(rec.property_value)}</td>
                          <td className="px-4 py-3 max-w-[180px] truncate">
                            {str(rec.owner_std_name1_full) || "—"}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {hash && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={addingHash === hash || !workspaceId}
                                onClick={() => addAsLead(rec, hash)}
                                title="Save This Property As A Lead (Owner, Equity & Value Stacked)"
                              >
                                {addingHash === hash ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                                    Lead
                                  </>
                                )}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground flex items-center gap-2">
                {results.isFetching && !results.isLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Page {page} Of {totalPages.toLocaleString()}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <PropertyIntelDialog
        hash={detail?.hash ?? null}
        title={detail?.title}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
      />
    </div>
  );
}
