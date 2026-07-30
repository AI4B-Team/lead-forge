import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const botConfigSchema = z.object({
  vertical: z.string().max(80).optional(),
  product: z.string().max(1000).optional(),
  tone: z.string().max(200).optional(),
  faqs: z.array(z.object({ q: z.string().max(300), a: z.string().max(600) })).max(30).optional(),
  approved_responses: z.array(z.string().max(320)).max(30).optional(),
  screening_questions: z.array(z.string().max(200)).max(15).optional(),
  booking_link: z.string().max(300).optional(),
});

export const saveBotConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignId: z.string().uuid(),
      bot_enabled: z.boolean(),
      regulated_vertical: z.boolean(),
      bot_config: botConfigSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("campaigns")
      .update({
        bot_enabled: data.bot_enabled,
        regulated_vertical: data.regulated_vertical,
        bot_config: data.bot_config,
      })
      .eq("id", data.campaignId);
    if (error) throw error;
    return { ok: true };
  });

// Sandbox: run a sample inbound reply through the exact guardrail pipeline
// without sending anything.
export const previewBotReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      campaignId: z.string().uuid(),
      message: z.string().min(1).max(600),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: campaign } = await context.supabase
      .from("campaigns")
      .select("bot_config, regulated_vertical")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!campaign) throw new Error("Campaign Not Found");

    const { OPTOUT_RE, HELP_RE } = await import("@/lib/sms");
    if (OPTOUT_RE.test(data.message)) {
      return { action: "blocked" as const, reason: "opt_out_intercepted_before_bot" };
    }
    if (HELP_RE.test(data.message)) {
      return { action: "blocked" as const, reason: "help_handled_by_platform" };
    }

    const { generateBotReply } = await import("@/lib/bot.server");
    const outcome = await generateBotReply({
      message: data.message,
      config: (campaign.bot_config ?? {}) as Record<string, never>,
      regulated: !!campaign.regulated_vertical,
    });
    return outcome;
  });