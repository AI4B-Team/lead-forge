import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookupDnc, lookupLineType, normalizePhone } from "@/lib/free-tools.server";

const input = z.object({ phone: z.string().min(7).max(30) });

export const checkDncNumber = createServerFn({ method: "POST" })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("That Does Not Look Like A Valid Phone Number.");
    const res = await lookupDnc(phone);
    return { phone, ...res };
  });

export const checkLineType = createServerFn({ method: "POST" })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("That Does Not Look Like A Valid Phone Number.");
    const res = await lookupLineType(phone);
    return { phone, ...res };
  });
