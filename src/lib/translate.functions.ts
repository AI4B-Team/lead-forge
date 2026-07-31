import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  lang: z.string().min(2).max(8),
  texts: z.array(z.string().min(1).max(2000)).min(1).max(80),
});

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { translateStrings } = await import("./translate.server");
    const items = await translateStrings(data.texts, data.lang);
    return { items };
  });
