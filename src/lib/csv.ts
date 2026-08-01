// Minimal RFC 4180-ish CSV parser. No dependencies. Handles quoted fields,
// escaped quotes, and \r\n / \n line endings. Good for lead lists up to a
// few tens of thousands of rows parsed in the browser.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* handled with \n */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

export type CsvLead = {
  full_name?: string | null;
  business_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

// Map a header string to a canonical lead field, or null to skip.
export function canonicalField(h: string): keyof CsvLead | null {
  const s = h.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (["fullname", "name", "contactname", "ownername"].includes(s)) return "full_name";
  if (["businessname", "company", "companyname", "business"].includes(s)) return "business_name";
  if (["phone", "phonenumber", "mobile", "cell", "phone1"].includes(s)) return "phone";
  if (["email", "emailaddress", "email1"].includes(s)) return "email";
  if (["address", "street", "streetaddress", "addressline1"].includes(s)) return "address";
  if (["city", "town"].includes(s)) return "city";
  if (["state", "region", "province"].includes(s)) return "state";
  if (["zip", "zipcode", "postal", "postalcode"].includes(s)) return "zip";
  return null;
}

// Parse a CSV string into a bounded array of leads. Returns { rows, skipped,
// headers } so the UI can report what was read and dropped.
export function csvToLeads(text: string, max = 25_000): { rows: CsvLead[]; skipped: number; headers: string[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], skipped: 0, headers: [] };
  const headers = table[0]!.map((h) => h.trim());
  const mapping = headers.map(canonicalField);
  const rows: CsvLead[] = [];
  let skipped = 0;
  for (let i = 1; i < table.length; i++) {
    if (rows.length >= max) { skipped++; continue; }
    const raw = table[i]!;
    const lead: CsvLead = {};
    let hasAny = false;
    for (let j = 0; j < mapping.length; j++) {
      const key = mapping[j];
      if (!key) continue;
      const val = (raw[j] ?? "").trim();
      if (!val) continue;
      lead[key] = val;
      hasAny = true;
    }
    if (hasAny) rows.push(lead);
    else skipped++;
  }
  return { rows, skipped, headers };
}
/** Canonical lead fields, in the order the mapper renders them. */
export const LEAD_FIELDS: Array<{ key: keyof CsvLead; label: string }> = [
  { key: "full_name", label: "Full Name" },
  { key: "business_name", label: "Business Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
];

export const SKIP = "__skip";

export type ColumnMap = Record<string, string>;

/** Best-guess mapping of canonical field -> source header (or SKIP). */
export function autoMapHeaders(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (const f of LEAD_FIELDS) map[f.key] = SKIP;
  headers.forEach((h) => {
    const key = canonicalField(h);
    if (key && map[key] === SKIP) map[key] = h;
  });
  return map;
}

/** Headers that couldn't be auto-matched to a canonical field. */
export function ambiguousHeaders(headers: string[]): string[] {
  return headers.filter((h) => !canonicalField(h));
}

export function mappedCount(map: ColumnMap): number {
  return Object.values(map).filter((v) => v && v !== SKIP).length;
}

/** Apply a column map to a parsed table (row 0 = headers). */
export function rowsFromTable(table: string[][], map: ColumnMap, max = 25_000): CsvLead[] {
  if (!table.length) return [];
  const headers = table[0]!.map((h) => h.trim());
  const index: Array<[keyof CsvLead, number]> = [];
  for (const f of LEAD_FIELDS) {
    const h = map[f.key];
    if (!h || h === SKIP) continue;
    const i = headers.indexOf(h);
    if (i >= 0) index.push([f.key, i]);
  }
  const rows: CsvLead[] = [];
  for (let r = 1; r < table.length && rows.length < max; r++) {
    const raw = table[r]!;
    const lead: CsvLead = {};
    let has = false;
    for (const [key, i] of index) {
      const v = (raw[i] ?? "").trim();
      if (!v) continue;
      lead[key] = v;
      has = true;
    }
    if (has) rows.push(lead);
  }
  return rows;
}
