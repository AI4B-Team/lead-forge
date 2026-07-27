import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// 30-day rollup: outbound sent, delivered, replies, opt-outs bucketed by day.
// Also returns per-campaign funnels and per-number health.
export const getWorkspaceAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      days: z.number().int().min(7).max(90).default(30),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const sinceIso = since.toISOString();

    const { data: msgs, error } = await context.supabase
      .from("messages")
      .select("direction, status, is_optout, created_at, sending_number_id, campaign_id")
      .eq("workspace_id", data.workspaceId)
      .gte("created_at", sinceIso);
    if (error) throw error;

    // Daily buckets
    const daily = new Map<string, { day: string; sent: number; delivered: number; replies: number; optOuts: number }>();
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      daily.set(key, { day: key, sent: 0, delivered: 0, replies: 0, optOuts: 0 });
    }
    for (const m of msgs ?? []) {
      const key = (m.created_at ?? "").slice(0, 10);
      const bucket = daily.get(key);
      if (!bucket) continue;
      if (m.direction === "outbound") bucket.sent += 1;
      if (m.status === "delivered") bucket.delivered += 1;
      if (m.direction === "inbound") bucket.replies += 1;
      if (m.is_optout) bucket.optOuts += 1;
    }

    // Totals
    const totals = { sent: 0, delivered: 0, replies: 0, optOuts: 0 };
    for (const b of daily.values()) {
      totals.sent += b.sent;
      totals.delivered += b.delivered;
      totals.replies += b.replies;
      totals.optOuts += b.optOuts;
    }
    const replyRate = totals.sent ? totals.replies / totals.sent : 0;
    const deliverRate = totals.sent ? totals.delivered / totals.sent : 0;
    const optOutRate = totals.sent ? totals.optOuts / totals.sent : 0;

    // Per-campaign funnel
    const campaignAgg = new Map<string, { sent: number; delivered: number; replies: number; optOuts: number }>();
    for (const m of msgs ?? []) {
      if (!m.campaign_id) continue;
      const cur = campaignAgg.get(m.campaign_id) ?? { sent: 0, delivered: 0, replies: 0, optOuts: 0 };
      if (m.direction === "outbound") cur.sent += 1;
      if (m.status === "delivered") cur.delivered += 1;
      if (m.direction === "inbound") cur.replies += 1;
      if (m.is_optout) cur.optOuts += 1;
      campaignAgg.set(m.campaign_id, cur);
    }
    const campaignIds = Array.from(campaignAgg.keys());
    const { data: campRows } = campaignIds.length
      ? await context.supabase.from("campaigns").select("id, name, status").in("id", campaignIds)
      : { data: [] as { id: string; name: string; status: string | null }[] };
    const campaigns = (campRows ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status ?? "draft",
      ...(campaignAgg.get(c.id) ?? { sent: 0, delivered: 0, replies: 0, optOuts: 0 }),
    })).sort((a, b) => b.sent - a.sent).slice(0, 10);

    // Per-number health snapshot
    const { data: numbers } = await context.supabase
      .from("sending_numbers")
      .select("id, phone, status, health_score, activated_at")
      .eq("workspace_id", data.workspaceId)
      .order("health_score", { ascending: false })
      .limit(20);

    return {
      daily: Array.from(daily.values()),
      totals,
      rates: { replyRate, deliverRate, optOutRate },
      campaigns,
      numbers: numbers ?? [],
    };
  });