// ---------------------------------------------------------------------------
// Property Scan (marketed as "AI Driving for Dollars").
//
// Five stages, in this order, and the order is the whole point:
//   1. parcel set   — pull candidate parcels for the area (cheap, bulk)
//   2. data filter  — the buy box runs BEFORE any imagery is fetched
//   3. imagery      — score only the survivors
//   4. decay check  — validate the score against events since capture
//   5. enrich/trace — the pipeline we already own
//
// Filtering first is what makes bundling the scan affordable: 500k parcels cut
// to 15k turns a $7,000 job into $210, and the leads are better as well.
// ---------------------------------------------------------------------------

import { z } from "zod";

export type ScanMode = "area" | "list" | "monitor";

export const SCAN_MODES: Array<{
  id: ScanMode;
  title: string;
  blurb: string;
  /** Monitor is the only tier-gated mode — it re-scans, so it carries ongoing cost. */
  minTier?: ScanTier;
}> = [
  { id: "area", title: "Area Scan", blurb: "Name the ZIPs, cities, or counties you work. We pull the parcels, apply your buy box, and score what survives." },
  { id: "list", title: "List Scan", blurb: "Score a list you already built, or a CSV you already own. Every row comes back with condition detail and reasoning." },
  { id: "monitor", title: "Monitor", blurb: "Re-score a saved list on a schedule and get told when a house gets worse — a tarp appears, a yard goes to overgrowth.", minTier: "growth" },
];

// ---------------------------------------------------------------------------
// Verticals. Same scan, different ranking — switching re-ranks, never re-scans.
// ---------------------------------------------------------------------------

export type ScanVertical =
  | "investor" | "roofing" | "paint_siding" | "landscaping"
  | "fencing" | "pool" | "solar" | "insurance";

export const SCAN_VERTICALS: Array<{
  id: ScanVertical;
  label: string;
  signal: string;
  note: string;
  /** Insurance is gated: different buyer, adverse-action compliance overhead. */
  premium?: boolean;
}> = [
  { id: "investor", label: "Investors", signal: "distress + equity + absentee", note: "Deferred maintenance on a long-held, free-and-clear house." },
  { id: "roofing", label: "Roofers", signal: "tarp + roof + no recent permit", note: "Owner-occupied with a failing roof and nobody's fixed it yet." },
  { id: "paint_siding", label: "Painters & Siding", signal: "paint failure + wall condition", note: "Chalking, peeling, and rot on houses held seven years or more." },
  { id: "landscaping", label: "Landscapers", signal: "overgrowth + tree contact", note: "Vegetation touching the structure. Owner-occupied only." },
  { id: "fencing", label: "Fencing", signal: "fence condition + pool present", note: "Collapsed or missing fencing where code requires enclosure." },
  { id: "pool", label: "Pool Service", signal: "pool condition score", note: "Green and neglected pools, visible from above." },
  { id: "solar", label: "Solar", signal: "roof condition good + no shade", note: "The inverse filter. A sound roof with no existing array." },
  { id: "insurance", label: "Insurance", signal: "roof + tarp + debris", note: "Inspection prioritisation across a book of business.", premium: true },
];

/** Which condition elements a vertical ranks on. Powers instant re-ranking. */
export const VERTICAL_WEIGHTS: Record<ScanVertical, string[]> = {
  investor: ["roof", "exterior_paint", "lawn_vegetation", "vacancy_indicators"],
  roofing: ["roof", "gutters"],
  paint_siding: ["exterior_paint", "exterior_walls"],
  landscaping: ["lawn_vegetation", "landscaping", "trees_large_plants"],
  fencing: ["fencing"],
  pool: ["pool_condition"],
  solar: ["roof"],
  insurance: ["roof", "exterior_walls", "vacancy_indicators"],
};

// ---------------------------------------------------------------------------
// Scoring output. 0–10 where 10 = worst. 0 means "not visible"; null means
// "not assessed" — an unscorable element is never quietly scored 0.
// ---------------------------------------------------------------------------

