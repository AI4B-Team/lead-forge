// 10DLC status reconciliation.
//
// Brand and campaign vetting are asynchronous at the carrier: submission returns
// PENDING and the verdict lands later. Nothing pushes that verdict to us, so we
// poll it — from the nightly tick for every submitted workspace, and on demand
// when a user opens the registration page.
import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient<any, any, any>;

export type RegStatus = "pending" | "submitted" | "approved" | "rejected";

/** Map whatever the carrier calls it onto our four-state model. */
export function normalizeRegStatus(raw: string | null | undefined, fallback: RegStatus): RegStatus {
  const s = (raw ?? "").toLowerCase();
  if (!s) return fallback;
  if (/approv|verified|active|complete/.test(s)) return "approved";
  if (/reject|fail|declin|unverified|suspend/.test(s)) return "rejected";
  if (/pending|review|submit/.test(s)) return "submitted";
  return fallback;
}

export type SyncResult = {
  workspaceId: string;
  brand_status: RegStatus;
  campaign_status: RegStatus;
  changed: boolean;
  error?: string;
};

/**
 * Poll the carrier for one workspace's registration and persist any transition.
 * `supabase` must be able to write the row (service role, or the member's own
 * client when called from the app).
 */
export async function syncRegistration(
  supabase: AnyClient,
  workspaceId: string,
): Promise<SyncResult> {
  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const prevBrand = (reg?.brand_status ?? "pending") as RegStatus;
  const prevCampaign = (reg?.campaign_status ?? "pending") as RegStatus;
  const base: SyncResult = {
    workspaceId,
    brand_status: prevBrand,
    campaign_status: prevCampaign,
    changed: false,
  };
  if (!reg) return base;

  const refs = (reg.provider_refs as Record<string, unknown> | null) ?? {};
  const brandId = (refs["brand_provider_id"] as string | undefined) ?? "";
  const campaignId = (refs["campaign_provider_id"] as string | undefined) ?? "";
  if (!brandId && !campaignId) return base;

  const { isProviderConfigured, getProvider } = await import("@/lib/sms");
  if (!isProviderConfigured()) return { ...base, error: "provider_not_configured" };
  const provider = getProvider();

  let brand = prevBrand;
  let campaign = prevCampaign;
  let detail: string | null = null;
  let error: string | undefined;

  if (brandId && provider.fetchBrandStatus) {
    try {
      const r = await provider.fetchBrandStatus(brandId);
      brand = normalizeRegStatus(r.status, prevBrand);
      detail = r.detail ?? detail;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  if (campaignId && provider.fetchCampaignStatus) {
    try {
      const r = await provider.fetchCampaignStatus(campaignId);
      campaign = normalizeRegStatus(r.status, prevCampaign);
      detail = r.detail ?? detail;
    } catch (e) {
      error = error ?? (e as Error).message;
    }
  }

  const changed = brand !== prevBrand || campaign !== prevCampaign;
  if (changed) {
    const nextRefs = {
      ...refs,
      ...(detail ? { last_provider_detail: detail } : {}),
      last_status_check_at: new Date().toISOString(),
    };
    const { error: upErr } = await supabase.from("registrations").upsert({
      workspace_id: workspaceId,
      brand_status: brand,
      campaign_status: campaign,
      provider_refs: nextRefs as never,
    });
    if (upErr) return { ...base, error: upErr.message };

    const { logActivity } = await import("./activity.server");
    if (brand !== prevBrand) {
      await logActivity(supabase, workspaceId, {
        type: "brand_status",
        summary: `10DLC Brand Status — ${brand.replace(/^./, (c) => c.toUpperCase())}`,
        detail,
        refType: "registration",
      });
      if (brand === "approved") {
        const { emitEvent } = await import("./events.server");
        await emitEvent(supabase, workspaceId, "brand.approved", {});
      }
    }
    if (campaign !== prevCampaign) {
      await logActivity(supabase, workspaceId, {
        type: "brand_status",
        summary: `10DLC Campaign Status — ${campaign.replace(/^./, (c) => c.toUpperCase())}`,
        detail,
        refType: "registration",
      });
    }
  }

  return { workspaceId, brand_status: brand, campaign_status: campaign, changed, ...(error ? { error } : {}) };
}

/** Nightly sweep: every workspace still waiting on a carrier verdict. */
export async function syncPendingRegistrations(): Promise<{
  ok: true;
  checked: number;
  changed: number;
  results: SyncResult[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("registrations")
    .select("workspace_id, brand_status, campaign_status")
    .or("brand_status.eq.submitted,campaign_status.eq.submitted")
    .limit(500);

  const results: SyncResult[] = [];
  for (const row of rows ?? []) {
    results.push(await syncRegistration(supabaseAdmin as unknown as AnyClient, row.workspace_id));
  }
  return {
    ok: true,
    checked: results.length,
    changed: results.filter((r) => r.changed).length,
    results,
  };
}
