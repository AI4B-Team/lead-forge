// ---------------------------------------------------------------------------
// P3 — case reconciler.
//
// Every distress observation (a vendor auction row, a court docket line, a
// records-request extract) lands here rather than in foreclosure_cases
// directly. Two reasons:
//
//   1. One property in foreclosure produces many observations across many
//      sources. Inserting them independently gives an operator four "cases"
//      for one house.
//   2. Merging is only safe when we can say WHY two observations are the same
//      case, and how sure we are. Every merge records its match key and a
//      confidence score; anything below CONFIDENCE_FLOOR creates a new case
//      instead of guessing. We would rather show two cases than silently
//      staple a sale date onto the wrong parcel.
//
// Field-level writes are provenance-ranked: a county court docket outranks a
// vendor auction page, which outranks an aggregator. A weaker source never
// overwrites a value a stronger one already established, but it may fill a
// null.
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";

/** Merges below this confidence are refused — we create a new case instead. */
export const CONFIDENCE_FLOOR = 0.7;

/** How much a source is trusted when two sources disagree on one field. */
export type SourceClass =
  | "court_docket"
  | "clerk_records"
  | "county_auction"
  | "vendor_auction"
  | "aggregator"
  | "user_upload"
  | "derived";

export const SOURCE_CLASS_RANK: Record<SourceClass, number> = {
  court_docket: 5,
  clerk_records: 5,
  county_auction: 4,
  vendor_auction: 3,
  user_upload: 2,
  aggregator: 2,
  derived: 1,
};

function rankOf(sourceClass: string): number {
  return SOURCE_CLASS_RANK[sourceClass as SourceClass] ?? 1;
}

// ---------------------------------------------------------------------------
// Normalisation. Both helpers must be pure and stable: their output is stored
// and indexed, so a change here is a migration, not a refactor.
// ---------------------------------------------------------------------------

/**
 * Case numbers are written a dozen ways for the same case:
 * "2023-CA-001234-AXXX-MB", "23CA1234", "2023 CA 001234". Strip formatting,
 * uppercase, and drop leading zeros inside each numeric run so the padded and
 * unpadded forms collapse to one key.
 */
export function normalizeCaseNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact) return null;
  const unpadded = compact.replace(/0+(\d)/g, "$1");
  return unpadded.length >= 4 ? unpadded : null;
}

const STREET_ABBREV: Record<string, string> = {
  STREET: "ST", ST: "ST", AVENUE: "AVE", AVE: "AVE", ROAD: "RD", RD: "RD",
  DRIVE: "DR", DR: "DR", LANE: "LN", LN: "LN", COURT: "CT", CT: "CT",
  BOULEVARD: "BLVD", BLVD: "BLVD", PLACE: "PL", PL: "PL", TERRACE: "TER",
  TER: "TER", CIRCLE: "CIR", CIR: "CIR", HIGHWAY: "HWY", HWY: "HWY",
  PARKWAY: "PKWY", PKWY: "PKWY", TRAIL: "TRL", TRL: "TRL",
  NORTH: "N", SOUTH: "S", EAST: "E", WEST: "W",
  NORTHEAST: "NE", NORTHWEST: "NW", SOUTHEAST: "SE", SOUTHWEST: "SW",
  APARTMENT: "APT", APT: "APT", UNIT: "UNIT", SUITE: "STE", STE: "STE",
};

