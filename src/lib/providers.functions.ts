import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProviderKey = "scrape" | "lookup" | "scrub";

export type ProviderHealth = {
  key: string;
  state: "up" | "degraded" | "down";
  message: string | null;
};

/**
 * Graceful provider-outage state (spec §9.5). Rather than surfacing a generic
 * error, affected screens show a maintenance banner and let the user subscribe
 * to a recovery email. Queued jobs resume on their own.
 */
export const getProviderHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("provider_status")
      .select("key, state, message");
    return { providers: (data ?? []) as ProviderHealth[] };
  });

export const subscribeProviderAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        providerKey: z.enum(["scrape", "lookup", "scrub"]),
        workspaceId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined) ?? null;
    if (!email) throw new Error("We Need An Email On Your Account To Notify You.");
    const { error } = await context.supabase.from("provider_alerts").insert({
      user_id: context.userId,
      workspace_id: data.workspaceId ?? null,
      provider_key: data.providerKey,
      email,
    });
    if (error) throw new Error(error.message);
    return { ok: true, email };
  });

/** Live credential probe for the Apify scraper (Settings → Integrations). */
export const checkApifyConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { verifyApifyToken } = await import("./data-providers/apify");
    return verifyApifyToken();
  });
