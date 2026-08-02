import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getProvider } from "@/lib/sms";

// Telnyx inbound-message webhook. Verifies signature, records the reply,
// halts the drip, and enforces STOP/HELP compliance. See Section 6 of the
// LeadTrace Telnyx build spec — these rules are non-configurable.
export const Route = createFileRoute("/api/public/hooks/telnyx-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const provider = getProvider();

        if (!(await provider.verifyWebhook(request, raw))) {
          return new Response("Invalid signature", { status: 403 });
        }

        // Rebuild a Request so parseInbound can read the body again.
        const req2 = new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body: raw,
        });
        const inbound = await provider.parseInbound(req2);
        if (!inbound.from || !inbound.body) return new Response("Missing fields", { status: 400 });

        const admin = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        const { data: num } = await admin
          .from("sending_numbers")
          .select("id, workspace_id, phone")
          .eq("phone", inbound.to)
          .maybeSingle();
        if (!num) return new Response("Unknown destination", { status: 404 });

        const { data: lead } = await admin
          .from("leads")
          .select("id")
          .eq("workspace_id", num.workspace_id)
          .eq("phone", inbound.from)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let campaignId: string | null = null;
        if (lead) {
          const { data: last } = await admin
            .from("messages")
            .select("campaign_id")
            .eq("workspace_id", num.workspace_id)
            .eq("lead_id", lead.id)
            .eq("direction", "outbound")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          campaignId = last?.campaign_id ?? null;
        }

        const { classifyInbound, processInbound } = await import("@/lib/inbound.server");
        const { isOptOut } = classifyInbound(inbound.body);

        const { data: inboundRow } = await admin.from("messages").insert({
          workspace_id: num.workspace_id,
          campaign_id: campaignId,
          lead_id: lead?.id ?? null,
          sending_number_id: num.id,
          direction: "inbound",
          body: inbound.body,
          is_optout: isOptOut,
          status: "received",
          provider_sid: inbound.providerSid,
        }).select("id").single();

        // Shared pipeline: STOP/HELP first, bot only after the compliance gate.
        const outcome = await processInbound({
          db: admin,
          send: (from, to, body) => provider.send(from, to, body),
          workspaceId: num.workspace_id,
          toPhone: inbound.to,
          sendingNumberId: num.id,
          fromPhone: inbound.from,
          body: inbound.body,
          leadId: lead?.id ?? null,
          campaignId,
          inboundMessageId: inboundRow?.id ?? null,
        });

        return Response.json({ ok: true, optOut: outcome.optOut, help: outcome.help, bot: outcome.bot });
      },
    },
  },
});