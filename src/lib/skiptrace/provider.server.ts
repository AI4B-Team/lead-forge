// MVP #3 — Skip trace provider abstraction (server-only).
//
// The boss hasn't picked a paid skip-trace vendor yet (BatchData etc. TBD),
// so this module defines a small provider interface and ships one default
// implementation: "realeflow-semi" — a semi-skip-trace that resolves the
// property through the Realeflow Property Data API and pulls the assessor's
// owner name + MAILING address (the owner's real address for absentee
// owners — exactly what you'd mail/knock). Phones/emails stay empty until a
// real vendor is wired in; swapping vendors = add a class + change one env
// var (SKIPTRACE_PROVIDER), no UI/DB changes.

import process from "node:process";
import { rfAutocomplete, rfDetails } from "@/lib/realeflow/client.server";

export interface SkipTraceInput {
  ownerName: string | null;
  /** Property street address, e.g. "6211 S MARTINDALE AVE" */
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface SkipTraceResult {
  provider: string;
  /** Confirmed/normalized owner name (may correct the scraped one). */
  ownerName: string | null;
  /** Owner's mailing address — the money shot for absentee owners. */
  mailingStreet: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  mailingZip: string | null;
  /** True when mailing address differs from the property → absentee owner. */
  absenteeOwner: boolean | null;
  phones: string[];
  emails: string[];
  /** Realeflow address hash (lets the UI deep-link to comps/details). */
  addressHash: string | null;
  /** Extra provider-specific fields worth keeping (equity, value…). */
  extras: Record<string, unknown>;
  tracedAt: string;
}

export interface SkipTraceProvider {
  readonly name: string;
  trace(input: SkipTraceInput): Promise<SkipTraceResult>;
}

// ── Default provider: Realeflow semi-skip-trace ───────────────────────────

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

class RealeflowSemiProvider implements SkipTraceProvider {
  readonly name = "realeflow-semi";

  async trace(input: SkipTraceInput): Promise<SkipTraceResult> {
    if (!input.street) throw new Error("Lead has no property address to trace");

    // 1) Resolve the address to a Realeflow hash via autocomplete.
    const q = [input.street, input.city, input.state, input.zip].filter(Boolean).join(", ");
    const suggestions = await rfAutocomplete(q);
    const addressHit = (suggestions ?? []).find(
      (s) => s.type === "address" && s.address?.hash,
    );
    const hash = addressHit?.type === "address" ? addressHit.address.hash : null;
    if (!hash) {
      throw new Error(`No property match for "${q}" — try enriching the address first`);
    }

    // 2) Pull the full record (owner + mailing address live here).
    const d = (await rfDetails(hash, [])) as unknown as Record<string, unknown>;

    const mailingStreet = str(d.mailing_std_street) || null;
    const mailingCity = str(d.mailing_std_city) || null;
    const mailingState = str(d.mailing_std_state) || null;
    const mailingZip = str(d.mailing_std_zip) || null;

    // Absentee heuristic: mailing street exists and differs from the property.
    const propStreet = (input.street ?? "").toUpperCase().replace(/\s+/g, " ").trim();
    const mailStreet = (mailingStreet ?? "").toUpperCase().replace(/\s+/g, " ").trim();
    const absenteeOwner = mailingStreet ? mailStreet !== propStreet : null;

    // Realeflow property records occasionally carry phone fields; collect any.
    const phones = [str(d.phone), str(d.owner_phone), str(d.phone_number)]
      .filter((p) => p.replace(/\D/g, "").length >= 10);

    return {
      provider: this.name,
      ownerName: str(d.owner_std_name1_full) || input.ownerName,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingZip,
      absenteeOwner,
      phones,
      emails: [],
      addressHash: hash,
      extras: {
        property_value: num(d.property_value),
        estimated_equity: num(d.estimated_equity),
        estimated_mortgage_balance: num(d.estimated_mortgage_balance),
        years_owned: num(d.length_of_ownership),
        year_built: num(d.year_built),
        bedrooms: num(d.bedrooms),
        baths: num(d.bath_total_calc),
        building_area: num(d.building_area),
      },
      tracedAt: new Date().toISOString(),
    };
  }
}

// ── Provider selection ─────────────────────────────────────────────────────
// Future: add `class BatchDataProvider implements SkipTraceProvider` and
// register it here; select with SKIPTRACE_PROVIDER=batchdata in env.

const providers: Record<string, () => SkipTraceProvider> = {
  "realeflow-semi": () => new RealeflowSemiProvider(),
};

export function getSkipTraceProvider(): SkipTraceProvider {
  const key = process.env.SKIPTRACE_PROVIDER ?? "realeflow-semi";
  const factory = providers[key];
  if (!factory) {
    throw new Error(
      `Unknown SKIPTRACE_PROVIDER "${key}". Available: ${Object.keys(providers).join(", ")}`,
    );
  }
  return factory();
}
