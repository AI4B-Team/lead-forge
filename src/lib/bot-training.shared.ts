import { z } from "zod";

/**
 * Training sources attach to a brand (reusable across campaigns) or to a single
 * campaign. Exactly one scope is required.
 */
export const knowledgeScope = z
  .object({
    brandId: z.string().uuid().optional(),
    campaignId: z.string().uuid().optional(),
  })
  .refine((s) => !!s.brandId !== !!s.campaignId, "Pick A Brand Or A Campaign");

export type KnowledgeScope = z.infer<typeof knowledgeScope>;
