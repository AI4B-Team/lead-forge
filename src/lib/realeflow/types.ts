// Realeflow Partner API — TypeScript types
// Built from the Partner API docs (docs/3.Property Data API/*)
// Safe to import from client or server (types only).

// ── Shared ────────────────────────────────────────────────────────────────

/** JSON-serializable value (required by TanStack Start server-fn returns) */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface Range {
  min?: number;
  max?: number;
}

/** Date range, values formatted YYYY-MM-DD */
export interface DateRange {
  min?: string;
  max?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** GeoJSON Point — coordinates are [lng, lat], NOT [lat, lng] */
export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

// ── Autocomplete ──────────────────────────────────────────────────────────

export interface AutocompleteAddress {
  hash: string; // pass to /details/{hash} and /comps/{hash}
  unitGroupHash: string | null;
  address: string;
  streetAndNumber: string;
  addressWithoutState: string;
  number: string;
  streetDirection: string | null;
  street: string;
  streetDesignator: string;
  streetDirectionPost: string | null;
  unit: string | null;
  unitType: string | null;
  city: string;
  county: string | null;
  fips: string | null;
  state: string;
  zip: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface AutocompleteAddressResult {
  type: "address";
  text: string;
  address: AutocompleteAddress;
  location: GeoJsonPoint;
  parcel?: GeoJsonPolygon;
}

export interface AutocompleteCityResult {
  type: "city";
  text: string;
  city: {
    city: string;
    county: string;
    state: string;
    fips: number;
    latitude: number;
    longitude: number;
  };
  location: GeoJsonPoint;
}

export interface AutocompleteCountyResult {
  type: "county";
  text: string;
  county: {
    county: string;
    city: string;
    state: string;
    fips: number;
    latitude: number;
    longitude: number;
  };
  location: GeoJsonPoint;
}

export interface AutocompleteZipResult {
  type: "zip";
  text: string;
  zip: {
    zip: string[];
    city: string;
    county: string;
    state: string;
    latitude: number;
    longitude: number;
  };
  location: GeoJsonPoint;
}

export interface AutocompleteStateResult {
  type: "state";
  text: string;
  state: { state: string; latitude: number; longitude: number };
  location: GeoJsonPoint;
}

export interface AutocompleteParcelResult {
  type: "parcel";
  text: string;
}

export type AutocompleteResult =
  | AutocompleteAddressResult
  | AutocompleteCityResult
  | AutocompleteCountyResult
  | AutocompleteZipResult
  | AutocompleteStateResult
  | AutocompleteParcelResult;

// ── Property object (subset of the most useful fields; the API returns
//    many more — treat unknown keys as extra data) ─────────────────────────

/**
 * MLS-sourced listing status info.
 *
 * ⚠️ COMPLIANCE (per Tyler Snyder, Realeflow CTO, 2026-07-28):
 * When `source === "MLS"`, any view rendering listing data (status, list
 * price, days on market, agent info) MUST display `mls_disclaimer` in full
 * (visible without user interaction, not truncated/paraphrased — small font
 * OK) plus `mls_listing_source` as attribution. Comps carry the same fields.
 * Non-compliance can suspend MLS data access.
 */
export interface StatusInfo {
  source?: string; // "MLS" triggers the disclaimer requirement
  mls_disclaimer?: string;
  mls_listing_source?: string;
  [key: string]: Json | undefined;
}

export interface RfProperty {
  address_hash?: string;
  address_number?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  bedrooms?: number;
  bath_total_calc?: number;
  building_area?: number;
  year_built?: number;
  property_value?: number;
  owner_std_name1_full?: string;
  // Details-only fields:
  length_of_ownership?: number;
  estimated_equity?: number;
  estimated_mortgage_balance?: number;
  // Listing status (MLS compliance — see StatusInfo docs):
  status_info?: StatusInfo;
  // Include sections (details endpoint).
  // Entitlement behavior (confirmed by Realeflow):
  //   - history + parcel: NEVER entitlement-gated, always present if requested
  //   - liens + preforeclosures: entitlement-gated; silently OMITTED for
  //     accounts without access (absence ≠ "no liens exist"!)
  history?: { data: Record<string, Json>[] };
  parcel?: { data: Record<string, Json>[] };
  liens?: { data: Record<string, Json>[] };
  preforeclosures?: { data: Record<string, Json>[] };
  // Everything else the API returns:
  [key: string]: Json | StatusInfo | undefined;
}

// ── Search ────────────────────────────────────────────────────────────────

// e.g. "ABSENTEE_OWNER" | "HIGH_EQUITY" | "FREE_AND_CLEAR" ... see Enums doc.
// Entitlements: leadTypes is narrowed server-side to the account's available
// set (Premium Leads plan 589 unlocks premium types). Omit the filter to get
// the account's full available set.
export type LeadType = string;

export interface SearchCursor {
  element: string;
  sort: Json[];
  search: number;
}

export interface SearchRequest {
  // Pagination
  page?: number;
  page_size?: number;
  cursor?: SearchCursor;
  returnIdsOnly?: boolean;
  simplifiedResponse?: boolean;
  // Geographic anchor (at least one required)
  state?: string;
  places?: Array<{ state?: string; city?: string; fips?: number; zip?: string }>;
  geolocation?: GeoPoint;
  location?: GeoPoint;
  distance?: number;
  bounds?: { topLeft: GeoPoint; bottomRight: GeoPoint };
  polygons?: Array<{ coordinates: GeoPoint[] }>;
  searchWithinBounds?: boolean;
  // Property characteristics
  bedrooms?: Range;
  bathrooms?: Range;
  livingArea?: Range;
  lotArea?: Range;
  yearBuilt?: Range;
  propertyMainCategory?: "RESIDENTIAL" | "COMMERCIAL" | "ALL";
  propertyTypes?: Record<string, string[]>;
  keywords?: string[];
  // Value / finance
  value?: Range;
  lastSalePrice?: Range;
  listingPrice?: Range;
  loanToValue?: Range;
  rentalValue?: Range;
  // Dates
  lastSaleDate?: DateRange;
  lastNoticeDate?: DateRange;
  lastAuctionDate?: DateRange;
  // Lead / lien
  leadTypes?: LeadType[] | { include?: LeadType[]; exclude?: LeadType[] };
  lienTypes?: string[];
  // Owner
  ownerName?: string[];
  ownerTypes?: Array<"NONE" | "BUSINESS" | "FINANCIAL" | "GOVERNMENT" | "TRUST">;
  ownerOccupied?: boolean;
  absenteeOwnerInState?: boolean;
  absenteeOwnerOutOfState?: boolean;
  // Sort
  sort?: string;
  direction?: "asc" | "desc";
}

export interface SearchResponse {
  data: RfProperty[];
  count: number;
  cluster?: Record<string, number>;
  histograms?: Record<string, Array<{ key: string | number; count: number }>>;
  allowAiFilters?: boolean;
  cursor?: SearchCursor;
}

// ── Comps ─────────────────────────────────────────────────────────────────

export interface CompsRequest {
  // Subject (body form only — ignored when identifier is in the path)
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  location?: GeoPoint;
  // Filter overrides
  limit?: number;
  source?: string[]; // e.g. ["PUBLIC_RECORD", "MLS_LISTINGS"]
  sameZip?: boolean;
  days?: number;
  distance?: number;
  bedrooms?: Range;
  bathrooms?: Range;
  livingArea?: Range;
  yearBuilt?: Range;
  propertyTypes?: Record<string, string[]>;
  sort?: string;
  order?: "asc" | "desc";
}

export interface CompEnvelope {
  distance: number;
  record_type: "ASSESSOR" | "MLS_LISTING" | "LISTING_ALT" | "RENTAL_ALT";
  property: RfProperty;
}

export interface CompsResponse {
  subject: { data: RfProperty };
  comps: CompEnvelope[];
  count_comps: number;
  comp_sources: string[];
  filters: Record<string, Json>;
  histograms?: Record<string, Json>;
  retries: number;
}

// ── Details ───────────────────────────────────────────────────────────────

export type DetailsInclude = "history" | "parcel" | "preforeclosures" | "liens";

export type DetailsResponse = RfProperty;