export const CONDITION_ELEMENTS: Array<{ group: string; key: string; label: string }> = [
  { group: "Structure", key: "roof", label: "Roof" },
  { group: "Structure", key: "exterior_walls", label: "Exterior Walls" },
  { group: "Structure", key: "exterior_paint", label: "Exterior Paint" },
  { group: "Structure", key: "windows_doors", label: "Windows & Doors" },
  { group: "Structure", key: "gutters", label: "Gutters" },
  { group: "Grounds", key: "lawn_vegetation", label: "Lawn & Vegetation" },
  { group: "Grounds", key: "landscaping", label: "Landscaping" },
  { group: "Grounds", key: "trees_large_plants", label: "Trees & Large Plants" },
  { group: "Grounds", key: "fencing", label: "Fencing" },
  { group: "Hardscape", key: "driveway_walkway", label: "Driveway & Walkway" },
  { group: "Hardscape", key: "porch_deck_patio", label: "Porch, Deck & Patio" },
  { group: "Hardscape", key: "stairs_railing", label: "Stairs & Railing" },
  { group: "Hardscape", key: "garage", label: "Garage" },
  { group: "Systems", key: "hvac_condenser", label: "HVAC Condenser" },
  { group: "Signals", key: "vacancy_indicators", label: "Vacancy Indicators" },
  { group: "Signals", key: "apparent_age", label: "Apparent Age" },
];

/** Boolean detections, each mapping to a specific buyer. */
export const BOOLEAN_DETECTIONS: Array<{
  key: string;
  label: string;
  buyer: string;
  /** Negative detections disqualify the lead instead of raising its score. */
  negative?: boolean;
}> = [
  { key: "tarp_present", label: "Tarp Present", buyer: "Roofing, insurance — the highest-intent signal that exists." },
  { key: "boarded_openings", label: "Boarded Openings", buyer: "Investors, code enforcement." },
  { key: "junk_vehicles", label: "Junk Vehicles", buyer: "Investor distress." },
  { key: "overgrowth_to_structure", label: "Overgrowth To Structure", buyer: "Vacancy proxy." },
  { key: "security_bars", label: "Security Bars", buyer: "Owner-profile signal." },
  { key: "accessibility_ramp", label: "Accessibility Ramp", buyer: "Aging-in-place, probate precursor." },
  { key: "solar_present", label: "Solar Present", buyer: "Solar excludes it, roofing prices around it." },
  { key: "pool_present", label: "Pool Present", buyer: "Pool service, insurance." },
  { key: "pool_condition", label: "Pool Condition", buyer: "A green pool is a strong vacancy proxy." },
  { key: "active_construction", label: "Active Construction", buyer: "Not a lead. Refunded, never scored.", negative: true },
  { key: "for_sale_sign", label: "For Sale Sign", buyer: "Already listed.", negative: true },
  { key: "dumpster_present", label: "Dumpster Present", buyer: "Rehab already underway.", negative: true },
];

/** Composite bands shown in the UI. */
export function distressBand(score: number): { label: string; tone: "high" | "mid" | "low" } {
  if (score >= 80) return { label: "Highly Distressed", tone: "high" };
  if (score >= 60) return { label: "Moderately Distressed", tone: "mid" };
  return { label: "Lower Priority", tone: "low" };
}

/** Elements below this confidence are excluded from the composite, not scored 0. */
export const MIN_ELEMENT_CONFIDENCE = 0.6;

/** Every refusal code is an automatic refund. */
export const REFUSAL_CODES: Array<{ code: string; label: string; explain: string }> = [
  { code: "no_image", label: "No Imagery", explain: "The provider has no imagery for this address." },
  { code: "not_visible", label: "View Blocked", explain: "A tree, fence, or parked vehicle obscured the property." },
  { code: "insufficient_imagery", label: "Insufficient Imagery", explain: "Too few elements were assessable to score honestly." },
  { code: "under_construction", label: "Mid-Renovation", explain: "Actively being rehabbed — not a lead, so you are not charged." },
  { code: "address_not_found", label: "Address Not Found", explain: "The address did not resolve to a parcel." },
  { code: "out_of_scope", label: "Out Of Scope", explain: "Commercial, vacant land, or 5+ units." },
];

// ---------------------------------------------------------------------------
// Evidence decay: validate the score against what has happened since capture.
// A "boarded windows" call from 2019 imagery is worthless if the house was
// re-roofed in 2023 — and shipping those two leads identically is exactly what
// every competitor does.
// ---------------------------------------------------------------------------

