// Coverage answers the client needs BEFORE pricing: is this county/record type
// runnable at all? The same verdict function backs the server-side gate, so the
// UI can never show a price the runner would refuse.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getJobCoverage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        sourceType: z.string().nullable(),
        recordType: z.string().nullable().default(null),
        counties: z.array(z.string()).max(300).default([]),
        states: z.array(z.string()).max(60).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { jobCoverage } = await import("./distress/coverage.server");
    return jobCoverage(data);
  });

/** Record types with at least one verified adapter — drives the picker. */
export const getCoveredRecordTypes = createServerFn({ method: "GET" }).handler(async () => {
  const { coveredRecordTypes } = await import("./distress/coverage.server");
  return { recordTypes: await coveredRecordTypes() };
});
