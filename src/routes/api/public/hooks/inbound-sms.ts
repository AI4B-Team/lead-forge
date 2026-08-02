import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public webhook — provider (Twilio/Bandwidth/etc.) POSTs inbound SMS here.
// Body shape (JSON or form): { from, to, body, campaign_id?, lead_id? }.
// Auth: bypasses site auth by living under /api/public/*. Provider signature
// verification is expected upstream (add HMAC check when wiring a real provider).
export const Route = createFileRoute("/api/public/hooks/inbound-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: Record<string, string> = {};
        const ct = request.headers.get("content-type") ?? "";
        try {
          if (ct.includes("application/json")) {
            payload = (await request.json()) as Record<string, string>;
          } else {
            const fd = await request.formData();
            fd.forEach((v, k) => { payload[k] = String(v); });
          }
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        const from = (payload.from ?? payload.From ?? "").trim();
        const to = (payload.to ?? payload.To ?? "").trim();
        const body = (payload.body ?? payload.Body ?? "").trim();
        if (!from || !body) return new Response("Missing from/body", { status: 400 });

        const admin = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        // Match sending number → workspace
        const { data: num } = await admin
          .from("sending_numbers").select("id, workspace_id").eq("phone", to).maybeSingle();
        if (!num) return new Response("Unknown destination", { status: 404 });

        // Match lead by phone within workspace (most recent)
        const { data: lead } = await admin
          .from("leads")
          .select("id")
          .eq("workspace_id", num.workspace_id)
          .eq("phone", from)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Find the most recent outbound message to that lead to attribute campaign
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

        const { getProvider } = await import("@/lib/sms");
        const { classifyInbound, processInbound } = await import("@/lib/inbound.server");
        const provider = getProvider();
        const { isOptOut } = classifyInbound(body);

        const { data: inboundRow } = await admin.from("messages").insert({
          workspace_id: num.workspace_id,
          campaign_id: campaignId,
          lead_id: lead?.id ?? null,
          sending_number_id: num.id,
          direction: "inbound",
          body,
          is_optout: isOptOut,
          status: "received",
        }).select("id").maybeSingle();

        // Identical compliance + bot behaviour as the Telnyx handler.
        const outcome = await processInbound({
          db: admin,
          send: (f, t, b) => provider.send(f, t, b),
          workspaceId: num.workspace_id,
          toPhone: to,
          sendingNumberId: num.id,
          fromPhone: from,
          body,
          leadId: lead?.id ?? null,
          campaignId,
          inboundMessageId: inboundRow?.id ?? null,
        });

        const { emitEvent } = await import("@/lib/events.server");
        await emitEvent(admin, num.workspace_id, "message.reply_received", {
          from,
          campaign_id: campaignId,
          lead_id: lead?.id ?? null,
          is_optout: isOptOut,
        });

        return Response.json({ ok: true, optOut: outcome.optOut, help: outcome.help, bot: outcome.bot });
      },
    },
  },
});