import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// List of conversation threads for a workspace. One row per unique thread_key,
// annotated with the last message body, direction, timestamp, and unread count.
export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      filter: z.enum(["all", "unread", "optouts"]).default("all"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Pull the most recent messages then reduce to threads in JS. Postgrest
    // can't do a DISTINCT ON via the JS client cleanly.
    let q = context.supabase
      .from("messages")
      .select("id, thread_key, direction, body, created_at, read_at, is_optout, lead_id, sending_number_id")
      .eq("workspace_id", data.workspaceId)
      .not("thread_key", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.filter === "optouts") q = q.eq("is_optout", true);
    const { data: rows, error } = await q;
    if (error) throw error;

    type Row = NonNullable<typeof rows>[number];
    const byThread = new Map<string, {
      thread_key: string;
      last_body: string | null;
      last_direction: string;
      last_at: string;
      unread: number;
      is_optout: boolean;
      lead_id: string | null;
    }>();
    for (const r of (rows ?? []) as Row[]) {
      if (!r.thread_key) continue;
      const cur = byThread.get(r.thread_key);
      if (!cur) {
        byThread.set(r.thread_key, {
          thread_key: r.thread_key,
          last_body: r.body,
          last_direction: r.direction,
          last_at: r.created_at,
          unread: r.direction === "inbound" && !r.read_at ? 1 : 0,
          is_optout: !!r.is_optout,
          lead_id: r.lead_id ?? null,
        });
      } else {
        if (r.direction === "inbound" && !r.read_at) cur.unread += 1;
        if (r.is_optout) cur.is_optout = true;
      }
    }

    let threads = Array.from(byThread.values());
    if (data.filter === "unread") threads = threads.filter((t) => t.unread > 0);

    // Enrich with lead + phone via a second targeted select.
    const leadIds = threads.map((t) => t.lead_id).filter((v): v is string => !!v);
    const leads = leadIds.length
      ? (await context.supabase.from("leads").select("id, full_name, phone, city, state").in("id", leadIds)).data ?? []
      : [];
    const leadMap = new Map(leads.map((l) => [l.id, l]));

    return {
      threads: threads.map((t) => ({
        ...t,
        lead: t.lead_id ? leadMap.get(t.lead_id) ?? null : null,
      })),
    };
  });

// Full message list for one thread, plus lead detail.
export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      threadKey: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: messages, error } = await context.supabase
      .from("messages")
      .select("id, direction, body, status, created_at, is_optout, provider_sid, sending_number_id, lead_id, error_code")
      .eq("workspace_id", data.workspaceId)
      .eq("thread_key", data.threadKey)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const leadId = messages?.find((m) => m.lead_id)?.lead_id ?? null;
    const numberId = messages?.find((m) => m.sending_number_id)?.sending_number_id ?? null;
    const [lead, number] = await Promise.all([
      leadId
        ? context.supabase.from("leads").select("id, full_name, phone, email, city, state, address").eq("id", leadId).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
      numberId
        ? context.supabase.from("sending_numbers").select("id, phone").eq("id", numberId).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
    ]);

    return { messages: messages ?? [], lead, number };
  });

// Mark all inbound messages in a thread as read.
export const markThreadRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      threadKey: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("workspace_id", data.workspaceId)
      .eq("thread_key", data.threadKey)
      .eq("direction", "inbound")
      .is("read_at", null);
    if (error) throw error;
    return { ok: true };
  });

// Send a manual reply within a thread. Uses the most recent sending number
// used in the thread; falls back to the healthiest active number.
export const sendReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      threadKey: z.string().min(1),
      body: z.string().min(1).max(1600),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("messages")
      .select("lead_id, sending_number_id")
      .eq("workspace_id", data.workspaceId)
      .eq("thread_key", data.threadKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!existing) throw new Error("Thread not found");

    const { data: lead } = existing.lead_id
      ? await context.supabase.from("leads").select("phone").eq("id", existing.lead_id).maybeSingle()
      : { data: null };
    const toPhone = lead?.phone;
    if (!toPhone) throw new Error("No phone on lead");

    let fromNumber = existing.sending_number_id
      ? (await context.supabase.from("sending_numbers").select("id, phone").eq("id", existing.sending_number_id).maybeSingle()).data
      : null;
    if (!fromNumber) {
      fromNumber = (await context.supabase
        .from("sending_numbers")
        .select("id, phone")
        .eq("workspace_id", data.workspaceId)
        .eq("status", "active")
        .order("health_score", { ascending: false })
        .limit(1)
        .maybeSingle()).data;
    }
    if (!fromNumber) throw new Error("No active sending number");

    const { isProviderConfigured, getProvider } = await import("@/lib/sms");
    let providerSid: string | null = null;
    let status = "sent";
    if (isProviderConfigured()) {
      const r = await getProvider().send(fromNumber.phone, toPhone, data.body);
      providerSid = r.providerSid;
      status = r.status || "sent";
    }

    const { error } = await context.supabase.from("messages").insert({
      workspace_id: data.workspaceId,
      lead_id: existing.lead_id,
      sending_number_id: fromNumber.id,
      direction: "outbound",
      body: data.body,
      status,
      provider_sid: providerSid,
      thread_key: data.threadKey,
    });
    if (error) throw error;
    return { ok: true, status };
  });

// Small badge counter for the sidebar.
export const unreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", data.workspaceId)
      .eq("direction", "inbound")
      .is("read_at", null);
    return { count: count ?? 0 };
  });