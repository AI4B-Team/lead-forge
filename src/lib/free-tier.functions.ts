import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The workspace's plan boundary, for rendering upgrade prompts in the UI. */
export const getPlanContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { planContext } = await import("./free-tier.server");
    return planContext(context.supabase, data.workspaceId);
  });
