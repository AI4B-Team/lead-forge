/**
 * Authoritative opt-out / suppression gate for EVERY outbound message path.
 *
 * TCPA: a contact who replied STOP, or a phone on the workspace suppression
 * list, must never be texted again — from the inbox composer, a campaign
 * runner, an auto-launched cadence, a slash command, or a bot reply.
 * The UI block is cosmetic; this is the real one.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Client = { from: (table: string) => any };

export const OPTOUT_ERROR = "Contact has opted out — message not sent";
export const SUPPRESSED_ERROR = "Number is on your suppression list — message not sent";

export type BlockReason = "opted_out" | "suppressed";

export type SendGate =
  | { ok: true; phone: string | null }
  | { ok: false; reason: BlockReason; message: string; phone: string | null };

export type GateTarget = {
  workspaceId: string;
  leadId?: string | null;
  threadKey?: string | null;
  phone?: string | null;
  /** Free-form context for the audit log (campaign id, "inbox", "cadence"). */
  source?: string;
  actorId?: string | null;
};

/** All plausible stored spellings of a US phone, for exact-match lookups. */
export function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  const set = new Set<string>([phone, digits, ten, `1${ten}`, `+1${ten}`]);
  if (ten.length === 10) {
    set.add(`(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`);
    set.add(`${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`);
  }
  return [...set].filter(Boolean);
}

/** Pre-load a workspace's suppression set once for batch sends (campaign ticks). */
export async function loadSuppressionSet(db: Client, workspaceId: string): Promise<Set<string>> {
  const { data } = await db.from("suppression").select("phone").eq("workspace_id", workspaceId);
  const set = new Set<string>();
  for (const row of (data ?? []) as Array<{ phone: string }>) {
    for (const v of phoneVariants(row.phone)) set.add(v);
  }
  return set;
}

/** Lead ids that have ever sent an opt-out in this workspace. */
export async function loadOptedOutLeadIds(db: Client, workspaceId: string): Promise<Set<string>> {
  const { data } = await db
    .from("messages")
    .select("lead_id")
    .eq("workspace_id", workspaceId)
    .eq("is_optout", true);
  return new Set(
    ((data ?? []) as Array<{ lead_id: string | null }>).map((r) => r.lead_id).filter(Boolean) as string[],
  );
}

/** Non-throwing check. Resolves the phone from the lead when not supplied. */
export async function checkCanText(db: Client, t: GateTarget): Promise<SendGate> {
  let phone = t.phone ?? null;
  if (!phone && t.leadId) {
    const { data } = await db.from("leads").select("phone").eq("id", t.leadId).maybeSingle();
    phone = (data as { phone: string | null } | null)?.phone ?? null;
  }

  // 1. Did this contact reply STOP? (thread- and lead-scoped)
  if (t.leadId || t.threadKey) {
    let q = db.from("messages").select("id").eq("workspace_id", t.workspaceId).eq("is_optout", true).limit(1);
    q = t.leadId ? q.eq("lead_id", t.leadId) : q.eq("thread_key", t.threadKey as string);
    const { data } = await q;
    if ((data ?? []).length > 0) {
      return { ok: false, reason: "opted_out", message: OPTOUT_ERROR, phone };
    }
  }

  // 2. Workspace suppression list (STOP auto-adds, blacklist, uploaded files).
  if (phone) {
    const { data } = await db
      .from("suppression")
      .select("phone")
      .eq("workspace_id", t.workspaceId)
      .in("phone", phoneVariants(phone))
      .limit(1);
    if ((data ?? []).length > 0) {
      return { ok: false, reason: "suppressed", message: SUPPRESSED_ERROR, phone };
    }
  }

  return { ok: true, phone };
}

/** Auditable record of a refused send. Never throws. */
export async function logBlockedSend(
  db: Client,
  t: GateTarget,
  gate: Extract<SendGate, { ok: false }>,
): Promise<void> {
  try {
    await db.from("events").insert({
      workspace_id: t.workspaceId,
      type: "send_blocked",
      payload: {
        reason: gate.reason,
        phone: gate.phone,
        lead_id: t.leadId ?? null,
        thread_key: t.threadKey ?? null,
        source: t.source ?? "unknown",
        actor_id: t.actorId ?? null,
        blocked_at: new Date().toISOString(),
      },
    });
  } catch {
    /* audit logging must never break the refusal itself */
  }
  console.warn(
    `[compliance] blocked send (${gate.reason}) source=${t.source ?? "unknown"} lead=${t.leadId ?? "-"} thread=${t.threadKey ?? "-"}`,
  );
}

/** Authoritative gate: logs the attempt and throws when the send is illegal. */
export async function assertCanText(db: Client, t: GateTarget): Promise<{ phone: string | null }> {
  const gate = await checkCanText(db, t);
  if (!gate.ok) {
    await logBlockedSend(db, t, gate);
    throw new Error(gate.message);
  }
  return { phone: gate.phone };
}
