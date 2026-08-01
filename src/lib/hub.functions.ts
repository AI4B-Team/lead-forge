import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Account linking (spec §16): runs the same verification as the SSO handoff
// against an existing workspace, stamping canonical IDs in place. No data moves.

export type HubLink = {
  linked: boolean;
  realEliteOrgId: string | null;
  linkedAt: string | null;
};

export const getHubLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<HubLink> => {
    const { data: ws } = await context.supabase
      .from("workspaces")
      .select("real_elite_org_id, real_elite_linked_at")
      .eq("id", data.workspaceId)
      .maybeSingle();
    return {
      linked: Boolean(ws?.real_elite_org_id),
      realEliteOrgId: ws?.real_elite_org_id ?? null,
      linkedAt: ws?.real_elite_linked_at ?? null,
    };
  });

export const connectHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ workspaceId: z.string().uuid(), token: z.string().min(20) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<HubLink> => {
    const { verifyHubToken } = await import("./hub.server");
    const claims = await verifyHubToken(data.token);

    const { data: taken } = await context.supabase
      .from("workspaces")
      .select("id")
      .eq("real_elite_org_id", claims.reo_org_id)
      .maybeSingle();
    if (taken && taken.id !== data.workspaceId) {
      throw new Error("That Real Elite organization is already linked to another workspace");
    }

    const linkedAt = new Date().toISOString();
    const { error } = await context.supabase
      .from("workspaces")
      .update({ real_elite_org_id: claims.reo_org_id, real_elite_linked_at: linkedAt })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("user_prefs")
      .upsert({ user_id: context.userId, real_elite_user_id: claims.reo_user_id }, { onConflict: "user_id" });

    return { linked: true, realEliteOrgId: claims.reo_org_id, linkedAt };
  });

export const disconnectHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<HubLink> => {
    const { error } = await context.supabase
      .from("workspaces")
      .update({ real_elite_org_id: null, real_elite_linked_at: null })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { linked: false, realEliteOrgId: null, linkedAt: null };
  });
