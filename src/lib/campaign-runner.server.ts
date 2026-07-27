// Server-only campaign runner used by the cron webhook. Duplicates the core
// dispatch logic from tickCampaign but runs under the service role so pg_cron
// can drive it without a user session.

import { isWithinTcpaWindow } from "@/lib/tcpa";

type SendWindow = { quiet_start?: string; quiet_end?: string };

function hhmm(d: Date) {
  return d.toTimeString().slice(0, 5);
}

function inQuietHours(now: Date, win: SendWindow | null | undefined) {
  if (!win?.quiet_start || !win?.quiet_end) return false;
  const cur = hhmm(now);
  const { quiet_start: qs, quiet_end: qe } = win;
  if (qs > qe) return cur >= qs || cur < qe;
  return cur >= qs && cur < qe;
}

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
    .select("id, workspace_id, list_job_id, status, daily_cap, send_window")
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
}): Promise<{ dispatched: number; reason: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!campaign.list_job_id) return { dispatched: 0, reason: "no_list" };

  const { data: reg } = await supabaseAdmin
    .from("registrations").select("campaign_status").eq("workspace_id", campaign.workspace_id).maybeSingle();
  if (reg?.campaign_status !== "approved") return { dispatched: 0, reason: "10dlc_not_approved" };

  if (inQuietHours(new Date(), campaign.send_window as SendWindow | null)) {
    return { dispatched: 0, reason: "quiet_hours" };
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

  const { data: sup } = await supabaseAdmin
    .from("suppression").select("phone").eq("workspace_id", campaign.workspace_id);
  const suppressed = new Set((sup ?? []).map((r) => r.phone));

  const { data: prevMsgs } = await supabaseAdmin
    .from("messages").select("lead_id").eq("campaign_id", campaign.id).eq("direction", "outbound");
  const messaged = new Set((prevMsgs ?? []).map((m) => m.lead_id).filter(Boolean) as string[]);

  const take = Math.min(remainingCap, 50);
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

  const toSend = leads
    .filter((l) => l.phone && !suppressed.has(l.phone) && !messaged.has(l.id))
    // TCPA: skip any recipient currently outside their local 8am–9pm window.
    // They'll be picked up on a later tick when their local time is legal.
    .filter((l) => isWithinTcpaWindow(l.phone as string))
    .slice(0, take);

  const provider = isProviderConfigured() ? getProvider() : null;
  let dispatched = 0;

  for (const lead of toSend) {
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

  if (toSend.length < take) {
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