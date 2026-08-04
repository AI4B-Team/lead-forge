import { describe, expect, it } from "vitest";
import { checkCanText } from "./optout.server";

/**
 * Chainable Supabase stub. `leads` answers maybeSingle(); every other table
 * resolves to an empty list so opt-out and suppression checks pass.
 */
function makeDb(
  lead: { phone: string | null; scrub_status: string | null; data_provenance?: string } | null,
) {
  if (lead && !lead.data_provenance) lead.data_provenance = "verified_source";
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    const chain = () => q;
    for (const k of ["select", "eq", "in", "or", "order", "limit", "update"]) q[k] = chain;
    q.maybeSingle = async () => ({ data: table === "leads" ? lead : null });
    q.single = async () => ({ data: table === "leads" ? lead : null });
    (q as { then: unknown }).then = (res: (v: unknown) => void) => res({ data: [] });
    return q;
  };
  return { from } as never;
}

const target = { workspaceId: "ws1", leadId: "lead1" };

describe("send gate fails closed on scrub status", () => {
  it("allows a clean lead on cold outbound", async () => {
    const db = makeDb({ phone: "+15551234567", scrub_status: "clean" });
    const gate = await checkCanText(db, { ...target, source: "campaign:c1" });
    expect(gate.ok).toBe(true);
  });

  it("blocks DNC and litigator hits on every path, inbound included", async () => {
    for (const [status, reason] of [
      ["dnc", "dnc_listed"],
      ["litigator", "litigator_listed"],
    ] as const) {
      const db = makeDb({ phone: "+15551234567", scrub_status: status });
      for (const source of ["campaign:c1", "inbox", "bot:c1"]) {
        const gate = await checkCanText(db, { ...target, source });
        expect(gate.ok).toBe(false);
        expect(gate.ok === false && gate.reason).toBe(reason);
      }
    }
  });

  it("blocks unscrubbed and unknown numbers from cold outbound", async () => {
    for (const status of ["unscrubbed", "unknown", null]) {
      const db = makeDb({ phone: "+15551234567", scrub_status: status });
      for (const source of ["campaign:c1", "cadence"]) {
        const gate = await checkCanText(db, { ...target, source });
        expect(gate.ok).toBe(false);
        expect(gate.ok === false && gate.reason).toBe("not_scrubbed");
      }
    }
  });

  it("still allows manual and bot replies on a consumer-initiated thread", async () => {
    const db = makeDb({ phone: "+15551234567", scrub_status: "unscrubbed" });
    for (const source of ["inbox", "bot:c1"]) {
      const gate = await checkCanText(db, { ...target, source });
      expect(gate.ok).toBe(true);
    }
  });
});
