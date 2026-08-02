import { describe, expect, it, vi } from "vitest";
import { classifyInbound, processInbound, type Sender } from "./inbound.server";

/** Tiny chainable stub of the Supabase query builder. */
function makeDb(rows: Record<string, unknown[]>) {
  const inserts: Array<{ table: string; row: unknown }> = [];
  const upserts: Array<{ table: string; row: unknown }> = [];
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    const chain = () => q;
    for (const k of ["select", "eq", "in", "or", "order", "limit", "update"]) q[k] = chain;
    q.then = undefined;
    q.maybeSingle = async () => ({ data: (rows[table] ?? [])[0] ?? null });
    q.single = async () => ({ data: (rows[table] ?? [])[0] ?? null });
    q.insert = async (row: unknown) => {
      inserts.push({ table, row });
      return { select: () => ({ single: async () => ({ data: { id: "m1" } }), maybeSingle: async () => ({ data: { id: "m1" } }) }) };
    };
    q.upsert = async (row: unknown) => { upserts.push({ table, row }); return { data: null }; };
    // `await q` resolves to the list result for plain selects.
    (q as { then: unknown }).then = (res: (v: unknown) => void) => res({ data: rows[table] ?? [] });
    return q;
  };
  return { db: { from } as never, inserts, upserts };
}

const base = {
  workspaceId: "ws1",
  toPhone: "+15550000001",
  sendingNumberId: "n1",
  fromPhone: "+15551234567",
  leadId: "lead1",
  campaignId: "camp1",
  inboundMessageId: "m1",
};

describe("inbound compliance pipeline", () => {
  it("detects opt-out keywords", () => {
    expect(classifyInbound("stop texting me, this is harassment").isOptOut).toBe(true);
    expect(classifyInbound("HELP").isHelp).toBe(true);
    expect(classifyInbound("sure, call me tomorrow").isOptOut).toBe(false);
  });

  it("STOP suppresses the phone and never runs the bot", async () => {
    const { db, upserts } = makeDb({ campaigns: [{ bot_enabled: true, bot_config: {}, regulated_vertical: false, brand_id: null }] });
    const send: Sender = vi.fn(async () => ({ status: "delivered", providerSid: "x" }));
    const out = await processInbound({ ...base, db, send, body: "stop texting me, this is harassment" });
    expect(out.optOut).toBe(true);
    expect(out.bot).toBe("skipped");
    expect(upserts.some((u) => u.table === "suppression")).toBe(true);
    // Only the opt-out confirmation may go out — never a bot reply.
    expect((send as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(1);
    expect(String((send as unknown as { mock: { calls: string[][] } }).mock.calls[0][2])).toContain("unsubscribed");
  });

  it("skips the bot when the number is already suppressed", async () => {
    const { db } = makeDb({
      campaigns: [{ bot_enabled: true, bot_config: {}, regulated_vertical: false, brand_id: null }],
      suppression: [{ phone: "+15551234567" }],
      messages: [],
    });
    const send: Sender = vi.fn(async () => ({ status: "delivered" }));
    const out = await processInbound({ ...base, db, send, body: "how much for a new roof?" });
    expect(out.bot).toBe("blocked");
    expect((send as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(0);
  });

  it("does nothing when the campaign bot is off", async () => {
    const { db } = makeDb({ campaigns: [{ bot_enabled: false }] });
    const send: Sender = vi.fn(async () => ({ status: "delivered" }));
    const out = await processInbound({ ...base, db, send, body: "interested" });
    expect(out.bot).toBe("disabled");
    expect((send as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(0);
  });
});
