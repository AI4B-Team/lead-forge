import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: tags, error } = await context.supabase
      .from("tags")
      .select("id, name, color")
      .eq("workspace_id", data.workspaceId)
      .order("name");
    if (error) throw error;
    return { tags: tags ?? [] };
  });

// Inline tag creation from the campaign builder — never navigates away.
export const createTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      name: z.string().min(1).max(40),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: tag, error } = await context.supabase
      .from("tags")
      .upsert(
        { workspace_id: data.workspaceId, name: data.name.trim(), color: data.color },
        { onConflict: "workspace_id,name" },
      )
      .select("id, name, color")
      .single();
    if (error) throw error;
    return { tag };
  });

export const listQuickReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("quick_replies")
      .select("id, title, body")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { snippets: rows ?? [] };
  });

export const createQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      title: z.string().min(1).max(60),
      body: z.string().min(1).max(320),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("quick_replies")
      .insert({ workspace_id: data.workspaceId, title: data.title.trim(), body: data.body.trim() })
      .select("id, title, body")
      .single();
    if (error) throw error;
    return { snippet: row };
  });

export const deleteQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("quick_replies").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Per-user theme preference (light default, dark optional).
export const getThemePref = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_prefs")
      .select("theme")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { theme: (data?.theme as "light" | "dark" | undefined) ?? "light" };
  });

export const setThemePref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ theme: z.enum(["light", "dark"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_prefs")
      .upsert({ user_id: context.userId, theme: data.theme, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  });