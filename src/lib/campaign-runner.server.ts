// Server-only campaign runner used by the cron webhook. Duplicates the core
// dispatch logic from tickCampaign but runs under the service role so pg_cron
// can drive it without a user session.

import {
  canMessageRecipient,
  canStartNewDropForRecipient,
  inQuietHoursEverywhere,
} from "@/lib/tcpa";

type SendWindow = { quiet_start?: string; quiet_end?: string };

function renderTemplate(body: string, lead: Record<string, unknown>): string {
  return body.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_, key: string) => {
    const v = lead[key];
    return v == null ? "" : String(v);
  });
}

export async function tickAllSendingCampaigns() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: campaigns } = await supabaseAdmin
    .from("campaigns")
    .select("id, workspace_id, list_job_id, status, daily_cap, send_window, drop_size")
    .eq("status", "sending");

  const results: Array<{ campaignId: string; dispatched: number; reason: string }> = [];

  for (const campaign of campaigns ?? []) {
    const r = await tickOne(campaign);
    results.push({ campaignId: campaign.id, ...r });
  }

  return { ok: true, ticked: results.length, results };
}

async function tickOne(campaign: {
  id: string;
  workspace_id: string;
  list_job_id: string | null;
  daily_cap: number | null;
  send_window: unknown;
  drop_size?: number | null;
}): Promise<{ dispatched: number; reason: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!campaign.list_job_id) return { dispatched: 0, reason: "no_list" };

  const { data: reg } = await supabaseAdmin
    .from("registrations").select("campaign_status").eq("workspace_id", campaign.workspace_id).maybeSingle();
  if (reg?.campaign_status !== "approved") return { dispatched: 0, reason: "10dlc_not_approved" };

  if (inQuietHours(new Date(), campaign.send_window as SendWindow | null)) {
    return { dispatched: 0, reason: "quiet_hours" };
  }

  // Workspace-level monthly SMS cap (super admin can set this to keep comped
  // accounts safe). null = unlimited.
  const { data: ws } = await supabaseAdmin
    .from("workspaces").select("monthly_sms_cap").eq("id", campaign.workspace_id).maybeSingle();
  const monthlyCap = (ws as { monthly_sms_cap: number | null } | null)?.monthly_sms_cap ?? null;
  let remainingMonthly = Number.POSITIVE_INFINITY;
  if (typeof monthlyCap === "number") {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const { count: sentMonth } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", campaign.workspace_id)
      .eq("direction", "outbound")
      .gte("created_at", monthStart.toISOString());
    remainingMonthly = Math.max(0, monthlyCap - (sentMonth ?? 0));
    if (remainingMonthly === 0) return { dispatched: 0, reason: "monthly_cap_reached" };
  }

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { count: sentToday } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)
    .eq("direction", "outbound")
    .gte("created_at", startOfDay.toISOString());
  const cap = campaign.daily_cap ?? 500;
  const remainingCap = Math.max(0, cap - (sentToday ?? 0));
  if (remainingCap === 0) return { dispatched: 0, reason: "daily_cap_reached" };

  const { data: steps } = await supabaseAdmin
    .from("campaign_steps").select("*").eq("campaign_id", campaign.id).order("step_order");
  if (!steps?.length) return { dispatched: 0, reason: "no_steps" };
  const step1 = steps[0] as { message_variants: string[] };

  const { data: numbers } = await supabaseAdmin
    .from("sending_numbers")
    .select("id, phone, status, health_score, activated_at")
    .eq("workspace_id", campaign.workspace_id)
    .in("status", ["active"])
    .order("health_score", { ascending: false });
  if (!numbers?.length) return { dispatched: 0, reason: "no_numbers" };

  // Warmup-aware per-number daily cap (Section 2 of the Telnyx spec).
  const { warmupCap, getProvider, isProviderConfigured } = await import("@/lib/sms");
  const startOfDayIso = startOfDay.toISOString();
  const numberState = new Map<
    string,
    { phone: string; sentToday: number; cap: number }
  >();
  for (const n of numbers) {
    const { count } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sending_number_id", n.id)
      .eq("direction", "outbound")
      .gte("created_at", startOfDayIso);
    numberState.set(n.id, {
      phone: n.phone,
      sentToday: count ?? 0,
      cap: warmupCap(n.activated_at ?? new Date()),
    });
  }

  // Single source of truth for opt-out / suppression (see optout.server.ts).
  const { loadSuppressionSet, loadOptedOutLeadIds, logBlockedSend } = await import("@/lib/optout.server");
  const suppressed = await loadSuppressionSet(supabaseAdmin, campaign.workspace_id);
  const optedOut = await loadOptedOutLeadIds(supabaseAdmin, campaign.workspace_id);

  const { data: prevMsgs } = await supabaseAdmin
    .from("messages").select("lead_id").eq("campaign_id", campaign.id).eq("direction", "outbound");
  const messaged = new Set((prevMsgs ?? []).map((m) => m.lead_id).filter(Boolean) as string[]);

  // Drop gating: first touches only go out inside a scheduled, due drop and
  // only up to that drop's remaining size.
  const { data: dueDrops } = await supabaseAdmin
    .from("campaign_drops")
    .select("id, drop_index, size, sent_count, status, scheduled_at")
    .eq("campaign_id", campaign.id)
    .in("status", ["pending", "sending"])
    .lte("scheduled_at", new Date().toISOString())
    .order("drop_index")
    .limit(1);
  const activeDrop = dueDrops?.[0] ?? null;
  const { count: totalDrops } = await supabaseAdmin
    .from("campaign_drops")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id);
  if ((totalDrops ?? 0) > 0 && !activeDrop) return { dispatched: 0, reason: "no_drop_due" };
  const dropRoom = activeDrop
    ? Math.max(0, (activeDrop.size ?? 0) - (activeDrop.sent_count ?? 0))
    : Number.POSITIVE_INFINITY;
  if (dropRoom === 0) return { dispatched: 0, reason: "drop_complete" };

  const take = Math.min(remainingCap, remainingMonthly, dropRoom, 50);
  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, full_name, phone, city, state, address")
    .eq("job_id", campaign.list_job_id)
    .eq("scrub_status", "clean")
    .limit(take * 4);
  if (!leads?.length) {
    await supabaseAdmin.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);
    return { dispatched: 0, reason: "list_exhausted" };
  }

  const blocked: Array<{ id: string; phone: string; reason: "opted_out" | "suppressed" }> = [];
  const toSend = leads
    .filter((l) => {
      if (!l.phone) return false;
      if (optedOut.has(l.id)) {
        blocked.push({ id: l.id, phone: l.phone, reason: "opted_out" });
        return false;
      }
      if (suppressed.has(l.phone) || suppressed.has(l.phone.replace(/\D/g, ""))) {
        blocked.push({ id: l.id, phone: l.phone, reason: "suppressed" });
        return false;
      }
      return !messaged.has(l.id);
    })
    // TCPA: skip any recipient currently outside their local 8am–9pm window.
    // They'll be picked up on a later tick when their local time is legal.
    .filter((l) => isWithinTcpaWindow(l.phone as string))
    // 6pm rule: never START a first touch after 6pm recipient local time.
    .filter((l) => canStartNewDrop(l.phone as string))
    .slice(0, take);

  for (const b of blocked.slice(0, 50)) {
    await logBlockedSend(
      supabaseAdmin,
      { workspaceId: campaign.workspace_id, leadId: b.id, source: `campaign_runner:${campaign.id}` },
      { ok: false, reason: b.reason, message: "blocked", phone: b.phone },
    );
  }

  const provider = isProviderConfigured() ? getProvider() : null;
  let dispatched = 0;

  for (const lead of toSend) {
    // Final per-recipient re-check: an inbound STOP can land mid-batch.
    const { assertCanText } = await import("@/lib/optout.server");
    try {
      await assertCanText(supabaseAdmin, {
        workspaceId: campaign.workspace_id,
        leadId: lead.id,
        phone: lead.phone,
        source: `campaign_runner:${campaign.id}`,
      });
    } catch {
      continue;
    }
    // Pick the healthiest number that still has warmup headroom.
    const num = numbers.find((n) => {
      const s = numberState.get(n.id)!;
      return s.sentToday < s.cap;
    });
    if (!num) break; // whole pool capped for today
    const state = numberState.get(num.id)!;

    const variants = step1.message_variants;
    const template = variants[Math.floor(Math.random() * variants.length)];
    const first_name = (lead.full_name ?? "").trim().split(/\s+/)[0] ?? "there";
    const body = renderTemplate(template, { ...lead, first_name });

    let providerSid: string | null = null;
    let status = "sent";
    if (provider && lead.phone) {
      try {
        const r = await provider.send(state.phone, lead.phone, body);
        providerSid = r.providerSid;
        status = r.status || "sent";
      } catch (e) {
        status = "failed";
        await supabaseAdmin.from("messages").insert({
          workspace_id: campaign.workspace_id,
          campaign_id: campaign.id,
          lead_id: lead.id,
          sending_number_id: num.id,
          direction: "outbound",
          status: "failed",
          body,
          error_code: (e as Error).message.slice(0, 200),
        } as never);
        continue;
      }
    } else {
      // Stub mode — mark as delivered so demo UI progresses.
      status = "delivered";
    }

    await supabaseAdmin.from("messages").insert({
      workspace_id: campaign.workspace_id,
      campaign_id: campaign.id,
      lead_id: lead.id,
      sending_number_id: num.id,
      direction: "outbound",
      status,
      body,
      provider_sid: providerSid,
    } as never);
    state.sentToday += 1;
    dispatched += 1;
  }

  if (activeDrop && dispatched > 0) {
    const nextSent = (activeDrop.sent_count ?? 0) + dispatched;
    await supabaseAdmin
      .from("campaign_drops")
      .update({
        sent_count: nextSent,
        status: nextSent >= (activeDrop.size ?? 0) ? "complete" : "sending",
      })
      .eq("id", activeDrop.id);
  }

  if (!activeDrop && toSend.length < take) {
    await supabaseAdmin.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);
  }

  // Health scoring: recompute opt-out rate per number and auto-cool/retire.
  for (const n of numbers) {
    const { count: sent } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sending_number_id", n.id)
      .eq("direction", "outbound");
    const { count: opts } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sending_number_id", n.id)
      .eq("is_optout", true);
    if (!sent) continue;
    const rate = (opts ?? 0) / sent;
    const nextStatus = rate >= 0.08 ? "retired" : rate >= 0.05 ? "cooling" : n.status;
    await supabaseAdmin
      .from("sending_numbers")
      .update({
        optout_rate: rate,
        health_score: Math.max(0, Math.round(100 - rate * 1000)),
        status: nextStatus,
      })
      .eq("id", n.id);
  }

  return { dispatched, reason: dispatched ? "ok" : "no_eligible_leads" };
}