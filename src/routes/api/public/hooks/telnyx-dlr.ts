import { createFileRoute } from "@tanstack/react-router";
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

        const { handleTelnyxDlr } = await import("@/lib/sms/dlr-handler.server");
        return handleTelnyxDlr(request, raw);
      },
    },
  },
});