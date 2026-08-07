// RealeFlow Partner API smoke test — autocomplete → details → search.
// Reads credentials from .env (never printed). Run: node scripts/realeflow-smoke.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const BASE = env.REALEFLOW_BASE_URL?.replace(/\/+$/, "");
const HEADERS = {
  "X-RF-Partner-Api-Key": env.REALEFLOW_API_KEY,
  "X-RF-Partner-Account-Id": env.REALEFLOW_ACCOUNT_ID,
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "LeadTrace-Integration/1.0 (+github.com/realelite)",
};

async function call(method, path, body) {
  const res = await fetch(`${BASE}/api/2.0/leadpipes${path}`, {
    method,
    headers: HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 300);
  }
  return { status: res.status, json };
}

// 1. Autocomplete — resolve a Tampa address (from our own lead samples)
console.log("=== 1. AUTOCOMPLETE ===");
let first;
for (const q of ["6001 W Hillsborough Ave, Tampa, FL", "1420 4th St N, St. Petersburg, FL", "Tampa, FL"]) {
  const ac = await call("GET", `/autocomplete?q=${encodeURIComponent(q)}`);
  const suggestions = Array.isArray(ac.json) ? ac.json : (ac.json?.data ?? []);
  console.log(`q="${q}" → status ${ac.status}, ${suggestions.length} suggestions`);
  const addr = suggestions.find((s) => s.type === "address");
  if (addr) {
    first = addr;
    console.log("picked:", JSON.stringify({ text: addr.text, hash: addr.address?.hash }).slice(0, 250));
    break;
  }
}

// 2. Details — full record for the first hit
const hash = first?.address?.hash ?? first?.hash ?? first?.identifier ?? first?.id;
if (hash) {
  console.log("\n=== 2. DETAILS ===");
  const det = await call("GET", `/details/${encodeURIComponent(hash)}?with=history,parcel,preforeclosures,liens`);
  console.log("status:", det.status);
  const d = det.json?.data ?? det.json;
  if (d && typeof d === "object") {
    const keys = Object.keys(d);
    console.log("fields returned:", keys.length);
    const pick = (k) => (d[k] !== undefined ? `${k}=${JSON.stringify(d[k])}` : `${k}=<absent>`);
    console.log("ENRICHMENT FIELDS:");
    for (const k of [
      "owner_std_name1_full", "owner_type", "owner_occupied", "absentee_owner",
      "mailing_std_full_street_address", "mailing_opt_out",
      "property_value", "estimated_equity", "loan_to_value", "estimated_mortgage_balance",
      "free_and_clear", "high_equity",
    ]) console.log("  " + pick(k));
    // Confirm the docs finding: no owner phone fields
    const phoneKeys = keys.filter((k) => /phone|email/i.test(k));
    console.log("phone/email-ish top-level keys:", phoneKeys.length ? phoneKeys.join(", ") : "NONE (matches docs)");
  } else {
    console.log("body:", JSON.stringify(det.json).slice(0, 300));
  }
} else {
  console.log("\n(no hash from autocomplete — skipping details)");
}

// 3. Search — small Hillsborough County search
console.log("\n=== 3. SEARCH ===");
// Per docs: geographic anchor via places[].fips (Hillsborough FL = 12057)
const search = await call("POST", "/search", {
  places: [{ state: "FL", fips: 12057 }],
  size: 3,
});
console.log("status:", search.status);
const body = search.json;
if (body && typeof body === "object") {
  const rows = body.data ?? body.results ?? body.properties ?? [];
  const total = body.total ?? body.total_count ?? body.count;
  console.log("total:", total, "| rows in page:", Array.isArray(rows) ? rows.length : "?");
  if (Array.isArray(rows) && rows[0]) {
    console.log("first row keys sample:", Object.keys(rows[0]).slice(0, 15).join(", "));
  } else {
    console.log("body sample:", JSON.stringify(body).slice(0, 400));
  }
}
console.log("\nDone.");
