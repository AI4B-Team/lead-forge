import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REGION_AREA_CODES: Record<"east" | "central" | "mountain" | "west", string[]> = {
  east: ["212", "215", "305", "404", "617", "813", "919"],
  central: ["214", "312", "615", "713", "816", "901"],
  mountain: ["303", "480", "505", "702", "801"],
  west: ["206", "310", "415", "503", "619", "702", "858"],
};

export const listNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sending_numbers")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { rows: rows ?? [] };
  });

export const buyNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      region: z.enum(["east", "central", "mountain", "west"]),
      quantity: z.number().int().min(1).max(20),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Provisioning stub — real Twilio/Telnyx purchase plugs in here. Generates
    // numbers with realistic area codes so the pool UI is exercised.
    const codes = REGION_AREA_CODES[data.region];
    const rows = Array.from({ length: data.quantity }, (_, i) => {
      const area = codes[i % codes.length]!;
      const mid = 200 + Math.floor(Math.random() * 799);
      const last = 1000 + Math.floor(Math.random() * 8999);
      return {
        workspace_id: data.workspaceId,
        phone: `+1${area}${mid}${last}`,
        area_code: area,
        region: data.region,
        health_score: 100,
        optout_rate: 0,
        status: "active" as const,
        provider_sid: `stub_${crypto.randomUUID().slice(0, 12)}`,
      };
    });
    const { error } = await context.supabase.from("sending_numbers").insert(rows);
    if (error) throw error;
    return { added: rows.length };
  });

export const getRegistration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: reg } = await context.supabase
      .from("registrations")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    return { registration: reg };
  });

export const advanceRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      brand_status: z.enum(["pending", "submitted", "approved", "rejected"]).optional(),
      campaign_status: z.enum(["pending", "submitted", "approved", "rejected"]).optional(),
      brand: z
        .object({
          legal_name: z.string().min(1),
          ein: z.string().min(1),
          website: z.string().url(),
          contact_email: z.string().email(),
        })
        .optional(),
      campaign: z
        .object({
          use_case: z.string().min(1),
          sample_messages: z.array(z.string()).min(1),
          opt_in_flow: z.string().min(1),
        })
        .optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("registrations")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    const provider_refs = {
      ...((existing?.provider_refs as Record<string, unknown> | null) ?? {}),
      ...(data.brand ? { brand: data.brand } : {}),
      ...(data.campaign ? { campaign: data.campaign } : {}),
    };

    const payload = {
      workspace_id: data.workspaceId,
      brand_status: data.brand_status ?? existing?.brand_status ?? "pending",
      campaign_status: data.campaign_status ?? existing?.campaign_status ?? "pending",
      provider_refs: provider_refs as never,
    };

    const { error } = await context.supabase.from("registrations").upsert(payload);
    if (error) throw error;
    return { ok: true };
  });

// Server-enforced gate used by the campaign runner. Reads registration status
// and refuses to send until 10DLC campaign is approved.
export const isSendingAllowed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: reg } = await context.supabase
      .from("registrations")
      .select("campaign_status")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    return { allowed: reg?.campaign_status === "approved" };
  });