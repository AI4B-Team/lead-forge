// Florida county → FIPS reference. Static because county FIPS codes do not
// change; used to key source_coverage rows during source discovery.

export const FL_COUNTY_FIPS: Record<string, string> = {
  Alachua: "12001", Baker: "12003", Bay: "12005", Bradford: "12007", Brevard: "12009",
  Broward: "12011", Calhoun: "12013", Charlotte: "12015", Citrus: "12017", Clay: "12019",
  Collier: "12021", Columbia: "12023", DeSoto: "12027", Dixie: "12029", Duval: "12031",
  Escambia: "12033", Flagler: "12035", Franklin: "12037", Gadsden: "12039", Gilchrist: "12041",
  Glades: "12043", Gulf: "12045", Hamilton: "12047", Hardee: "12049", Hendry: "12051",
  Hernando: "12053", Highlands: "12055", Hillsborough: "12057", Holmes: "12059",
  "Indian River": "12061", Jackson: "12063", Jefferson: "12065", Lafayette: "12067",
  Lake: "12069", Lee: "12071", Leon: "12073", Levy: "12075", Liberty: "12077",
  Madison: "12079", Manatee: "12081", Marion: "12083", Martin: "12085", "Miami-Dade": "12086",
  Monroe: "12087", Nassau: "12089", Okaloosa: "12091", Okeechobee: "12093", Orange: "12095",
  Osceola: "12097", "Palm Beach": "12099", Pasco: "12101", Pinellas: "12103", Polk: "12105",
  Putnam: "12107", "St. Johns": "12109", "St. Lucie": "12111", "Santa Rosa": "12113",
  Sarasota: "12115", Seminole: "12117", Sumter: "12119", Suwannee: "12121", Taylor: "12123",
  Union: "12125", Volusia: "12127", Wakulla: "12129", Walton: "12131", Washington: "12133",
};

/** Aliases the vendor uses on its client index that differ from the canonical name. */
const ALIASES: Record<string, string> = {
  "saint johns": "St. Johns",
  "st johns": "St. Johns",
  "saint lucie": "St. Lucie",
  "st lucie": "St. Lucie",
  "miami dade": "Miami-Dade",
  miamidade: "Miami-Dade",
  desoto: "DeSoto",
};

export function canonicalFlCounty(raw: string): string | null {
  const cleaned = raw
    .replace(/\b(foreclosure|tax\s*deed|taxdeed|treasurer\s*deed|county|sale)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  const key = cleaned.toLowerCase().replace(/[.]/g, "").replace(/-/g, " ").trim();
  if (ALIASES[key]) return ALIASES[key]!;
  const match = Object.keys(FL_COUNTY_FIPS).find(
    (c) => c.toLowerCase().replace(/[.]/g, "").replace(/-/g, " ") === key,
  );
  return match ?? null;
}

/** Vendor subdomains are the county name lowercased with punctuation stripped. */
export function realauctionSubdomain(county: string): string {
  return county
    .toLowerCase()
    .replace(/^st\.?\s+/, "st")
    .replace(/[^a-z0-9]/g, "");
}