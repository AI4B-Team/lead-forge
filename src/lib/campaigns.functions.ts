import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { spinOnce } from "@/lib/spintax";
import { planDrops, estimateCost } from "@/lib/drops";
import {
  canMessageRecipient,
  canStartNewDropForRecipient,
  inQuietHoursEverywhere,
} from "@/lib/tcpa";
import { SCRUB_STALE_MESSAGE, isScrubStale, withStopFooter } from "@/lib/compliance-rules";
import { emptyStats, type CampaignStats } from "@/lib/campaign-stats";
import { TRUSTED_PROVENANCE } from "@/lib/provenance.shared";
import { channelEligibility } from "@/lib/contact-channels";

type SendWindow = { quiet_start?: string; quiet_end?: string };

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
      .select("id, name, status, daily_cap, send_window, list_job_id, created_at, tag_id, bot_enabled, drop_size")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: tagRows } = await supabase
      .from("tags")
      .select("id, name, color")
      .eq("workspace_id", data.workspaceId);
    const tags = Object.fromEntries((tagRows ?? []).map((t) => [t.id, t]));

    // Aggregate live activity per campaign — the campaigns grid reads as a
    // mini dashboard, so it needs conversation-level signal, not just counts.
    const ids = (campaigns ?? []).map((c) => c.id);
    const stats: Record<string, CampaignStats> = {};
    for (const id of ids) stats[id] = emptyStats();

    if (ids.length) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("campaign_id, lead_id, direction, is_optout, is_bot, handoff_reason, status, body, created_at")
        .in("campaign_id", ids)
        .order("created_at", { ascending: true });

      const threads: Record<string, Map<string, { lastDirection: string; aiTouched: boolean; needsHuman: boolean; replied: boolean }>> = {};
      for (const m of msgs ?? []) {
        const s = stats[m.campaign_id!];
        if (!s) continue;
        if (m.direction === "outbound") {
          s.sent += 1;
          if (m.status !== "failed" && m.status !== "undelivered") s.delivered += 1;
        }
        if (m.direction === "inbound") {
          s.replies += 1;
          if (!m.is_optout) {
            s.latestReply = { body: (m.body ?? "").slice(0, 220), at: m.created_at };
          }
        }
        if (m.is_optout) s.optOuts += 1;

        const key = m.lead_id ?? m.campaign_id!;
        const map = (threads[m.campaign_id!] ??= new Map());
        const t = map.get(key) ?? { lastDirection: "", aiTouched: false, needsHuman: false, replied: false };
        t.lastDirection = m.direction;
        if (m.is_bot) t.aiTouched = true;
        if (m.handoff_reason) t.needsHuman = true;
        if (m.direction === "inbound" && !m.is_optout) t.replied = true;
        map.set(key, t);
      }

      for (const [cid, map] of Object.entries(threads)) {
        const s = stats[cid];
        if (!s) continue;
        for (const t of map.values()) {
          if (t.replied) s.conversations += 1;
          if (t.aiTouched) s.aiChats += 1;
          if (t.needsHuman) s.needsHuman += 1;
          if (t.lastDirection === "inbound") s.awaiting += 1;
        }
      }

      // Recipient counts from linked list_job_id (clean leads).
      for (const c of campaigns ?? []) {
        if (!c.list_job_id) continue;
        const { count } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("job_id", c.list_job_id)
          .eq("scrub_status", "clean")
          .in("data_provenance", TRUSTED_PROVENANCE);
        stats[c.id].recipients = count ?? 0;
      }
    }

    for (const s of Object.values(stats)) {
      s.deliveryRate = s.sent ? Math.round((s.delivered / s.sent) * 100) : 0;
      s.replyRate = s.sent ? Math.round((s.replies / s.sent) * 1000) / 10 : 0;
      s.optOutRate = s.sent ? Math.round((s.optOuts / s.sent) * 1000) / 10 : 0;
      // Health blends deliverability, engagement headroom and opt-out drag.
      const engagement = Math.min(30, s.replyRate * 2);
      const drag = Math.min(30, s.optOutRate * 8);
      s.health = s.sent ? Math.max(5, Math.min(100, Math.round(s.deliveryRate * 0.7 + engagement - drag))) : 0;
    }

    return { campaigns: campaigns ?? [], stats, tags };
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

    const { data: drops } = await supabase
      .from("campaign_drops")
      .select("id, drop_index, scheduled_at, size, sent_count, status")
      .eq("campaign_id", data.campaignId)
      .order("drop_index", { ascending: true });

    const { data: tag } = campaign.tag_id
      ? await supabase.from("tags").select("id, name, color").eq("id", campaign.tag_id).maybeSingle()
      : { data: null };

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, direction, body, status, is_optout, is_bot, handoff_reason, created_at")
      .eq("campaign_id", data.campaignId)
      .order("created_at", { ascending: false })
      .limit(50);

    let sent = 0, replies = 0, optOuts = 0, delivered = 0, botHandled = 0, handoffs = 0;
    for (const m of msgs ?? []) {
      if (m.direction === "outbound") sent += 1;
      if (m.direction === "inbound") replies += 1;
      if (m.is_optout) optOuts += 1;
      if (m.status === "delivered") delivered += 1;
      if (m.is_bot) botHandled += 1;
      if (m.handoff_reason) handoffs += 1;
    }

    let recipients = 0;
    if (campaign.list_job_id) {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("job_id", campaign.list_job_id)
        .eq("scrub_status", "clean")
        .in("data_provenance", TRUSTED_PROVENANCE);
      recipients = count ?? 0;
    }

    return {
      campaign,
      tag,
      drops: drops ?? [],
      steps: steps ?? [],
      recentMessages: msgs ?? [],
      stats: { sent, replies, optOuts, delivered, recipients, botHandled, handoffs },
    };
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
    let launchedWorkspaceId: string | null = null;
    if (data.status === "sending") {
      const { data: c } = await context.supabase
        .from("campaigns").select("workspace_id").eq("id", data.campaignId).maybeSingle();
      if (!c) throw new Error("Campaign Not Found");
      const { data: reg } = await context.supabase
        .from("registrations").select("campaign_status").eq("workspace_id", c.workspace_id).maybeSingle();
      if (reg?.campaign_status !== "approved") {
        throw new Error("10DLC Registration Must Be Approved Before Sending.");
      }
      const { assertFreeTierAllows } = await import("./free-tier.server");
      await assertFreeTierAllows(context.supabase, c.workspace_id, { sendingSms: true });
      const { assertSpendAllowed } = await import("./accountability.server");
      await assertSpendAllowed(context.supabase, c.workspace_id, context.userId, {
        amount: 0,
        action: "launch_campaign",
        summary: "Launch Campaign",
      });
      launchedWorkspaceId = c.workspace_id;
    }
    const { error } = await context.supabase
      .from("campaigns")
      .update({ status: data.status })
      .eq("id", data.campaignId);
    if (error) throw error;
    if (launchedWorkspaceId) {
      const { emitEvent } = await import("./events.server");
      await emitEvent(context.supabase, launchedWorkspaceId, "campaign.launched", {
        campaign_id: data.campaignId,
      });
    }
    {
      const { data: c } = await context.supabase
        .from("campaigns").select("workspace_id, name").eq("id", data.campaignId).maybeSingle();
      if (c?.workspace_id) {
        const { logActivity } = await import("./activity.server");
        const label =
          data.status === "sending" ? "Launched" :
          data.status === "paused" ? "Paused" :
          data.status === "completed" ? "Completed" : "Moved To Draft";
        await logActivity(context.supabase, c.workspace_id, {
          type: data.status === "paused" ? "campaign_paused" : "campaign_launched",
          summary: `Campaign ${label} — ${c.name ?? "Untitled"}`,
          refId: data.campaignId,
          refType: "campaign",
          actorId: context.userId,
        });
      }
    }
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
      tag_id: z.string().uuid().nullable().optional(),
      brand_id: z.string().uuid().nullable().optional(),
      drop_size: z.number().int().min(50).max(5000).optional(),
      drop_times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(8).optional(),
      duplicate_policy: z.enum(["skip", "resend"]).optional(),
      steps: z
        .array(z.object({
          step_order: z.number().int().min(1).max(20),
          delay_minutes: z.number().int().min(0).max(60 * 24 * 30),
          message_variants: z.array(z.string().min(1).max(320)).min(1).max(5),
        }))
        .optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (typeof data.daily_cap === "number") patch.daily_cap = data.daily_cap;
    if (data.tag_id !== undefined) patch.tag_id = data.tag_id;
    if (data.brand_id !== undefined) patch.brand_id = data.brand_id;
    if (typeof data.drop_size === "number") patch.drop_size = data.drop_size;
    if (data.drop_times) patch.drop_times = data.drop_times;
    if (data.duplicate_policy) patch.duplicate_policy = data.duplicate_policy;
    if (data.quiet_start || data.quiet_end) {
      patch.send_window = { quiet_start: data.quiet_start ?? "21:00", quiet_end: data.quiet_end ?? "09:00" };
    }
    if (Object.keys(patch).length) {
      const { error } = await context.supabase.from("campaigns").update(patch as never).eq("id", data.campaignId);
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

// Review-screen cost preview: recipients x segments across every drip step,
// plus the drop plan (500-contact batches spread across the day) and how many
// duplicate phone numbers exist in the source list.
export const previewCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      jobId: z.string().uuid(),
      dropSize: z.number().int().min(50).max(5000).default(500),
      dropTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).default(["10:00", "12:00", "15:00", "17:00"]),
      bodies: z.array(z.string().max(2000)).default([]),
      startAt: z.string().optional(),
      instant: z.boolean().default(false),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: leads } = await context.supabase
      .from("leads")
      .select("phone, phone_type, email, address, scrub_status")
      .eq("job_id", data.jobId)
      .eq("scrub_status", "clean")
      .in("data_provenance", TRUSTED_PROVENANCE);
    const phones = (leads ?? []).map((l) => l.phone).filter((p): p is string => !!p);
    const unique = new Set(phones);
    const duplicates = phones.length - unique.size;

    // Channel eligibility: which contacts each outreach channel can actually
    // reach. SMS requires a mobile line; email and direct mail need their own
    // channel present.
    const eligibility = channelEligibility(
      (leads ?? []).map((l) => ({
        phone: l.phone,
        phone_type: l.phone_type,
        email: l.email,
        address: l.address,
        disposition: l.scrub_status,
      })),
    );

    const recipients = unique.size;
    const cost = estimateCost(recipients, data.bodies.map((b) => ({ message_variants: [b] })));
    const from = data.startAt ? new Date(data.startAt) : new Date();
    const drops = planDrops(recipients, data.dropSize, data.dropTimes, from, data.instant);
    return { recipients, duplicates, cost, drops, eligibility };
  });

