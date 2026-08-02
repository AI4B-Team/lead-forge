import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Interactive "Generate List" run. The real work lives in pipeline.server so
 * the recurring-run engine executes the exact same pipeline.
 */
export const runJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { executePipeline } = await import("./pipeline.server");
    return executePipeline(context.supabase, data.jobId);
  });