export const DECAY_SIGNALS: Array<{ signal: string; effect: number; source: string }> = [
  { signal: "Sold after image date", effect: -40, source: "Assessor / deed" },
  { signal: "Building permit after image date", effect: -50, source: "County permits" },
  { signal: "Same-trade permit after image date", effect: -80, source: "County permits" },
  { signal: "Assessed improvement value jumped", effect: -30, source: "Tax roll" },
  { signal: "Listed or recently listed", effect: -40, source: "MLS" },
  { signal: "No permits ever, pre-1970 build", effect: 20, source: "County permits" },
  { signal: "Open code violation after image date", effect: 40, source: "County" },
  { signal: "Tax delinquency after image date", effect: 25, source: "County" },
  { signal: "Probate or owner deceased since", effect: 30, source: "County" },
];

/** Freshness SLA. No lead ships on imagery older than this unless opted into. */
export const MAX_IMAGERY_AGE_MONTHS = 18;

export function freshness(captureDate: string | Date): { label: string; tone: "fresh" | "aging" | "stale" } {
  const months = (Date.now() - new Date(captureDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= 12) return { label: "Fresh", tone: "fresh" };
  if (months <= MAX_IMAGERY_AGE_MONTHS) return { label: "Aging", tone: "aging" };
  return { label: "Stale", tone: "stale" };
}

// ---------------------------------------------------------------------------
// The buy box. The left panel is free and it is the cost control.
// ---------------------------------------------------------------------------

export const buyBoxSchema = z.object({
  ownership: z.array(z.enum(["absentee", "owner_occupied", "entity", "trust"])).default(["absentee"]),
  /** Street imagery is 1–4 years old, so 7+ years owned keeps the owner in the picture. */
  yearsOwnedMin: z.number().int().min(0).max(60).default(7),
  equityMin: z.number().int().min(0).max(100).default(40),
  valueMin: z.number().int().min(0).max(5_000_000).nullable().default(null),
  valueMax: z.number().int().min(0).max(5_000_000).nullable().default(null),
  propertyTypes: z.array(z.enum(["sfr", "multi_2_4", "condo", "mobile"])).default(["sfr"]),
  yearBuiltMin: z.number().int().min(1800).max(2030).default(1900),
  yearBuiltMax: z.number().int().min(1800).max(2030).default(1990),
  distressSignals: z
    .array(z.enum(["tax_delinquent", "pre_foreclosure", "probate", "code_violation", "lien", "vacant_usps", "out_of_state_owner"]))
    .default([]),
  /** Our differentiator: a roof permit after the image date invalidates a roof score. */
  excludePermitYears: z.number().int().min(0).max(20).default(5),
  excludeActiveListings: z.boolean().default(false),
  excludeSoldLast24mo: z.boolean().default(false),
});

export type BuyBox = z.infer<typeof buyBoxSchema>;
export const DEFAULT_BUY_BOX: BuyBox = buyBoxSchema.parse({});

export const OWNERSHIP_LABELS: Record<BuyBox["ownership"][number], string> = {
  absentee: "Absentee",
  owner_occupied: "Owner-Occupied",
  entity: "LLC / Entity",
  trust: "Trust",
};

export const PROPERTY_TYPE_LABELS: Record<BuyBox["propertyTypes"][number], string> = {
  sfr: "Single Family",
  multi_2_4: "2–4 Unit",
  condo: "Condo",
  mobile: "Mobile",
};

export const DISTRESS_SIGNAL_LABELS: Record<BuyBox["distressSignals"][number], string> = {
  tax_delinquent: "Tax Delinquent",
  pre_foreclosure: "Pre-Foreclosure",
  probate: "Probate",
  code_violation: "Code Violation",
  lien: "Lien",
  vacant_usps: "Vacant (USPS)",
  out_of_state_owner: "Out-Of-State Owner",
};

// ---------------------------------------------------------------------------
// Visual criteria: prompt-first, not a wall of sliders.
// ---------------------------------------------------------------------------

export const SCAN_PRESETS: Array<{ id: string; label: string; blurb: string; prompt: string }> = [
  { id: "tarped", label: "Tarped Roofs", blurb: "Blue tarp or exposed decking. The strongest signal in the dataset.", prompt: "Houses with tarped roofs or exposed decking" },
  { id: "boarded", label: "Boarded & Vacant", blurb: "Plywood over openings, no vehicle, mail accumulation.", prompt: "Boarded openings, no vehicle present, signs of vacancy" },
  { id: "overgrown", label: "Overgrown & Absentee", blurb: "Vegetation touching the structure, owner out of state.", prompt: "Overgrown yards with vegetation touching the structure" },
  { id: "junk", label: "Junk & Debris", blurb: "Inoperable vehicles, accumulated debris, open code cases.", prompt: "Inoperable vehicles and accumulated debris in the yard" },
  { id: "peeling", label: "Peeling & Weathered", blurb: "Paint failure and siding rot on long-held houses.", prompt: "Failed exterior paint and rotting siding" },
  { id: "storm", label: "Storm Damage", blurb: "Post-event scanning across an affected footprint.", prompt: "Storm damage — missing shingles, tarps, downed trees, debris" },
  { id: "free-clear", label: "Free & Clear Neglect", blurb: "100% equity, 15+ years owned, visible deferred maintenance.", prompt: "Visibly neglected houses held a long time with no mortgage" },
  { id: "zombie", label: "Zombie Properties", blurb: "Foreclosure filed, occupant gone, nobody maintaining it.", prompt: "Abandoned properties in foreclosure with nobody maintaining them" },
];

export const DEFAULT_MATCH_THRESHOLD = 75;

// ---------------------------------------------------------------------------
// Credits. Charged on qualified results, not parcels pulled: the data filter
// runs free, so a narrower buy box is cheaper for the operator and for us.
// ---------------------------------------------------------------------------

/** Roughly $0.014–0.032 of imagery per property, expressed in credits. */
export const CREDITS_PER_IMAGE = 0.0667;

export function scanCreditQuote(parcelsToScan: number, imagesPer: 1 | 3): number {
  return Math.round(parcelsToScan * imagesPer * CREDITS_PER_IMAGE);
}

/**
 * Honest funnel preview for the buy-box panel. Real parcel counts arrive from
 * the parcel provider; until then the ratios come from the filters themselves
 * so the counter still moves in the right direction as the operator narrows.
 */
export function previewFunnel(parcelsInArea: number, box: BuyBox) {
  const ownership = box.ownership.length ? Math.min(1, 0.22 * box.ownership.length) : 1;
  const tenure = Math.max(0.25, 1 - box.yearsOwnedMin * 0.045);
  const equity = Math.max(0.3, 1 - box.equityMin / 180);
  const age = box.yearBuiltMax >= 2030 ? 1 : 0.62;
  const signals = box.distressSignals.length ? Math.max(0.12, 0.4 - box.distressSignals.length * 0.04) : 1;
  const permits = box.excludePermitYears > 0 ? 0.88 : 1;
  const negative = (box.excludeActiveListings ? 0.97 : 1) * (box.excludeSoldLast24mo ? 0.94 : 1);

  const afterOwnership = Math.round(parcelsInArea * ownership * tenure);
  const afterFinancial = Math.round(afterOwnership * equity * age);
  const afterFilters = Math.round(afterFinancial * signals * permits * negative);
  return {
    parcelsInArea,
    afterOwnership,
    afterFinancial,
    scanned: Math.max(0, afterFilters),
  };
}

/** Rough parcel count for an area, so the funnel has something to open with. */
export const PARCELS_PER_ZIP = 18_420;
export const PARCELS_PER_COUNTY = 214_000;

/**
 * Share of scored properties expected to clear the match threshold. A stricter
 * threshold matches fewer houses, which is the whole point of the control.
 */
export function matchRate(threshold: number): number {
  return Math.max(0.04, Math.min(0.6, (100 - threshold) / 100));
}

/** Property owners usually publish no phone, so nearly every match gets traced. */
export const SCAN_SKIP_TRACE_GAP_RATE = 0.8;

export type ScanEstimate = {
  parcelsInArea: number;
  afterOwnership: number;
  afterFinancial: number;
  scanned: number;
  matched: number;
  /** Imagery credits, charged only on parcels that actually get scored. */
  scanCredits: number;
  skipTraceCredits: number;
};

/**
 * One estimator for the whole Property Scan flow, quoted from the same buy box
 * the rail edits. Charged on scored parcels, so narrowing the box is cheaper.
 */
export function estimateScan(input: {
  counties: string[];
  states: string[];
  buyBox: BuyBox | null;
  matchThreshold: number | null;
  imagesPer: 1 | 3;
  /** Cap on how many matched properties the run may return. */
  maxResults: number | null;
}): ScanEstimate {
  const box = input.buyBox ?? DEFAULT_BUY_BOX;
  const areas = input.counties.length || input.states.length || 1;
  const funnel = previewFunnel(areas * PARCELS_PER_COUNTY, box);
  const rate = matchRate(input.matchThreshold ?? DEFAULT_MATCH_THRESHOLD);
  const cap = input.maxResults && input.maxResults > 0 ? input.maxResults : null;
  const matched = Math.min(Math.round(funnel.scanned * rate), cap ?? Number.MAX_SAFE_INTEGER);
  return {
    ...funnel,
    matched,
    scanCredits: scanCreditQuote(funnel.scanned, input.imagesPer),
    skipTraceCredits: Math.round(matched * SCAN_SKIP_TRACE_GAP_RATE),
  };
}

// ---------------------------------------------------------------------------
// Tiers. Property Scan is available on every paid tier — tiers limit volume,
// not access. A padlock reads as "they're holding out", which churns; an empty
// credit pool reads as "I've outgrown my plan", which converts.
// ---------------------------------------------------------------------------

export type ScanTier = "starter" | "growth" | "pro";

export const SCAN_TIERS: Record<ScanTier, {
  label: string;
  creditsPerMonth: number;
  maxParcelsPerJob: number;
  concurrentJobs: number;
  monitor: boolean;
  exampleMatching: boolean;
  savedBuyBoxes: number | "unlimited";
}> = {
  starter: { label: "Starter", creditsPerMonth: 3_000, maxParcelsPerJob: 5_000, concurrentJobs: 1, monitor: false, exampleMatching: false, savedBuyBoxes: 1 },
  growth: { label: "Growth", creditsPerMonth: 12_000, maxParcelsPerJob: 50_000, concurrentJobs: 5, monitor: true, exampleMatching: true, savedBuyBoxes: 10 },
  pro: { label: "Pro", creditsPerMonth: 40_000, maxParcelsPerJob: 200_000, concurrentJobs: 10, monitor: true, exampleMatching: true, savedBuyBoxes: "unlimited" },
};

export const TIER_RANK: Record<ScanTier, number> = { starter: 0, growth: 1, pro: 2 };

export function modeAvailable(mode: ScanMode, tier: ScanTier): boolean {
  const min = SCAN_MODES.find((m) => m.id === mode)?.minTier;
  return !min || TIER_RANK[tier] >= TIER_RANK[min];
}

// ---------------------------------------------------------------------------
// Job progress, relabelled for the scan pipeline.
// ---------------------------------------------------------------------------

export const SCAN_STAGES = [
  { key: "parcels", label: "Pulling Parcels" },
  { key: "filter", label: "Applying Buy Box" },
  { key: "score", label: "Scoring Properties" },
  { key: "decay", label: "Checking Recency" },
  { key: "match", label: "Matching" },
] as const;

/** A plain maps.google.com link is always safe to export, and nobody else ships one. */
export function streetViewLink(lat: number, lng: number, heading?: number | null): string {
  const h = heading ?? 0;
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&heading=${h}`;
}

export const scanJobInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().max(120).nullable().default(null),
  mode: z.enum(["area", "list", "monitor"]).default("area"),
  vertical: z.string().max(40).default("investor"),
  prompt: z.string().max(600).nullable().default(null),
  matchThreshold: z.number().int().min(50).max(100).default(DEFAULT_MATCH_THRESHOLD),
  imagesPer: z.union([z.literal(1), z.literal(3)]).default(3),
  buyBox: buyBoxSchema,
  areas: z.array(z.string().max(80)).max(50).default([]),
  sourceListId: z.string().uuid().nullable().default(null),
  examples: z.array(z.string().max(160)).max(3).default([]),
  parcelsInArea: z.number().int().min(0).default(0),
  parcelsFiltered: z.number().int().min(0).default(0),
  creditsQuoted: z.number().int().min(0).default(0),
  monitorCadence: z.enum(["monthly", "quarterly"]).nullable().default(null),
});

export type ScanJobInput = z.infer<typeof scanJobInputSchema>;