export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";
  return address
    .toUpperCase()
    .replace(/[.,#]/g, " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => STREET_ABBREV[t] ?? t)
    .join(" ");
}

/**
 * Stable fingerprint for a property location. Always returns a value — an
 * observation with no address hashes its empty form, which is why the address
 * cascade below refuses to match on an empty normalized address.
 */
export function addressHash(input: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const parts = [
    normalizeAddress(input.address),
    (input.city ?? "").toUpperCase().replace(/[^A-Z ]/g, "").trim(),
    (input.state ?? "").toUpperCase().slice(0, 2),
    (input.zip ?? "").replace(/[^0-9]/g, "").slice(0, 5),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 40);
}

// ---------------------------------------------------------------------------
// Observation shape
// ---------------------------------------------------------------------------

export type CaseObservationInput = {
  fips: string;
  state: string;
  county?: string | null;
  recordType: string;
  sourceClass: SourceClass;
  sourceId?: string | null;
  sourceUrl?: string | null;
  observedAt?: string;
  caseNumber?: string | null;
  parcelApn?: string | null;
  propertyAddress?: string | null;
  propertyCity?: string | null;
  propertyState?: string | null;
  propertyZip?: string | null;
  ownerFirst?: string | null;
  ownerLast?: string | null;
  companyEntity?: string | null;
  caseStatus?: string | null;
  stage?: string | null;
  filedDate?: string | null;
  auctionDate?: string | null;
  auctionTime?: string | null;
  openingBid?: number | null;
  attorneyName?: string | null;
  attorneyFirm?: string | null;
  attorneyPhone?: string | null;
  mortgagee?: string | null;
  servicer?: string | null;
  loanBalance?: number | null;
  originalMortgage?: number | null;
  raw?: Record<string, unknown>;
};

export type ReconcileResult = {
  caseId: string;
  created: boolean;
  matchKeyUsed: string;
  confidence: number;
  /** Fields this observation actually wrote, for run logs. */
  fieldsWritten: string[];
};

type CaseRow = Record<string, unknown> & {
  id: string;
  address_hash: string;
  record_type: string;
  auction_date: string | null;
  owner_last: string | null;
  parcel_apn: string | null;
  field_provenance: Record<string, { source_class?: string; observed_at?: string }> | null;
};

/** Columns the reconciler owns, mapped from the observation. */
const FIELD_MAP: Array<[column: string, pick: (o: CaseObservationInput) => unknown]> = [
  ["county", (o) => o.county],
  ["case_number", (o) => o.caseNumber],
  ["parcel_apn", (o) => o.parcelApn],
  ["property_address", (o) => o.propertyAddress],
  ["property_city", (o) => o.propertyCity],
  ["property_state", (o) => o.propertyState ?? o.state],
  ["property_zip", (o) => o.propertyZip],
  ["owner_first", (o) => o.ownerFirst],
  ["owner_last", (o) => o.ownerLast],
  ["company_entity", (o) => o.companyEntity],
  ["stage", (o) => o.stage],
  ["filed_date", (o) => o.filedDate],
  ["auction_date", (o) => o.auctionDate],
  ["auction_time", (o) => o.auctionTime],
  ["opening_bid", (o) => o.openingBid],
  ["attorney_name", (o) => o.attorneyName],
  ["attorney_firm", (o) => o.attorneyFirm],
  ["attorney_phone", (o) => o.attorneyPhone],
  ["mortgagee", (o) => o.mortgagee],
  ["servicer", (o) => o.servicer],
  ["loan_balance", (o) => o.loanBalance],
  ["original_mortgage", (o) => o.originalMortgage],
];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------------------------------------------------------------------------
// The cascade. Ordered strongest key first; the first hit wins and carries its
// own confidence. Nothing scoring under CONFIDENCE_FLOOR is treated as a match.
// ---------------------------------------------------------------------------

async function findMatch(
  o: CaseObservationInput,
  normalizedCase: string | null,
  hash: string,
  hasAddress: boolean,
): Promise<{ row: CaseRow; matchKeyUsed: string; confidence: number } | null> {
  const supabase = await admin();
  const select =
    "id, fips, record_type, address_hash, parcel_apn, case_number_normalized, auction_date, owner_last, field_provenance";

  // 1. Same county + same normalized case number. The court's own identifier:
  //    as close to a primary key as this domain gets.
  if (normalizedCase) {
    const { data } = await supabase
      .from("foreclosure_cases")
      .select(select)
      .eq("fips", o.fips)
      .eq("case_number_normalized", normalizedCase)
      .limit(1);
    const row = (data ?? [])[0] as CaseRow | undefined;
    if (row) return { row, matchKeyUsed: "case_number", confidence: 1 };
  }

  // 2. Same county + same parcel APN. Identifies the property, not the case,
  //    so a second filing on the same parcel can land here legitimately —
  //    still the same asset, which is what an operator is tracking.
  const apn = (o.parcelApn ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (apn.length >= 5) {
    const { data } = await supabase
      .from("foreclosure_cases")
      .select(select)
      .eq("fips", o.fips)
      .eq("record_type", o.recordType)
      .limit(20);
    const row = (data ?? [])
      .map((r) => r as unknown as CaseRow)
      .find((r) => (r.parcel_apn ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase() === apn);
    if (row) return { row, matchKeyUsed: "parcel_apn", confidence: 0.95 };
  }

  // 3. Same county + same normalized address. Weaker: addresses are dirty and
  //    condo buildings collide. Corroboration lifts it, absence of any
  //    corroboration leaves it just above the floor.
  if (hasAddress) {
    const { data } = await supabase
      .from("foreclosure_cases")
      .select(select)
      .eq("fips", o.fips)
      .eq("address_hash", hash)
      .limit(10);
    const rows = (data ?? []).map((r) => r as unknown as CaseRow);
    const sameType = rows.filter((r) => r.record_type === o.recordType);
    const corroborated = sameType.find(
      (r) =>
        (o.auctionDate && r.auction_date === o.auctionDate) ||
        (o.ownerLast && r.owner_last && r.owner_last.toUpperCase() === o.ownerLast.toUpperCase()),
    );
    if (corroborated) return { row: corroborated, matchKeyUsed: "address_corroborated", confidence: 0.92 };
    if (sameType[0]) return { row: sameType[0], matchKeyUsed: "address", confidence: 0.82 };
    // A different record type at the same address (a tax deed vs a mortgage
    // foreclosure) is a different case. Scored below the floor on purpose.
    if (rows[0]) return { row: rows[0], matchKeyUsed: "address_cross_type", confidence: 0.55 };
  }

  return null;
}

/**
 * Reconcile one observation into the shared case spine.
 *
 * Always writes a case_observations row (the audit trail is not conditional on
 * a successful match) and returns the case it was attached to.
 */
export async function reconcileObservation(o: CaseObservationInput): Promise<ReconcileResult> {
  const supabase = await admin();
  const observedAt = o.observedAt ?? new Date().toISOString();
  const normalizedCase = normalizeCaseNumber(o.caseNumber);
  const hasAddress = normalizeAddress(o.propertyAddress).length > 0;
  const hash = addressHash({
    address: o.propertyAddress,
    city: o.propertyCity,
    state: o.propertyState ?? o.state,
    zip: o.propertyZip,
  });

  const candidate = await findMatch(o, normalizedCase, hash, hasAddress);
  const accepted = candidate && candidate.confidence >= CONFIDENCE_FLOOR ? candidate : null;

  let caseId: string;
  let created = false;
  const fieldsWritten: string[] = [];
  const rank = rankOf(o.sourceClass);

  if (accepted) {
    caseId = accepted.row.id;
    const provenance = { ...(accepted.row.field_provenance ?? {}) };
    const patch: Record<string, unknown> = {};
    for (const [column, pick] of FIELD_MAP) {
      const value = pick(o);
      if (value === null || value === undefined || value === "") continue;
      const current = accepted.row[column];
      const prior = provenance[column];
      const priorRank = prior?.source_class ? rankOf(prior.source_class) : 0;
      const isEmpty = current === null || current === undefined || current === "";
      // Fill any gap. Overwrite only from an equal-or-stronger source, and
      // only with a newer reading than the one on file.
      const canOverwrite =
        rank > priorRank || (rank === priorRank && (!prior?.observed_at || observedAt >= prior.observed_at));
      if (!isEmpty && !canOverwrite) continue;
      if (!isEmpty && current === value) continue;
      patch[column] = value;
      provenance[column] = { source_class: o.sourceClass, observed_at: observedAt };
      fieldsWritten.push(column);
    }
    if (normalizedCase && !accepted.row["case_number_normalized"]) {
      patch["case_number_normalized"] = normalizedCase;
    }
    if (o.caseStatus) patch["case_status"] = o.caseStatus;
    patch["last_observed_at"] = observedAt;
    patch["field_provenance"] = provenance;
    const { error } = await supabase
      .from("foreclosure_cases")
      .update(patch as never)
      .eq("id", caseId);
    if (error) throw new Error(`reconcile update failed: ${error.message}`);
  } else {
    const insert: Record<string, unknown> = {
      fips: o.fips,
      state: o.state.toUpperCase(),
      record_type: o.recordType,
      case_status: o.caseStatus ?? "active",
      address_hash: hash,
      case_number_normalized: normalizedCase,
      first_seen_at: observedAt,
      first_seen_source_id: o.sourceId ?? null,
      last_observed_at: observedAt,
      field_provenance: {},
    };
    const provenance: Record<string, unknown> = {};
    for (const [column, pick] of FIELD_MAP) {
      const value = pick(o);
      if (value === null || value === undefined || value === "") continue;
      insert[column] = value;
      provenance[column] = { source_class: o.sourceClass, observed_at: observedAt };
      fieldsWritten.push(column);
    }
    insert["field_provenance"] = provenance;

    // Two sources can race on the same case number in one sweep; the partial
    // unique index turns that into a conflict we resolve by re-reading.
    const { data, error } = await supabase
      .from("foreclosure_cases")
      .insert(insert as never)
      .select("id")
      .maybeSingle();
    if (error) {
      if (normalizedCase) {
        const { data: existing } = await supabase
          .from("foreclosure_cases")
          .select("id")
          .eq("fips", o.fips)
          .eq("case_number_normalized", normalizedCase)
          .limit(1);
        const row = (existing ?? [])[0] as { id: string } | undefined;
        if (row) {
          return reconcileObservation({ ...o, observedAt });
        }
      }
      throw new Error(`reconcile insert failed: ${error.message}`);
    }
    caseId = (data as { id: string }).id;
    created = true;
  }

  const matchKeyUsed = accepted ? accepted.matchKeyUsed : candidate ? "new_below_floor" : "new";
  const confidence = accepted ? accepted.confidence : candidate ? candidate.confidence : 1;

  await supabase.from("case_observations").insert({
    case_id: caseId,
    source_id: o.sourceId ?? null,
    source_class: o.sourceClass,
    observed_at: observedAt,
    raw: (o.raw ?? {}) as never,
    extracted: Object.fromEntries(
      FIELD_MAP.map(([column, pick]) => [column, pick(o) ?? null]).filter(([, v]) => v !== null),
    ) as never,
    match_key_used: matchKeyUsed,
    match_confidence: confidence,
    source_url: o.sourceUrl ?? null,
  } as never);

  return { caseId, created, matchKeyUsed, confidence, fieldsWritten };
}

/** Batch helper for adapter sweeps. Never lets one bad row kill the pull. */
export async function reconcileObservations(
  observations: CaseObservationInput[],
): Promise<{ created: number; merged: number; failed: number }> {
  let createdCount = 0;
  let merged = 0;
  let failed = 0;
  for (const o of observations) {
    try {
      const result = await reconcileObservation(o);
      if (result.created) createdCount += 1;
      else merged += 1;
    } catch (err) {
      failed += 1;
      console.error("[reconcile] observation failed:", err instanceof Error ? err.message : err);
    }
  }
  return { created: createdCount, merged, failed };
}