import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { spinOnce } from "@/lib/spintax";

type SendWindow = { quiet_start?: string; quiet_end?: string };

// Returns "HH:MM" for a Date in the workspace's local TZ (assume ET default).
function hhmm(d: Date) {
  return d.toTimeString().slice(0, 5);
}

function inQuietHours(now: Date, win: SendWindow | null | undefined) {
  if (!win?.quiet_start || !win?.quiet_end) return false;
  const cur = hhmm(now);
  const { quiet_start: qs, quiet_end: qe } = win;
  // Overnight window: e.g. 21:00 -> 09:00
  if (qs > qe) return cur >= qs || cur < qe;
  return cur >= qs && cur < qe;
}

function renderTemplate(body: string, lead: Record<string, unknown>): string {
  return body.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_, key: string) => {
    const v = lead[key];
    return v == null ? "" : String(v);
  });
}

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("id, name, status, daily_cap, send_window, list_job_id, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Aggregate message stats per campaign.
    const ids = (campaigns ?? []).map((c) => c.id);
    const stats: Record<string, { sent: number; replies: number; optOuts: number; recipients: number }> = {};
    for (const id of ids) stats[id] = { sent: 0, replies: 0, optOuts: 0, recipients: 0 };

    if (ids.length) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("campaign_id, direction, is_optout")
        .in("campaign_id", ids);
      for (const m of msgs ?? []) {
        const s = stats[m.campaign_id!];
        if (!s) continue;
        if (m.direction === "outbound") s.sent += 1;
        if (m.direction === "inbound") s.replies += 1;
        if (m.is_optout) s.optOuts += 1;
      }

      // Recipient counts from linked list_job_id (clean leads).
      for (const c of campaigns ?? []) {
        if (!c.list_job_id) continue;
        const { count } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("job_id", c.list_job_id)
          .eq("scrub_status", "clean");
        stats[c.id].recipients = count ?? 0;
      }
    }

    return { campaigns: campaigns ?? [], stats };
  });

export const getCampaignDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ campaignId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (error || !campaign) throw new Error("Campaign Not Found");

    const { data: steps } = await supabase
      .from("campaign_steps")
      .select("*")
      .eq("campaign_id", data.campaignId)
      .order("step_order", { ascending: true });

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, direction, body, status, is_optout, created_at")
      .eq("campaign_id", data.campaignId)
      .order("created_at", { ascending: false })
      .limit(50);

    let sent = 0, replies = 0, optOuts = 0, delivered = 0;
    for (const m of msgs ?? []) {
      if (m.direction === "outbound") sent += 1;
      if (m.direction === "inbound") replies += 1;
      if (m.is_optout) optOuts += 1;
      if (m.status === "delivered") delivered += 1;
    }

    let recipients = 0;
    if (campaign.list_job_id) {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("job_id", campaign.list_job_id)
        .eq("scrub_status", "clean");
      recipients = count ?? 0;
    }

    return { campaign, steps: steps ?? [], recentMessages: msgs ?? [], stats: { sent, replies, optOuts, delivered, recipients } };
  });

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignId: z.string().uuid(),
      status: z.enum(["draft", "sending", "paused", "completed"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // If transitioning to sending, enforce 10DLC gate.
    if (data.status === "sending") {
      const { data: c } = await context.supabase
        .from("campaigns").select("workspace_id").eq("id", data.campaignId).maybeSingle();
      if (!c) throw new Error("Campaign Not Found");
      const { data: reg } = await context.supabase
        .from("registrations").select("campaign_status").eq("workspace_id", c.workspace_id).maybeSingle();
      if (reg?.campaign_status !== "approved") {
        throw new Error("10DLC Registration Must Be Approved Before Sending.");
      }
    }
    const { error } = await context.supabase
      .from("campaigns")
      .update({ status: data.status })
      .eq("id", data.campaignId);
    if (error) throw error;
    return { ok: true };
  });

export const updateCampaignConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignId: z.string().uuid(),
      daily_cap: z.number().int().min(1).max(50000).optional(),
      quiet_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      quiet_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      steps: z
        .array(z.object({
          step_order: z.number().int().min(1).max(10),
          delay_minutes: z.number().int().min(0).max(60 * 24 * 30),
          message_variants: z.array(z.string().min(1).max(320)).min(1).max(5),
        }))
        .optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { daily_cap?: number; send_window?: { quiet_start: string; quiet_end: string } } = {};
    if (typeof data.daily_cap === "number") patch.daily_cap = data.daily_cap;
    if (data.quiet_start || data.quiet_end) {
      patch.send_window = { quiet_start: data.quiet_start ?? "21:00", quiet_end: data.quiet_end ?? "09:00" };
    }
    if (Object.keys(patch).length) {
      const { error } = await context.supabase.from("campaigns").update(patch).eq("id", data.campaignId);
      if (error) throw error;
    }
    if (data.steps) {
      await context.supabase.from("campaign_steps").delete().eq("campaign_id", data.campaignId);
      await context.supabase.from("campaign_steps").insert(
        data.steps.map((s) => ({ campaign_id: data.campaignId, ...s })),
      );
    }
    return { ok: true };
  });

