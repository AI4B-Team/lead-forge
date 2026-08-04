import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getProvider } from "@/lib/sms";

// Telnyx delivery-receipt webhook. Verifies signature, then flips the matching
// outbound message from 'sent' to 'delivered' or 'failed'. Failure signal
// feeds per-number health scoring in the runner.
export const Route = createFileRoute("/api/public/hooks/telnyx-dlr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const provider = getProvider();

        if (!(await provider.verifyWebhook(request, raw))) {
          return new Response("Invalid signature", { status: 403 });
        }

        const req2 = new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body: raw,
        });
        const dlr = await provider.parseDlr(req2);
        if (!dlr.providerSid) return new Response("Missing sid", { status: 400 });

        const admin = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        await admin
          .from("messages")
          .update({
            status: dlr.status,
            error_code: dlr.errorCode ?? null,
            ...(dlr.carrier ? { carrier: dlr.carrier } : {}),
          })
          .eq("provider_sid", dlr.providerSid);

        // Terminal receipts feed per-number and per-carrier delivery rates and
        // can auto-pause a number that stops landing messages.
        let paused = false;
        if (dlr.status === "delivered" || dlr.status === "failed") {
          const { recordDeliveryOutcome } = await import("@/lib/deliverability.server");
          const outcome = await recordDeliveryOutcome({
            providerSid: dlr.providerSid,
            delivered: dlr.status === "delivered",
            carrier: dlr.carrier ?? null,
          });
          paused = outcome.paused;
        }

        return Response.json({ ok: true, status: dlr.status, paused });
      },
    },
  },
});