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

export const FEEDBACK_CATEGORIES = ["Bug", "Feature Request", "UI / Design", "AI Assistant", "Other"] as const;

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        body: z.string().min(3).max(4000),
        category: z.enum(FEEDBACK_CATEGORIES).nullish(),
        screenshotPath: z.string().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("feedback")
      .insert({
        user_id: context.userId,
        body: data.body.trim(),
        category: data.category ?? null,
        screenshot_url: data.screenshotPath ?? null,
      } as never);
    if (error) throw error;
    return { ok: true };
  });

/** Rewrites rough feedback into a concise request. Returns null when AI is unavailable. */
export const polishFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ body: z.string().min(3).max(4000), category: z.string().nullish() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { improveFeedback } = await import("@/lib/feedback.server");
    return { text: await improveFeedback(data.body, data.category ?? null) };
  });