// Runner: dispatch up to `batchSize` outbound messages for a single campaign.
// Enforces 10DLC gate, daily cap, quiet hours, suppression list, and round-robin
// sending-number rotation. Uses a mock provider (writes messages rows only) --
// real providers plug in via the `sendVia` step below.
export const tickCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignId: z.string().uuid(),
      batchSize: z.number().int().min(1).max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const batch = data.batchSize ?? 50;

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, workspace_id, list_job_id, status, daily_cap, send_window")
      .eq("id", data.campaignId).maybeSingle();
    if (!campaign) throw new Error("Campaign Not Found");
    if (campaign.status !== "sending") return { dispatched: 0, reason: "not_sending" };
    if (!campaign.list_job_id) return { dispatched: 0, reason: "no_list" };

    // 10DLC gate
    const { data: reg } = await supabase
      .from("registrations").select("campaign_status").eq("workspace_id", campaign.workspace_id).maybeSingle();
    if (reg?.campaign_status !== "approved") return { dispatched: 0, reason: "10dlc_not_approved" };

    // Quiet hours
    if (inQuietHours(new Date(), campaign.send_window as SendWindow | null)) {
      return { dispatched: 0, reason: "quiet_hours" };
    }

    // Daily cap: today's outbound count for this campaign
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const { count: sentToday } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("direction", "outbound")
      .gte("created_at", startOfDay.toISOString());
    const cap = campaign.daily_cap ?? 500;
    const remainingCap = Math.max(0, cap - (sentToday ?? 0));
    if (remainingCap === 0) return { dispatched: 0, reason: "daily_cap_reached" };

    // Steps
    const { data: steps } = await supabase
      .from("campaign_steps").select("*").eq("campaign_id", campaign.id).order("step_order");
    if (!steps?.length) return { dispatched: 0, reason: "no_steps" };
    const step1 = steps[0];

    // Active sending numbers (healthy)
    const { data: numbers } = await supabase
      .from("sending_numbers")
      .select("id, phone, status, health_score")
      .eq("workspace_id", campaign.workspace_id)
      .in("status", ["active"])
      .order("health_score", { ascending: false });
    if (!numbers?.length) return { dispatched: 0, reason: "no_numbers" };

    // Suppression phones
    const { data: sup } = await supabase
      .from("suppression").select("phone").eq("workspace_id", campaign.workspace_id);
    const suppressed = new Set((sup ?? []).map((r) => r.phone));

    // Already messaged lead ids for this campaign (touch 1 dedup)
    const { data: prevMsgs } = await supabase
      .from("messages").select("lead_id").eq("campaign_id", campaign.id).eq("direction", "outbound");
    const messaged = new Set((prevMsgs ?? []).map((m) => m.lead_id).filter(Boolean) as string[]);

    // Fetch next clean leads to send (limit conservatively; filter suppressed/messaged in-app)
    const take = Math.min(remainingCap, batch);
    const { data: leads } = await supabase
      .from("leads")
      .select("id, full_name, phone, city, state, address")
      .eq("job_id", campaign.list_job_id)
      .eq("scrub_status", "clean")
      .limit(take * 4);
    if (!leads?.length) {
      await supabase.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);
      return { dispatched: 0, reason: "list_exhausted" };
    }

    const toSend = leads.filter((l) => l.phone && !suppressed.has(l.phone) && !messaged.has(l.id)).slice(0, take);

    let dispatched = 0;
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < toSend.length; i++) {
      const lead = toSend[i];
      const num = numbers[i % numbers.length];
      const variants = step1.message_variants;
      const template = variants[Math.floor(Math.random() * variants.length)];
      const first_name = (lead.full_name ?? "").trim().split(/\s+/)[0] ?? "there";
      const spun = spinOnce(template);
      const body = renderTemplate(spun, { ...lead, first_name });
      rows.push({
        workspace_id: campaign.workspace_id,
        campaign_id: campaign.id,
        lead_id: lead.id,
        sending_number_id: num.id,
        direction: "outbound",
        status: "delivered", // mock provider — replace with "queued" when real provider is wired
        body,
      });
      dispatched += 1;
    }

    if (rows.length) {
      const { error } = await supabase.from("messages").insert(rows as never);
      if (error) throw error;
    }

    // If nothing left after this batch, complete campaign.
    if (toSend.length < take) {
      await supabase.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);
    }

    return { dispatched, reason: dispatched ? "ok" : "no_eligible_leads" };
  });

// Handle an inbound reply: append message row, mark opt-out + suppression on STOP.
export const recordInbound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignId: z.string().uuid(),
      leadId: z.string().uuid(),
      body: z.string().min(1).max(1600),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: campaign } = await supabase
      .from("campaigns").select("workspace_id").eq("id", data.campaignId).maybeSingle();
    if (!campaign) throw new Error("Campaign Not Found");
    const { data: lead } = await supabase
      .from("leads").select("phone").eq("id", data.leadId).maybeSingle();

    const isOptOut = /^\s*(stop|unsubscribe|quit|cancel|end|remove)\b/i.test(data.body);
    await supabase.from("messages").insert({
      workspace_id: campaign.workspace_id,
      campaign_id: data.campaignId,
      lead_id: data.leadId,
      direction: "inbound",
      body: data.body,
      is_optout: isOptOut,
      status: "received",
    } as never);

    if (isOptOut && lead?.phone) {
      await supabase.from("suppression").upsert({
        workspace_id: campaign.workspace_id,
        phone: lead.phone,
        reason: "user_optout",
      } as never);
    }

    return { ok: true, optOut: isOptOut };
  });