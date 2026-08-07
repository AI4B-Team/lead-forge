// Source trust vocabulary, kept browser-safe so adapters, tests and the
// reconciler all agree on which source wins a contested field.

export type SourceClass =
  | "court_docket"
  | "clerk_records"
  | "county_auction"
  | "licensed_api"
  | "vendor_auction"
  | "open_data"
  | "aggregator"
  | "user_upload"
  | "derived";

export const SOURCE_CLASS_RANK: Record<SourceClass, number> = {
  court_docket: 5,
  clerk_records: 5,
  county_auction: 4,
  // A licensed vendor API is a paid, contractual feed: more reliable than a
  // republished auction page or a county open-data extract, still outranked by
  // the clerk of court itself.
  licensed_api: 3,
  vendor_auction: 3,
  open_data: 2,
  user_upload: 2,
  aggregator: 2,
  derived: 1,
};