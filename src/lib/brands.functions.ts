import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Every brand / product / service the workspace trains the bot on. */
export const listBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: brands, error } = await context.supabase
      .from("brands")
      .select("id, name, website, description, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("name");
    if (error) throw error;

    const ids = (brands ?? []).map((b) => b.id);
    const sources: Record<string, number> = {};
    if (ids.length) {
      const { data: rows } = await context.supabase
        .from("bot_knowledge")
        .select("brand_id")
        .in("brand_id", ids);
      for (const r of rows ?? []) {
        if (r.brand_id) sources[r.brand_id] = (sources[r.brand_id] ?? 0) + 1;
      }
    }
    return { brands: brands ?? [], sources };
  });

export const createBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      name: z.string().min(1).max(80),
      website: z.string().max(300).optional(),
      description: z.string().max(4000).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: brand, error } = await context.supabase
      .from("brands")
      .insert({
        workspace_id: data.workspaceId,
        name: data.name.trim(),
        website: data.website?.trim() || null,
        description: data.description?.trim() || null,
      })
      .select("id, name, website, description, created_at")
      .single();
    if (error) throw error;
    return { brand };
  });

export const updateBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(80).optional(),
      website: z.string().max(300).nullable().optional(),
      description: z.string().max(4000).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name) patch.name = data.name.trim();
    if (data.website !== undefined) patch.website = data.website?.trim() || null;
    if (data.description !== undefined) patch.description = data.description?.trim() || null;
    const { error } = await context.supabase.from("brands").update(patch as never).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("brands").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
