import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Tour state: null = never shown, "skipped" | "completed" = never auto-show again. */
export const getTourStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_prefs")
      .select("tour_status")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { status: (data?.tour_status ?? null) as null | "skipped" | "completed" };
  });

export const setTourStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ status: z.enum(["skipped", "completed"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_prefs")
      .upsert({ user_id: context.userId, tour_status: data.status } as never, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ body: z.string().min(3).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("feedback")
      .insert({ user_id: context.userId, body: data.body.trim() } as never);
    if (error) throw error;
    return { ok: true };
  });