// Follow-up probe: get a hash from /search, then exercise /details with it.
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

const H = {
  "X-RF-Partner-Api-Key": env.REALEFLOW_API_KEY,
  "X-RF-Partner-Account-Id": env.REALEFLOW_ACCOUNT_ID,
  "Content-Type": "application/json",
  "User-Agent": "LeadTrace-Integration/1.0 (+github.com/realelite)",
};
const B = env.REALEFLOW_BASE_URL.replace(/\/+$/, "") + "/api/2.0/leadpipes";

const sRes = await fetch(`${B}/search`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ places: [{ state: "FL", fips: 12057 }], size: 1 }),
});
const s = await sRes.json();
const row = (s.data ?? s.results ?? [])[0];
if (!row) {
  console.log("no rows from search:", JSON.stringify(s).slice(0, 300));
  process.exit(1);
}

const idKeys = Object.keys(row).filter((k) => /hash|identifier|^id$|property_id|situs_id/i.test(k));
console.log("id-ish keys:", idKeys.map((k) => `${k}=${JSON.stringify(row[k])}`).join(" | ") || "(none)");
console.log(
  "row: addr=%s | owner=%s | value=%s | equity=%s",
  row.situs_std_full_street_address ?? row.situs_std_street,
  row.owner_std_name1_full,
  row.property_value,
  row.estimated_equity,
);

const hash = row.hash ?? row.address_hash ?? row.property_hash ?? row.id ?? row.identifier;
if (!hash) {
  console.log("\nNo hash on the search row. All keys:\n" + Object.keys(row).sort().join(", "));
  process.exit(0);
}

console.log("\n=== DETAILS for", hash, "===");
const dRes = await fetch(`${B}/details/${encodeURIComponent(hash)}?with=history,parcel,preforeclosures,liens`, {
  headers: H,
});
console.log("status:", dRes.status);
const d0 = await dRes.json();
const d = d0.data ?? d0;
console.log("fields:", Object.keys(d).length);
for (const k of [
  "owner_std_name1_full",
  "mailing_std_full_street_address",
  "property_value",
  "estimated_equity",
  "loan_to_value",
  "estimated_mortgage_balance",
  "free_and_clear",
  "absentee_owner",
  "mailing_opt_out",
])
  console.log(" ", k, "=", JSON.stringify(d[k]));
const pk = Object.keys(d).filter((k) => /phone|email/i.test(k));
console.log("phone/email keys:", pk.length ? pk.join(",") : "NONE (matches docs)");