// Materialize the drop schedule for a campaign.
export const scheduleCampaignDrops = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignId: z.string().uuid(),
      recipients: z.number().int().min(0),
      startAt: z.string().optional(),
      instant: z.boolean().default(false),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: campaign } = await context.supabase
      .from("campaigns")
      .select("id, workspace_id, drop_size, drop_times")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!campaign) throw new Error("Campaign Not Found");

    await context.supabase.from("campaign_drops").delete().eq("campaign_id", campaign.id);
    const from = data.startAt ? new Date(data.startAt) : new Date();
    const drops = planDrops(
      data.recipients,
      campaign.drop_size ?? 500,
      campaign.drop_times ?? undefined,
      from,
      data.instant,
    );
    if (drops.length) {
      const { error } = await context.supabase.from("campaign_drops").insert(
        drops.map((d) => ({
          workspace_id: campaign.workspace_id,
          campaign_id: campaign.id,
          drop_index: d.drop_index,
          scheduled_at: d.scheduled_at,
          size: d.size,
        })),
      );
      if (error) throw error;
    }
    return { drops: drops.length };
  });

// Runner: dispatch the next batch for a single campaign on user request.
// Delegates to the shared server-side runner so there is exactly ONE send path
// (10DLC gate, quiet hours, suppression, DNC, warmup caps, real carrier send).
export const tickCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignId: z.string().uuid(),
      batchSize: z.number().int().min(1).max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS check: the caller must be able to read this campaign in their workspace.
    const { data: campaign } = await context.supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!campaign) throw new Error("Campaign Not Found");
    if (campaign.status !== "sending") return { dispatched: 0, reason: "not_sending" };

    const { tickCampaignById } = await import("@/lib/campaign-runner.server");
    return tickCampaignById(data.campaignId);
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